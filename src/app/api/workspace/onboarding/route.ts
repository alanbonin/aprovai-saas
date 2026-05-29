import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { createWithCache, MODELS } from "@/lib/anthropic";
import { log } from "@/lib/logger";

// ── Keyword matching para detectar área do cargo ─────────────────────
const AREA_KEYWORDS: Record<string, string[]> = {
  policial:     ["polici", "delegad", "agente de", "investigad", "depen", "pcdf", "pcsp"],
  tributario:   ["tribut", "auditor", "fiscal", "receita", "financ", "sefaz"],
  judiciario:   ["judici", "analista judici", "tecnico judici", "trf", "tre", "tse", "tj"],
  legislativo:  ["camara", "senado", "legislat", "assembleia", "vereador"],
  mp:           ["ministerio publico", "promotor", "mpf", "mpsp"],
  procuradoria: ["procuradoria", "procurador", "agu", "pge", "pgm"],
  militar:      ["militar", "exerc", "marinha", "aeronaut", "bombeiro"],
  saude:        ["saude", "enfermeiro", "medico", "sus", "anvisa"],
  bancario:     ["banco", "caixa economica", "banco central", "bacen"],
  gestao:       ["gestao", "administrat", "assistente administrat"],
};

function normalize(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function detectArea(cargo: string, orgao: string): string {
  const text = normalize(`${cargo} ${orgao}`);
  for (const [area, keywords] of Object.entries(AREA_KEYWORDS)) {
    if (keywords.some(k => text.includes(k))) return area;
  }
  return "geral";
}

interface AgentRow { id: string; name: string; categoria: string | null; area: string | null; banca: string | null }

// Mapeia modalidade → categorias de Subject que devem ser atribuídas ao aluno
function getSubjectCategorias(modalidade: string, agentAreas: string[]): string[] {
  const directMap: Record<string, string[]> = {
    "ENEM":       ["enem"],
    "OAB":        ["oab"],
  };
  if (directMap[modalidade]) return directMap[modalidade];

  // CONCURSO_PUBLICO — deriva das áreas dos agentes selecionados
  const cats = new Set<string>(["geral"]); // mínimo sempre
  for (const area of agentAreas) {
    if (["policial", "judiciario", "ministerio-publico", "procuradoria", "legislativo"].includes(area)) {
      cats.add("direito");
    }
    if (["tributario-auditoria", "banco-central", "agencias-reguladoras"].includes(area)) {
      cats.add("fiscal");
      cats.add("direito");
    }
    if (["gestao-publica"].includes(area)) {
      cats.add("direito");
    }
  }
  return [...cats];
}

function selectAgents(allAgents: AgentRow[], cargo: string, orgao: string, banca: string, maxAgents: number, modalidade = "CONCURSO_PUBLICO", trilha?: string | null): string[] {
  // For special modalidades, use keyword matching on modalidade first
  const modalidadeKeywords: Record<string, string[]> = {
    "ENEM": ["enem"],
    "OAB":  ["oab"],
  };

  let primaryAgent: AgentRow | undefined;
  const mKeywords = modalidadeKeywords[modalidade] ?? [];
  if (mKeywords.length > 0) {
    primaryAgent = allAgents.find(a =>
      mKeywords.some(k =>
        normalize(a.name ?? "").includes(k) ||
        normalize(a.categoria ?? "").includes(k)
      )
    );
  }

  // Fallback to existing area/banca detection for CONCURSO_PUBLICO
  const area   = detectArea(cargo, orgao);
  const bancaN = normalize(banca).split(/[\s/]/)[0];

  const areaAgent = allAgents.find(a =>
    (a.categoria && normalize(a.categoria).includes(area)) ||
    (a.name && normalize(a.name).includes(area))
  );
  const bancaAgent = bancaN ? allAgents.find(a =>
    (a.banca && normalize(a.banca).includes(bancaN)) ||
    (a.name && normalize(a.name).includes(bancaN))
  ) : undefined;

  const candidates = primaryAgent
    ? [primaryAgent.id, areaAgent?.id, bancaAgent?.id]
    : [areaAgent?.id, bancaAgent?.id];

  const ids = [...new Set(candidates.filter(Boolean))] as string[];
  if (ids.length === 0 && allAgents.length > 0) ids.push(allAgents[0].id);
  return ids.slice(0, Math.max(1, maxAgents));
}

function buildSistemPrompt(modalidade: string, maxConcursos: number): string {
  const multiConcurso = maxConcursos > 1;
  const hoje = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  const anoAtual = new Date().getFullYear();

  if (modalidade === "ENEM") {
    return `Você é a Estrategista Aprovai, especialista em preparação para o ENEM.

CONTEXTO: A saudação pedindo o nome já foi feita. A partir da resposta do nome, use-o sempre.
DATA ATUAL: ${hoje} (ano ${anoAtual}). Use essa data ao falar sobre o ENEM e prazos.

SEQUÊNCIA OBRIGATÓRIA (uma pergunta por mensagem):
1. [JÁ FEITO] Nome preferido
2. Você ainda está no Ensino Médio ou já é egresso? Em qual série/ano está (se ainda na escola)?
3. Quais áreas do ENEM você mais precisa melhorar? (Ciências da Natureza, Ciências Humanas, Linguagens e Códigos, Matemática, Redação)
4. Você sabe a data do ENEM deste ano? (geralmente novembro de ${anoAtual} — confirme ou informe o ano-alvo)
5. Quantas horas por dia você consegue dedicar aos estudos?
6. Como você se avalia hoje? Iniciante, Intermediário ou Avançado?
7. Qual é seu melhor horário? Manhã, Tarde, Noite ou Varia?
8. Qual é sua maior dificuldade? (matéria ou área específica)

REGRAS:
- UMA pergunta por mensagem
- Use SEMPRE o nome informado pelo aluno
- Seja motivador, use emojis com moderação
- NÃO use travessão (—), hífen duplo ou traço longo em NENHUMA frase. Use vírgula, ponto ou reescreva.
- NÃO mencione "mentores" ou "agentes"

ENCERRAMENTO OBRIGATÓRIO — dispare assim que tiver: nome + pelo menos 5 respostas coletadas:
Na MESMA mensagem em que acolher a última resposta do aluno, escreva uma frase animada de encerramento e, na mesma linha (sem quebra de linha), adicione exatamente:
__DONE__{"nomePreferido":"...","modalidade":"ENEM","cargo":"Candidato ENEM","orgao":"INEP","banca":"ENEM","dataProva":null ou "YYYY-MM-DD","horasEstudo":2,"nivelAtual":"iniciante","disponibilidade":"noite","dificuldades":"...","trilha":null}

ATENÇÃO: Não faça mais perguntas após ter nome + 5 respostas. Encerre imediatamente.
Valores válidos: horasEstudo: inteiro 1-12, nivelAtual: "iniciante"|"intermediario"|"avancado", disponibilidade: "manha"|"tarde"|"noite"|"variado", dataProva: "YYYY-MM-DD" ou null
Responda SEMPRE em português brasileiro.`;
  }

  if (modalidade === "OAB") {
    return `Você é a Estrategista Aprovai, especialista em preparação para a OAB.

CONTEXTO: A saudação pedindo o nome já foi feita. Use o nome informado em todas as mensagens seguintes.
DATA ATUAL: ${hoje} (ano ${anoAtual}). Use essa data ao falar sobre edições da OAB e prazos.

SEQUÊNCIA OBRIGATÓRIA (uma pergunta por mensagem):
1. [JÁ FEITO] Nome preferido
2. Você vai fazer a 1ª fase ou a 2ª fase da OAB? (Se 2ª fase, qual área: Civil, Penal, Trabalhista, Tributário, Administrativo?)
3. Você sabe qual edição/número do exame vai prestar? (ou "ainda não sei")
4. Você tem data prevista para a prova?
5. Quantas horas por dia você consegue estudar?
6. Como você se avalia hoje? Iniciante, Intermediário ou Avançado?
7. Qual é seu melhor horário? Manhã, Tarde, Noite ou Varia?
8. Qual matéria da OAB você mais teme? (Ex: Direito Constitucional, Direito Penal, Ética OAB, Peça Processual…)

REGRAS:
- UMA pergunta por mensagem
- Use SEMPRE o nome do aluno
- NÃO use travessão (—) ou traço longo em nenhuma frase.
- Banca da OAB é sempre FGV desde 2010
- NÃO use travessão (—), hífen duplo ou traço longo em NENHUMA frase. Use vírgula, ponto ou reescreva.
- NÃO mencione "mentores" ou "agentes"

ENCERRAMENTO OBRIGATÓRIO — dispare assim que tiver: nome + fase OAB + pelo menos 3 outras respostas (mínimo 5 informações):
Na MESMA mensagem em que acolher a última resposta do aluno, escreva uma frase animada de encerramento e, na mesma linha (sem quebra de linha), adicione exatamente:
__DONE__{"nomePreferido":"...","modalidade":"OAB","cargo":"OAB <fase>","orgao":"OAB","banca":"FGV","dataProva":null ou "YYYY-MM-DD","horasEstudo":2,"nivelAtual":"iniciante","disponibilidade":"noite","dificuldades":"...","oabFase":"primeira","trilha":null}

ATENÇÃO: Não faça mais perguntas após ter as 5 informações. Encerre imediatamente.
Valores oabFase: "primeira" | "segunda". Responda SEMPRE em português brasileiro.`;
  }

  // Default: CONCURSO_PUBLICO (existing behavior)
  const concursoBloco = multiConcurso
    ? `2. Quais cargo(s) e órgão(s) você quer prestar? (Seu plano permite até ${maxConcursos} concursos simultâneos. Liste TODOS que quer preparar agora)\n   *(Ex: "1) Auditor Fiscal / Receita Federal  2) Agente / Polícia Federal  3) Analista / Tribunal de Justiça")*`
    : `2. Qual cargo e órgão você quer prestar? (e em qual estado, se aplicável)\n   *(Ex: Delegado da Polícia Civil de SP, Auditor da Receita Federal, Analista do TRF…)*`;

  const doneFormat = multiConcurso
    ? `__DONE__{"nomePreferido":"...","modalidade":"CONCURSO_PUBLICO","concursos":[{"cargo":"Cargo1","orgao":"Orgao1"},{"cargo":"Cargo2","orgao":"Orgao2"}],"dataProva":null ou "YYYY-MM-DD","horasEstudo":2,"nivelAtual":"iniciante","disponibilidade":"noite","dificuldades":"..."}\n\nEXEMPLO com 3 concursos: "concursos":[{"cargo":"Auditor Fiscal","orgao":"Receita Federal"},{"cargo":"Agente","orgao":"Polícia Federal"},{"cargo":"Analista Judiciário","orgao":"Tribunal de Justiça"}]`
    : `__DONE__{"nomePreferido":"...","modalidade":"CONCURSO_PUBLICO","concursos":[{"cargo":"...","orgao":"..."}],"dataProva":null ou "YYYY-MM-DD","horasEstudo":2,"nivelAtual":"iniciante","disponibilidade":"noite","dificuldades":"..."}`;

  return `Você é a Estrategista Aprovai, assistente especializada em planejamento para concursos públicos.

Seu papel é coletar as informações essenciais do aluno de forma NATURAL e CONVERSACIONAL — UMA pergunta por mensagem.

CONTEXTO: A conversa já foi iniciada e o aluno já foi saudado. A primeira mensagem do histórico é sua saudação pedindo o nome preferido. A partir da RESPOSTA DO NOME do aluno, use esse nome em TODAS as mensagens seguintes.
DATA ATUAL: ${hoje} (ano ${anoAtual}). Use essa data ao falar sobre concursos, editais e prazos.

SEQUÊNCIA OBRIGATÓRIA (siga esta ordem, uma por mensagem — a saudação já foi feita):
1. [JÁ FEITO] Perguntou como o aluno prefere ser chamado
${concursoBloco}
3. Você tem data prevista para a prova? (se sim, qual? Se tiver múltiplas provas, informe a mais próxima)
4. Quantas horas por dia você consegue dedicar aos estudos? (ex: 1h, 2h, 4h…)
5. Como você se avalia hoje? Iniciante (nunca estudou para concurso), Intermediário (já estudou um pouco) ou Avançado (estuda há mais de 6 meses)?
6. Qual é seu melhor horário para estudar? Manhã, Tarde, Noite ou Varia?
7. Quais são suas maiores dificuldades ou matérias que mais teme?

REGRAS:
- EXATAMENTE UMA pergunta por mensagem
- Use SEMPRE o nome que o aluno informou ao responder a pergunta 1
- Se o aluno responder várias coisas de uma vez, agradeça e avance pelas próximas pendentes (uma por uma)
- Seja motivador, use emojis com moderação
- NÃO use travessão (—), hífen duplo ou traço longo em NENHUMA frase. Use vírgula, ponto ou reescreva.
- NÃO mencione "mentores", "agentes" ou "equipe"
- Ao fazer a pergunta 4 (horas), forneça exemplos: "1h", "2h", "3h ou mais"
- Ao fazer a pergunta 5 (nível), apresente as 3 opções claramente
- Ao fazer a pergunta 6 (horário), apresente as 4 opções

ENCERRAMENTO OBRIGATÓRIO — dispare assim que tiver: nome + cargo(s) + pelo menos 3 outras respostas (mínimo 5 infos):
Na MESMA mensagem em que acolher a última resposta do aluno, escreva uma frase animada de encerramento chamando o aluno pelo nome preferido e, na mesma linha (sem quebra de linha), adicione exatamente:
${doneFormat}

ATENÇÃO CRÍTICA: Ao receber a resposta da pergunta 7 (dificuldades), você JÁ TEM todas as informações necessárias. Não faça mais nenhuma pergunta. Encerre IMEDIATAMENTE com a mensagem animada + __DONE__.

Valores válidos:
- nomePreferido: exatamente o nome/apelido que o aluno disse querer ser chamado
- horasEstudo: número inteiro (1, 2, 3, 4, 5, 6)
- nivelAtual: "iniciante" | "intermediario" | "avancado"
- disponibilidade: "manha" | "tarde" | "noite" | "variado"
- dataProva: "YYYY-MM-DD" ou null (use a data mais próxima se tiver múltiplas)
- concursos: array com TODOS os concursos informados pelo aluno

Responda SEMPRE em português brasileiro.`;
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const { data: dbUser } = await db.from("User").select("id").eq("supabaseId", user.id).single();
    if (!dbUser) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

    const body = await req.json();
    const { message, history = [], maxConcursos = 1, userName = "", modalidade = "CONCURSO_PUBLICO" } = body as {
      message: string;
      history: { role: string; content: string }[];
      maxConcursos: number;
      userName: string;
      modalidade: string;
    };

    // ── Mensagem de init: gera apenas o primeiro greeting ───────────────
    if (message === "__INIT__") {
      const greeting = userName
        ? `Olá, **${userName.split(" ")[0]}**! 😊 Fico feliz em te ajudar a conquistar sua aprovação!\n\nAntes de tudo: como você prefere ser chamado(a)? Pode ser seu nome, apelido — o que preferir!`
        : `Olá! 😊 Fico feliz em te ajudar a conquistar sua aprovação!\n\nAntes de tudo: como você prefere ser chamado(a)? Pode ser seu nome ou apelido favorito!`;
      return NextResponse.json({ text: greeting, done: false });
    }

    const sistemPrompt = buildSistemPrompt(modalidade, maxConcursos);

    // Anthropic exige que a 1ª mensagem seja "user".
    // Mas precisamos que o modelo saiba que a saudação pedindo o nome JÁ foi feita.
    // Solução: se não há nenhum "user" anterior no histórico (primeira resposta do aluno),
    // incluímos a saudação inicial como 2ª mensagem, precedida de um "user" âncora.
    const rawHistory = history.slice(-14).map(m => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));
    const firstUserIdx = rawHistory.findIndex(m => m.role === "user");
    const filteredHistory = firstUserIdx >= 0 ? rawHistory.slice(firstUserIdx) : [];

    // Contexto de abertura: mostra ao modelo a saudação inicial + resposta do nome
    const contextPrefix: { role: "user" | "assistant"; content: string }[] = [];
    if (filteredHistory.length === 0) {
      // É a primeira mensagem do aluno (resposta ao nome).
      // Injeta a saudação original para que o modelo saiba que "bola" é o nome.
      const initialGreeting =
        rawHistory.find(m => m.role === "assistant")?.content ??
        (userName
          ? `Olá, **${userName.split(" ")[0]}**! 😊 Antes de tudo: como você prefere ser chamado(a)?`
          : `Olá! 😊 Como você prefere ser chamado(a)?`);
      contextPrefix.push(
        { role: "user",      content: "[início da conversa]" },
        { role: "assistant", content: initialGreeting },
      );
    }

    const response = await createWithCache({
      model: MODELS.sonnet,
      maxTokens: 1024,
      systemPrompt: sistemPrompt,
      cacheSystem: true,
      messages: [
        ...contextPrefix,
        ...filteredHistory,
        { role: "user", content: message },
      ],
    });

    const rawText = response.content[0]?.type === "text" ? response.content[0].text : "";

    if (!rawText.includes("__DONE__")) {
      return NextResponse.json({ text: rawText, done: false });
    }

    // ── Onboarding concluído ───────────────────────────────────────────
    const [textPart, jsonPart] = rawText.split("__DONE__");

    interface ConcursoEntry { cargo: string; orgao: string; banca: string }
    interface ProfileData {
      nomePreferido: string | null;
      modalidade: string;
      // Novo formato: array de concursos
      concursos?: ConcursoEntry[];
      // Legado (backwards compat)
      cargo?: string;
      orgao?: string;
      banca?: string;
      dataProva: string | null;
      horasEstudo: number | null;
      nivelAtual: string | null;
      disponibilidade: string | null;
      dificuldades: string | null;
      vestibular: string | null;
      trilha: string | null;
      oabFase: string | null;
    }

    let profile: ProfileData | null = null;
    try { profile = JSON.parse((jsonPart ?? "").trim()); } catch { /* continua */ }

    if (!profile) {
      return NextResponse.json({ text: textPart, done: false });
    }

    // Sanitiza dataProva — aceita só formato YYYY-MM-DD
    function sanitizeDate(val: unknown): string | null {
      if (!val || typeof val !== "string") return null;
      const trimmed = val.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        const d = new Date(trimmed);
        return isNaN(d.getTime()) ? null : trimmed;
      }
      const brMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (brMatch) return `${brMatch[3]}-${brMatch[2].padStart(2,"0")}-${brMatch[1].padStart(2,"0")}`;
      const parsed = new Date(trimmed);
      if (!isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
      return null;
    }
    function sanitizeHoras(val: unknown): number | null {
      const n = typeof val === "number" ? val : parseInt(String(val), 10);
      if (isNaN(n) || n < 1 || n > 12) return null;
      return Math.round(n);
    }
    function sanitizeNivel(val: unknown): string | null {
      const valid = ["iniciante", "intermediario", "avancado"];
      if (typeof val !== "string") return null;
      const v = val.toLowerCase().trim();
      return valid.includes(v) ? v : null;
    }
    function sanitizeDisp(val: unknown): string | null {
      const valid = ["manha", "tarde", "noite", "variado"];
      if (typeof val !== "string") return null;
      const v = val.toLowerCase().trim();
      return valid.includes(v) ? v : null;
    }

    // ── Normaliza lista de concursos ─────────────────────────────────────
    // Suporta novo formato (concursos:[]) e legado (cargo/orgao/banca no topo)
    const concursosList: ConcursoEntry[] =
      Array.isArray(profile.concursos) && profile.concursos.length > 0
        ? profile.concursos
        : [{ cargo: profile.cargo ?? "", orgao: profile.orgao ?? "", banca: profile.banca ?? "" }];

    // Usa modalidade do __DONE__ (profile) se disponível, senão cai no do request body
    const profileModalidade = profile.modalidade ?? modalidade;
    const nomePreferido = profile.nomePreferido?.trim() || userName || null;

    // Campos comuns a todos os perfis (não variam por concurso)
    const commonFields = {
      nomePreferido,
      horasEstudo:     sanitizeHoras(profile.horasEstudo),
      nivelAtual:      sanitizeNivel(profile.nivelAtual),
      disponibilidade: sanitizeDisp(profile.disponibilidade),
      modalidade:      profileModalidade,
      vestibular:      profile.vestibular ?? null,
      trilha:          profile.trilha ?? null,
      oabFase:         profile.oabFase ?? null,
      dificuldades:    profile.dificuldades ?? null,
      dataProva:       sanitizeDate(profile.dataProva),
      onboardingDone:  true,
      updatedAt:       new Date().toISOString(),
    };

    // ── Busca perfis existentes ───────────────────────────────────────────
    const { data: existingProfiles } = await db
      .from("StudentProfile")
      .select("id, isDefault")
      .eq("userId", dbUser.id)
      .order("isDefault", { ascending: false })
      .order("createdAt", { ascending: true });

    const existingList = (existingProfiles ?? []) as { id: string; isDefault: boolean }[];
    const now = new Date().toISOString();

    // ── Busca todos os agentes ativos uma vez ────────────────────────────
    const { data: allAgentsRaw } = await db
      .from("Agent")
      .select("id, name, categoria, area, banca, color, description, systemPrompt")
      .eq("active", true);
    const agentRows = (allAgentsRaw ?? []) as (AgentRow & { area?: string | null; color?: string | null; description?: string | null; systemPrompt?: string | null })[];

    // ── Cria/atualiza um perfil por concurso ─────────────────────────────
    const createdProfiles: { id: string; label: string; agents: typeof agentRows }[] = [];

    for (let i = 0; i < concursosList.length; i++) {
      const c = concursosList[i];
      const isFirst = i === 0;
      const label = [c.cargo, c.orgao].filter(Boolean).join(" — ") || "Perfil";

      const profileFields = {
        cargo:     c.cargo     || null,
        orgao:     c.orgao     || null,
        banca:     c.banca     || null,
        label,
        isDefault: isFirst,
        ...commonFields,
      };

      let profileId: string;

      if (i < existingList.length) {
        // Atualiza perfil existente
        profileId = existingList[i].id;
        const { error: updErr } = await db
          .from("StudentProfile")
          .update(profileFields)
          .eq("id", profileId);
        if (updErr) {
          log.warn("db.onboarding_profile_update", { index: i }, updErr);
          // Tenta salvando só campos base se coluna nova não existir
          await db.from("StudentProfile").update({
            cargo: c.cargo || null, orgao: c.orgao || null,
            onboardingDone: true, updatedAt: now,
          }).eq("id", profileId);
        }
      } else {
        // Cria novo perfil
        profileId = crypto.randomUUID();
        const { error: insErr } = await db
          .from("StudentProfile")
          .insert({ id: profileId, userId: dbUser.id, ...profileFields, createdAt: now });
        if (insErr) {
          log.error("db.onboarding_profile_insert", { index: i }, insErr);
          continue;
        }
      }

      // ── Seleciona 1 agente ideal para este perfil ─────────────────────
      const profileAgentIds = selectAgents(
        agentRows,
        c.cargo ?? "", c.orgao ?? "", c.banca ?? "",
        1, // 1 agente especializado por concurso
        profileModalidade,
        profile.trilha,
      );

      // ── Atribui agente a este perfil (com profileId) ──────────────────
      try {
        await db.from("UserAgent").delete()
          .eq("userId", dbUser.id).eq("profileId", profileId);
        for (const agentId of profileAgentIds) {
          await db.from("UserAgent").insert({
            id: crypto.randomUUID(),
            userId: dbUser.id,
            agentId,
            profileId,
            createdAt: now,
          });
        }
      } catch {
        // Coluna profileId ainda não existe — fallback legado apenas para o perfil principal
        if (i === 0) {
          await db.from("UserAgent").delete().eq("userId", dbUser.id);
          for (const agentId of profileAgentIds) {
            await db.from("UserAgent").insert({
              id: crypto.randomUUID(), userId: dbUser.id, agentId, createdAt: now,
            });
          }
        }
      }

      // ── Matérias para este perfil (profileId isolado) ─────────────────
      const agentAreas = agentRows
        .filter(a => profileAgentIds.includes(a.id))
        .map(a => a.area ?? "")
        .filter(Boolean);

      const subjectCats = getSubjectCategorias(profileModalidade, agentAreas);

      if (subjectCats.length > 0) {
        const { data: matchedSubjects } = await db
          .from("Subject")
          .select("id")
          .in("categoria", subjectCats)
          .order("ordem");

        if (matchedSubjects && matchedSubjects.length > 0) {
          // Remove matérias antigas deste perfil
          try {
            await db.from("StudentSubject")
              .delete()
              .eq("userId", dbUser.id)
              .eq("profileId", profileId);
          } catch { /* profileId ainda não existe, ignora */ }

          const ssRows = matchedSubjects.map((s: { id: string }) => ({
            id:         crypto.randomUUID(),
            userId:     dbUser.id,
            profileId,
            subjectId:  s.id,
            fromEdital: false,
            createdAt:  now,
          }));
          const { error: ssErr } = await db.from("StudentSubject").insert(ssRows);
          if (ssErr) log.error("db.onboarding_student_subject", { table: "StudentSubject" }, ssErr);
        }
      }

      // ── Coleta dados dos agentes para resposta ────────────────────────
      const { data: profileAgentData } = profileAgentIds.length > 0
        ? await db.from("Agent")
            .select("id, name, description, categoria, area, banca, color, systemPrompt")
            .in("id", profileAgentIds)
        : { data: [] };

      createdProfiles.push({
        id: profileId,
        label,
        agents: (profileAgentData ?? []) as typeof agentRows,
      });
    }

    // ── Define perfil ativo = primeiro (isDefault=true) ───────────────────
    const firstProfileId = createdProfiles[0]?.id ?? null;
    if (firstProfileId) {
      try {
        await db.from("User")
          .update({ activeProfileId: firstProfileId })
          .eq("id", dbUser.id);
      } catch { /* activeProfileId pode não existir antes da migration */ }
    }

    // ── Remove perfis excedentes (usuário tinha mais perfis que novos concursos) ─
    if (existingList.length > concursosList.length) {
      const toDeleteIds = existingList.slice(concursosList.length).map(p => p.id);
      if (toDeleteIds.length > 0) {
        try {
          await db.from("StudentProfile").delete().in("id", toDeleteIds);
        } catch { /* ignora se falhar */ }
      }
    }

    // ── Resposta compatível com onboarding-client ─────────────────────────
    const firstProfile = createdProfiles[0];
    const mergedProfile = firstProfile
      ? {
          id:    firstProfile.id,
          label: firstProfile.label,
          cargo: concursosList[0]?.cargo ?? null,
          orgao: concursosList[0]?.orgao ?? null,
          banca: concursosList[0]?.banca ?? null,
          ...commonFields,
        }
      : null;

    return NextResponse.json({
      text: textPart,
      done: true,
      profile: mergedProfile,
      profiles: createdProfiles.map(p => ({ id: p.id, label: p.label })),
      subjects: [],
      agents: firstProfile?.agents ?? [],
    });

  } catch (err) {
    log.error("workspace.onboarding_fatal", {}, err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
