import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { createWithCache, MODELS } from "@/lib/anthropic";

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
    "VESTIBULAR": ["vestibular"],
    "OAB":        ["oab"],
    "REVALIDA":   ["revalida"],
    "CFC":        ["cfc"],
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
    "ENEM":       ["enem"],
    "OAB":        ["oab"],
    "REVALIDA":   ["revalida"],
    "CFC":        ["cfc"],
    "VESTIBULAR": ["vestibular", "medicina", "engenharia", "direito"],
  };

  // For VESTIBULAR, prefer the specific trilha agent (e.g., "Mentor Medicina")
  let primaryAgent: AgentRow | undefined;
  if (modalidade === "VESTIBULAR" && trilha) {
    const trilhaKeyword = normalize(trilha).split(/[\s/]/)[0]; // "medicina" | "engenharia" | "direito"
    primaryAgent = allAgents.find(a =>
      normalize(a.name ?? "").includes(trilhaKeyword) ||
      normalize(a.categoria ?? "").includes(trilhaKeyword)
    );
  }

  if (!primaryAgent) {
    const mKeywords = modalidadeKeywords[modalidade] ?? [];
    if (mKeywords.length > 0) {
      primaryAgent = allAgents.find(a =>
        mKeywords.some(k =>
          normalize(a.name ?? "").includes(k) ||
          normalize(a.categoria ?? "").includes(k)
        )
      );
    }
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

  if (modalidade === "VESTIBULAR") {
    return `Você é a Estrategista Aprovai, especialista em preparação para vestibulares.

CONTEXTO: A saudação pedindo o nome já foi feita. Use o nome informado em todas as mensagens seguintes.
DATA ATUAL: ${hoje} (ano ${anoAtual}). Use essa data ao falar sobre vestibulares e prazos.

SEQUÊNCIA OBRIGATÓRIA (uma pergunta por mensagem):
1. [JÁ FEITO] Nome preferido
2. Qual(is) vestibular(es) você vai prestar? (FUVEST, UNICAMP, UNESP, UERJ ou outro)${multiConcurso ? ` — você pode indicar até ${maxConcursos}` : ""}
3. Qual curso você quer fazer? (Medicina, Direito, Engenharia, Administração, outro)
4. Você tem data prevista para a prova?
5. Quantas horas por dia você consegue estudar?
6. Como você se avalia hoje? Iniciante, Intermediário ou Avançado?
7. Qual é seu melhor horário? Manhã, Tarde, Noite ou Varia?
8. Qual é sua maior dificuldade? (matéria ou área específica)

REGRAS:
- UMA pergunta por mensagem
- Use SEMPRE o nome do aluno
- Seja motivador
- NÃO use travessão (—), hífen duplo ou traço longo em NENHUMA frase. Use vírgula, ponto ou reescreva.
- NÃO mencione "mentores" ou "agentes"

ENCERRAMENTO OBRIGATÓRIO — dispare assim que tiver: nome + vestibular + curso + pelo menos 3 outras respostas (mínimo 5 informações coletadas):
Na MESMA mensagem em que acolher a última resposta do aluno, escreva uma frase animada de encerramento e, na mesma linha (sem quebra de linha), adicione exatamente:
__DONE__{"nomePreferido":"...","modalidade":"VESTIBULAR","cargo":"<curso escolhido>","orgao":"<vestibular alvo>","banca":"<vestibular alvo>","dataProva":null ou "YYYY-MM-DD","horasEstudo":2,"nivelAtual":"iniciante","disponibilidade":"noite","dificuldades":"...","vestibular":"<vestibular>","trilha":"<curso>"}

ATENÇÃO: Não espere mais perguntas após ter as 5 informações. Encerre imediatamente com o __DONE__.

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

  if (modalidade === "REVALIDA") {
    return `Você é a Estrategista Aprovai, especialista em preparação para o REVALIDA.

CONTEXTO: A saudação pedindo o nome já foi feita. Use o nome informado em todas as mensagens seguintes.
DATA ATUAL: ${hoje} (ano ${anoAtual}). Use essa data ao falar sobre o REVALIDA e prazos.

SEQUÊNCIA OBRIGATÓRIA (uma pergunta por mensagem):
1. [JÁ FEITO] Nome preferido
2. Em qual país você se formou em Medicina? (Contexto: currículos variam bastante entre países)
3. Você vai focar na Etapa 1 (múltipla escolha, clínica teórica) ou Etapa 2 (OSCE, avaliação prática)?
4. Você tem data prevista para a prova?
5. Quantas horas por dia você consegue estudar?
6. Como você se avalia hoje no contexto do REVALIDA? Iniciante, Intermediário ou Avançado?
7. Qual é seu melhor horário? Manhã, Tarde, Noite ou Varia?
8. Qual área da medicina você tem mais dificuldade? (Clínica Médica, Cirurgia, Pediatria, Ginecologia/Obstetrícia, Saúde Coletiva)

REGRAS:
- UMA pergunta por mensagem
- Use SEMPRE o nome do aluno
- NÃO use travessão (—) ou traço longo em nenhuma frase.
- Organize a banca como "INEP/REVALIDA"
- NÃO use travessão (—), hífen duplo ou traço longo em NENHUMA frase. Use vírgula, ponto ou reescreva.
- NÃO mencione "mentores" ou "agentes"

ENCERRAMENTO OBRIGATÓRIO — dispare assim que tiver: nome + etapa + pelo menos 3 outras respostas (mínimo 5 informações):
Na MESMA mensagem em que acolher a última resposta do aluno, escreva uma frase animada de encerramento e, na mesma linha (sem quebra de linha), adicione exatamente:
__DONE__{"nomePreferido":"...","modalidade":"REVALIDA","cargo":"Médico REVALIDA","orgao":"REVALIDA/INEP","banca":"INEP","dataProva":null ou "YYYY-MM-DD","horasEstudo":2,"nivelAtual":"iniciante","disponibilidade":"noite","dificuldades":"...","trilha":"Etapa 1"}

ATENÇÃO: Não faça mais perguntas após ter as 5 informações. Encerre imediatamente.
Responda SEMPRE em português brasileiro.`;
  }

  if (modalidade === "CFC") {
    return `Você é a Estrategista Aprovai, especialista em preparação para o Exame de Suficiência do CFC.

CONTEXTO: A saudação pedindo o nome já foi feita. Use o nome informado em todas as mensagens seguintes.
DATA ATUAL: ${hoje} (ano ${anoAtual}). Use essa data ao falar sobre o exame do CFC e prazos.

SEQUÊNCIA OBRIGATÓRIA (uma pergunta por mensagem):
1. [JÁ FEITO] Nome preferido
2. Você é Bacharel em Ciências Contábeis ou Técnico em Contabilidade? (A prova tem escopos diferentes)
3. Você tem data prevista para o exame?
4. Quantas horas por dia você consegue estudar?
5. Como você se avalia hoje? Iniciante, Intermediário ou Avançado?
6. Qual é seu melhor horário? Manhã, Tarde, Noite ou Varia?
7. Qual matéria da contabilidade você mais teme? (Contabilidade Geral, Custos, Auditoria, Perícia, Ética, Legislação…)

REGRAS:
- UMA pergunta por mensagem
- Use SEMPRE o nome do aluno
- NÃO use travessão (—), hífen duplo ou traço longo em NENHUMA frase. Use vírgula, ponto ou reescreva.
- NÃO mencione "mentores" ou "agentes"

ENCERRAMENTO OBRIGATÓRIO — dispare assim que tiver: nome + habilitação + pelo menos 3 outras respostas (mínimo 4 informações):
Na MESMA mensagem em que acolher a última resposta do aluno, escreva uma frase animada de encerramento e, na mesma linha (sem quebra de linha), adicione exatamente:
__DONE__{"nomePreferido":"...","modalidade":"CFC","cargo":"<Bacharel ou Técnico> CFC","orgao":"CFC","banca":"CFC","dataProva":null ou "YYYY-MM-DD","horasEstudo":2,"nivelAtual":"iniciante","disponibilidade":"noite","dificuldades":"...","trilha":"<Bacharel|Tecnico>"}

ATENÇÃO: Não faça mais perguntas após ter as 4 informações. Encerre imediatamente.
Responda SEMPRE em português brasileiro.`;
  }

  // Default: CONCURSO_PUBLICO (existing behavior)
  const concursoBloco = multiConcurso
    ? `2. Qual(is) cargo(s) e órgão(s) você quer prestar? (Seu plano permite até ${maxConcursos} concursos simultâneos — liste todos se quiser)\n   *(Ex: "1) Delegado PCSP / 2) Auditor Receita Federal")*`
    : `2. Qual cargo e órgão você quer prestar? (e em qual estado, se aplicável)\n   *(Ex: Delegado da Polícia Civil de SP, Auditor da Receita Federal, Analista do TRF…)*`;

  return `Você é a Estrategista Aprovai, assistente especializada em planejamento para concursos públicos.

Seu papel é coletar as informações essenciais do aluno de forma NATURAL e CONVERSACIONAL — UMA pergunta por mensagem.

CONTEXTO: A conversa já foi iniciada e o aluno já foi saudado. A primeira mensagem do histórico é sua saudação pedindo o nome preferido. A partir da RESPOSTA DO NOME do aluno, use esse nome em TODAS as mensagens seguintes.
DATA ATUAL: ${hoje} (ano ${anoAtual}). Use essa data ao falar sobre concursos, editais e prazos.

SEQUÊNCIA OBRIGATÓRIA (siga esta ordem, uma por mensagem — a saudação já foi feita):
1. [JÁ FEITO] Perguntou como o aluno prefere ser chamado
${concursoBloco}
3. Qual é a banca organizadora? (ex: CESPE/CEBRASPE, FCC, AOCP, VUNESP, FGV, FUNCAB, IBFC, Quadrix…)
4. Você tem data prevista para a prova? (se sim, qual?)
5. Quantas horas por dia você consegue dedicar aos estudos? (ex: 1h, 2h, 4h…)
6. Como você se avalia hoje? Iniciante (nunca estudou para concurso), Intermediário (já estudou um pouco) ou Avançado (estuda há mais de 6 meses)?
7. Qual é seu melhor horário para estudar? Manhã, Tarde, Noite ou Varia?
8. Quais são suas maiores dificuldades ou matérias que mais teme?

REGRAS:
- EXATAMENTE UMA pergunta por mensagem
- Use SEMPRE o nome que o aluno informou ao responder a pergunta 1
- Se o aluno responder várias coisas de uma vez, agradeça e avance pelas próximas pendentes (uma por uma)
- Seja motivador, use emojis com moderação
- Se não souber a banca, anote como "Não informada"
- NÃO use travessão (—), hífen duplo ou traço longo em NENHUMA frase. Use vírgula, ponto ou reescreva.
- NÃO mencione "mentores", "agentes" ou "equipe"
- Ao fazer a pergunta 5 (horas), forneça exemplos: "1h", "2h", "3h ou mais"
- Ao fazer a pergunta 6 (nível), apresente as 3 opções claramente
- Ao fazer a pergunta 7 (horário), apresente as 4 opções

ENCERRAMENTO OBRIGATÓRIO — dispare assim que tiver: nome + cargo + banca + pelo menos 3 outras respostas (mínimo 6 infos):
Na MESMA mensagem em que acolher a última resposta do aluno, escreva uma frase animada de encerramento chamando o aluno pelo nome preferido e, na mesma linha (sem quebra de linha), adicione exatamente:
__DONE__{"nomePreferido":"...","modalidade":"CONCURSO_PUBLICO","cargo":"...","orgao":"...","banca":"...","dataProva":null ou "YYYY-MM-DD","horasEstudo":2,"nivelAtual":"iniciante","disponibilidade":"noite","dificuldades":"...","vestibular":null,"trilha":null,"oabFase":null}

ATENÇÃO CRÍTICA: Ao receber a resposta da pergunta 8 (dificuldades), você JÁ TEM todas as informações necessárias. Não faça mais nenhuma pergunta. Encerre IMEDIATAMENTE com a mensagem animada + __DONE__.

Valores válidos:
- nomePreferido: exatamente o nome/apelido que o aluno disse querer ser chamado
- horasEstudo: número inteiro (1, 2, 3, 4, 5, 6)
- nivelAtual: "iniciante" | "intermediario" | "avancado"
- disponibilidade: "manha" | "tarde" | "noite" | "variado"
- dataProva: "YYYY-MM-DD" ou null

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

    // Filtra histórico — Anthropic exige que 1ª msg seja "user"
    const rawHistory = history.slice(-14).map(m => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));
    const firstUserIdx = rawHistory.findIndex(m => m.role === "user");
    const filteredHistory = firstUserIdx >= 0 ? rawHistory.slice(firstUserIdx) : [];

    const response = await createWithCache({
      model: MODELS.sonnet,
      maxTokens: 1024,
      systemPrompt: sistemPrompt,
      cacheSystem: true,
      messages: [
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

    interface ProfileData {
      nomePreferido: string | null;
      modalidade: string;
      cargo: string;
      orgao: string;
      banca: string;
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

    // Sanitiza horasEstudo — garante inteiro entre 1 e 12
    function sanitizeHoras(val: unknown): number | null {
      const n = typeof val === "number" ? val : parseInt(String(val), 10);
      if (isNaN(n) || n < 1 || n > 12) return null;
      return Math.round(n);
    }

    // Sanitiza nível
    function sanitizeNivel(val: unknown): string | null {
      const valid = ["iniciante", "intermediario", "avancado"];
      if (typeof val !== "string") return null;
      const v = val.toLowerCase().trim();
      return valid.includes(v) ? v : null;
    }

    // Sanitiza disponibilidade
    function sanitizeDisp(val: unknown): string | null {
      const valid = ["manha", "tarde", "noite", "variado"];
      if (typeof val !== "string") return null;
      const v = val.toLowerCase().trim();
      return valid.includes(v) ? v : null;
    }

    // 1. Salvar StudentProfile em duas etapas:
    //    a) Campos garantidos (colunas existentes desde sempre)
    //    b) Campos novos (horasEstudo, nivelAtual, disponibilidade) — silenciosos se colunas ainda não existirem
    const baseFields = {
      cargo: profile.cargo,
      orgao: profile.orgao,
      dataProva: sanitizeDate(profile.dataProva),
      dificuldades: profile.dificuldades ?? null,
      onboardingDone: true,
      updatedAt: new Date().toISOString(),
    };
    const extendedFields = {
      nomePreferido: profile.nomePreferido?.trim() || userName || null,
      horasEstudo: sanitizeHoras(profile.horasEstudo),
      nivelAtual: sanitizeNivel(profile.nivelAtual),
      disponibilidade: sanitizeDisp(profile.disponibilidade),
      modalidade: profile.modalidade ?? "CONCURSO_PUBLICO",
      vestibular: profile.vestibular ?? null,
      trilha: profile.trilha ?? null,
      oabFase: profile.oabFase ?? null,
      banca: profile.banca ?? null,
    };

    const { data: existingRows } = await db
      .from("StudentProfile")
      .select("id")
      .eq("userId", dbUser.id)
      .limit(1);

    const existingProfile = existingRows?.[0] ?? null;
    let savedProfile: Record<string, unknown> | null = null;

    if (existingProfile) {
      // Tenta com campos novos primeiro; se falhar (coluna inexistente), salva só base
      const { data, error: updErr } = await db
        .from("StudentProfile")
        .update({ ...baseFields, ...extendedFields })
        .eq("id", existingProfile.id)
        .select();
      if (updErr) {
        if (updErr.message?.includes("column") || updErr.code === "PGRST204") {
          // Colunas novas ainda não existem no banco — salva só base
          console.warn("[onboarding] colunas extras não existem, salvando apenas base:", updErr.message);
          const { data: d2, error: e2 } = await db
            .from("StudentProfile")
            .update(baseFields)
            .eq("id", existingProfile.id)
            .select();
          if (e2) return NextResponse.json({ error: `Erro ao atualizar perfil: ${e2.message}` }, { status: 500 });
          savedProfile = (d2 ?? [])[0] ?? null;
        } else {
          console.error("[onboarding] update error:", updErr.message);
          return NextResponse.json({ error: `Erro ao atualizar perfil: ${updErr.message}` }, { status: 500 });
        }
      } else {
        savedProfile = (data ?? [])[0] ?? null;
      }
    } else {
      // Tenta com campos novos; se falhar, cria só com base
      const newId = crypto.randomUUID();
      const now = new Date().toISOString();
      const { data, error: insErr } = await db
        .from("StudentProfile")
        .insert({ id: newId, userId: dbUser.id, ...baseFields, ...extendedFields, createdAt: now })
        .select();
      if (insErr) {
        if (insErr.message?.includes("column") || insErr.code === "PGRST204") {
          console.warn("[onboarding] colunas extras não existem, criando apenas base:", insErr.message);
          const { data: d2, error: e2 } = await db
            .from("StudentProfile")
            .insert({ id: newId, userId: dbUser.id, ...baseFields, createdAt: now })
            .select();
          if (e2) return NextResponse.json({ error: `Erro ao criar perfil: ${e2.message}` }, { status: 500 });
          savedProfile = (d2 ?? [])[0] ?? null;
        } else {
          console.error("[onboarding] insert error:", insErr.message);
          return NextResponse.json({ error: `Erro ao criar perfil: ${insErr.message}` }, { status: 500 });
        }
      } else {
        savedProfile = (data ?? [])[0] ?? null;
      }
    }

    // 2. Buscar agentes e selecionar os ideais
    const { data: allAgents } = await db
      .from("Agent")
      .select("id, name, categoria, area, banca, color, description, systemPrompt")
      .eq("active", true);

    const selectedIds = selectAgents(
      (allAgents ?? []) as AgentRow[],
      profile.cargo, profile.orgao, profile.banca,
      maxConcursos,
      profile.modalidade ?? "CONCURSO_PUBLICO",
      profile.trilha,
    );

    // 3. Limpar UserAgent anteriores e inserir novos
    await db.from("UserAgent").delete().eq("userId", dbUser.id);
    for (const agentId of selectedIds) {
      const { error: uaErr } = await db.from("UserAgent").insert(
        { id: crypto.randomUUID(), userId: dbUser.id, agentId, createdAt: new Date().toISOString() }
      );
      if (uaErr) console.error("[onboarding] UserAgent insert error:", uaErr);
    }

    // 4. Buscar dados dos agentes selecionados
    const { data: selectedAgents } = selectedIds.length > 0
      ? await db.from("Agent").select("id, name, description, categoria, area, banca, color, systemPrompt").in("id", selectedIds)
      : { data: [] };

    // 5. Atribuir matérias ao aluno baseado na modalidade
    //    Limpa antigas e insere novas — garante isolamento correto por modalidade
    await db.from("StudentSubject").delete().eq("userId", dbUser.id);

    const agentAreas = (selectedAgents ?? [])
      .map((a: { area?: string | null }) => a.area ?? "")
      .filter(Boolean);

    const subjectCats = getSubjectCategorias(
      profile.modalidade ?? "CONCURSO_PUBLICO",
      agentAreas,
    );

    if (subjectCats.length > 0) {
      const { data: matchedSubjects } = await db
        .from("Subject")
        .select("id")
        .in("categoria", subjectCats)
        .order("ordem");

      if (matchedSubjects && matchedSubjects.length > 0) {
        const now = new Date().toISOString();
        const ssRows = matchedSubjects.map((s: { id: string }) => ({
          id: crypto.randomUUID(),
          userId: dbUser.id,
          subjectId: s.id,
          fromEdital: false,
          createdAt: now,
        }));
        // Inserção em lote
        const { error: ssErr } = await db.from("StudentSubject").insert(ssRows);
        if (ssErr) console.error("[onboarding] StudentSubject insert error:", ssErr.message);
      }
    }

    // Mescla savedProfile (do DB) com extendedFields do __DONE__ para garantir que
    // modalidade/vestibular/trilha/oabFase/banca estejam disponíveis para a geração do plano
    // mesmo quando as colunas ainda não existem no banco
    const mergedProfile = {
      ...(savedProfile ?? {}),
      ...extendedFields,
    };

    return NextResponse.json({
      text: textPart,
      done: true,
      profile: mergedProfile,
      subjects: [],
      agents: selectedAgents ?? [],
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[onboarding] error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
