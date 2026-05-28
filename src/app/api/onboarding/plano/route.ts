import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createWithCache, MODELS } from "@/lib/anthropic";
import { log } from "@/lib/logger";

interface ProfileInput {
  modalidade?: string;
  cargo?: string;
  orgao?: string;
  banca?: string;
  trilha?: string;
  oabFase?: string;
  dataProva?: string | null;
  dificuldades?: string | null;
  horasEstudo?: number | null;
  nivelAtual?: string | null;
  disponibilidade?: string | null;
  nomePreferido?: string | null;
  editalContent?: string | null; // conteúdo programático colado pelo aluno
}

function buildModalidadeKnowledgeBloco(mod: string, profile: ProfileInput): string {
  if (mod === "ENEM") {
    return `MODALIDADE: ENEM (Exame Nacional do Ensino Médio)
Use a Matriz de Referência do ENEM (INEP). As 5 grandes áreas:
1. Linguagens, Códigos e suas Tecnologias (45 questões + Redação)
2. Ciências Humanas e suas Tecnologias (45 questões)
3. Ciências da Natureza e suas Tecnologias (45 questões)
4. Matemática e suas Tecnologias (45 questões)
5. Redação — dissertação argumentativa com proposta de intervenção social
Dificuldades relatadas: ${profile.dificuldades ?? "Nenhuma"}`;
  }
  if (mod === "OAB") {
    const fase = profile.oabFase ?? "primeira";
    if (fase === "segunda") {
      return `MODALIDADE: OAB — 2ª Fase (Peça Processual)
Banca: FGV (desde 2010). Prova: 1 questão dissertativa + 1 peça processual.
Área escolhida pelo candidato (Civil, Penal, Trabalhista, Tributário, Administrativo, Internacional).
Conteúdo ESTÁVEL — use o Regulamento Geral do Exame de Ordem (CFOAB) e Matriz de Conteúdo FGV.
Dificuldades: ${profile.dificuldades ?? "Nenhuma"}`;
    }
    return `MODALIDADE: OAB — 1ª Fase
Banca: FGV (desde 2010). 80 questões objetivas, 5h, mínimo 50% para aprovação.
Matérias (pesos históricos FGV): Ética e Estatuto OAB (8%), Direito Constitucional (10%), Dir. Civil (12%), Dir. Processual Civil (9%), Dir. Penal (8%), Dir. Processual Penal (6%), Dir. Trabalhista (8%), Dir. Tributário (8%), Dir. Empresarial (7%), Dir. Administrativo (8%), Dir. do Consumidor (5%), Dir. Internacional (4%), Dir. Ambiental (4%), Dir. Previdenciário (3%).
Conteúdo ESTÁVEL — use o Regulamento Geral do Exame de Ordem.`;
  }
  // CONCURSO_PUBLICO — return empty, use existing editalBloco logic
  return "";
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const body = await req.json() as { profile?: ProfileInput };
    const profile = body.profile;

    const modalidade = profile?.modalidade ?? "CONCURSO_PUBLICO";
    const hasMinData = profile?.cargo || modalidade !== "CONCURSO_PUBLICO";
    if (!hasMinData) {
      return NextResponse.json({ error: "Perfil incompleto" }, { status: 400 });
    }

    const hoje = new Date().toLocaleDateString("pt-BR");
    const diasRestantes = profile?.dataProva
      ? Math.ceil((new Date(profile.dataProva).getTime() - Date.now()) / 86_400_000)
      : null;

    const horasDia = profile?.horasEstudo ?? 2;
    const nivel = profile?.nivelAtual ?? "iniciante";
    const nivelLabel: Record<string, string> = {
      iniciante: "Iniciante (nunca estudou para concurso)",
      intermediario: "Intermediário (já estudou um pouco)",
      avancado: "Avançado (estuda há mais de 6 meses)",
    };

    // Bloco de edital: modalidade-aware
    const modalidadeBloco = buildModalidadeKnowledgeBloco(modalidade, profile ?? {});
    const editalBloco = modalidadeBloco || (profile?.editalContent
      ? `EDITAL DISPONÍVEL — use EXATAMENTE as matérias e tópicos abaixo (não invente matérias fora do edital):
---EDITAL---
${profile.editalContent.slice(0, 4000)}
---FIM DO EDITAL---`
      : `EDITAL NÃO DISPONÍVEL — use seu conhecimento profundo sobre editais históricos para ${profile?.cargo} ${profile?.orgao ? `no ${profile.orgao}` : ""} realizados pela banca ${profile?.banca ?? "desconhecida"}. Liste as matérias que REALMENTE caem nesse concurso específico, com os pesos típicos de cada uma. Baseie-se em provas antigas e editais anteriores.`);

    // Calcula rotina diária proporcional às horas disponíveis
    // Referência: 1h = 60min | cada questão ≈ 2min | cada flashcard ≈ 45s
    // Distribuição alvo por hora:
    //   teoria/aula: ~20% | PDF biblioteca: ~15% | questões: ~35% | revisão: ~15% | flashcards: ~15%
    const totalMin = horasDia * 60;
    const leituraMin    = Math.round(totalMin * 0.20); // teoria e aulas escritas
    const leituraPdfMin = Math.round(totalMin * 0.15); // leitura de PDFs da biblioteca
    const revisaoMin    = Math.round(totalMin * 0.15);
    const questoesDia   = Math.round((totalMin * 0.35) / 2);   // ~2 min por questão
    const flashcardsDia = Math.round((totalMin * 0.15) / 0.75); // ~45s por card
    const simuladoFreq = horasDia <= 1 ? "quinzenal" : horasDia <= 2 ? "semanal" : horasDia <= 3 ? "semanal" : "2x por semana";

    const systemPrompt = `Você é um especialista sênior em concursos públicos com profundo conhecimento de editais, bancas e matérias cobradas em cada cargo.

${editalBloco}

Gere um plano de estudos REALISTA e ESPECÍFICO para este aluno. Retorne APENAS JSON válido (sem markdown, sem texto extra):

{
  "titulo": "Cargo exato no Órgão",
  "foco": "Frase motivadora e específica para este concurso/banca (máx 90 chars)",
  "horasPorDia": 3,
  "editalStatus": "com_edital" | "sem_edital_historico",
  "rotinaDiaria": {
    "questoes": ${questoesDia},
    "flashcards": ${flashcardsDia},
    "leituraMin": ${leituraMin},
    "leituraPdfMin": ${leituraPdfMin},
    "revisaoMin": ${revisaoMin},
    "simulado": "${simuladoFreq}",
    "dica": "Uma frase curta de motivação/estratégia para a rotina diária (máx 80 chars)"
  },
  "matérias": [
    "Matéria 1 (peso alto)",
    "Matéria 2 (peso alto)",
    "Matéria 3 (peso médio)",
    "..."
  ],
  "cronograma": [
    {"semana": "Sem. 1", "tema": "Seg/Ter: Matéria A — Tópico | Qua/Qui: Matéria B — Tópico | Sex: Matéria C — Tópico"},
    {"semana": "Sem. 2", "tema": "Seg/Ter: Matéria A — Tópico | Qua/Qui: Matéria B — Tópico | Sex: Matéria D — Tópico"},
    ...
  ]
}

REGRAS CRÍTICAS:
1. matérias: liste TODAS as matérias do edital (ou histórico) em ordem de peso/frequência — sem limite máximo
2. cronograma: cada semana deve MESCLAR 2-3 matérias diferentes por semana, distribuídas por dias. Use o formato "Seg/Ter: Matéria — Tópico | Qua/Qui: Matéria — Tópico | Sex: Matéria — Tópico". Matérias de alto peso aparecem em mais semanas e mais dias. Matérias de baixo peso aparecem 1-2 vezes no total. TODAS as matérias devem aparecer no cronograma.
3. horasPorDia: use exatamente ${horasDia} (informado pelo aluno) — não altere
4. rotinaDiaria: use os valores já calculados acima (questoes=${questoesDia}, flashcards=${flashcardsDia}, leituraMin=${leituraMin}, leituraPdfMin=${leituraPdfMin}, revisaoMin=${revisaoMin}, simulado="${simuladoFreq}"). leituraPdfMin é o tempo dedicado à leitura de PDFs/apostilas na Biblioteca de PDFs da plataforma. A dica deve ser motivadora e específica para este concurso.
5. Se não há edital publicado, baseie-se 100% em editais anteriores para este cargo/banca específicos
6. foco: mencione a banca ou o órgão na frase motivadora
7. Seja específico nos tópicos (ex: "Dir. Constitucional — Controle de constitucionalidade", não apenas "Direito Constitucional")
8. Para aluno ${nivelLabel[nivel]}, ajuste o nível dos tópicos (mais básico para iniciante, mais avançado para avançado)
9. Número de semanas: calcule com base no tempo disponível e volume de conteúdo — entre 8 e 20 semanas normalmente
10. IMPORTANTE — banco de questões cross-categoria: o banco agrupa questões pelo NOME do tópico independente da categoria (ex: "Língua Portuguesa" engloba questões de todas as bancas). Ao recomendar tópicos no cronograma, use o NOME EXATO do tópico — o aluno terá acesso a questões desse tópico de todas as bancas automaticamente.`;

    const userMsg = modalidade === "ENEM"
      ? `Modalidade: ENEM\nNome: ${profile?.nomePreferido ?? "Não informado"}\nData da prova: ${profile?.dataProva ? `${profile.dataProva}` : "Não definida"}\nHoras de estudo por dia: ${horasDia}h\nNível do aluno: ${nivelLabel[nivel] ?? nivel}\nDificuldades relatadas: ${profile?.dificuldades ?? "Nenhuma"}\nData atual: ${hoje}`
      : modalidade === "OAB"
      ? `Modalidade: OAB — ${profile?.oabFase === "segunda" ? "2ª Fase" : "1ª Fase"}\nData da prova: ${profile?.dataProva ?? "Não definida"}\nHoras de estudo por dia: ${horasDia}h\nNível do aluno: ${nivelLabel[nivel] ?? nivel}\nDificuldades relatadas: ${profile?.dificuldades ?? "Nenhuma"}\nData atual: ${hoje}`
      : `Cargo: ${profile?.cargo}\nÓrgão: ${profile?.orgao ?? "Não informado"}\nBanca: ${profile?.banca ?? "Não informada"}\nData da prova: ${profile?.dataProva ? `${profile.dataProva} (${diasRestantes != null ? `${diasRestantes} dias` : ""})` : "Não definida"}\nHoras de estudo por dia: ${horasDia}h\nNível do aluno: ${nivelLabel[nivel] ?? nivel}\nDificuldades relatadas: ${profile?.dificuldades ?? "Nenhuma"}\nData atual: ${hoje}`;

    const response = await createWithCache({
      model: MODELS.sonnet, // Sonnet tem conhecimento real de editais, Haiku não
      maxTokens: 2500,       // mais tokens para cronograma completo + rotinaDiaria
      systemPrompt,
      cacheSystem: true,
      messages: [{ role: "user", content: userMsg }],
    });

    const raw = response.content[0]?.type === "text" ? response.content[0].text.trim() : "";

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      log.warn("ai.onboarding_plano_json_not_found", {});
      return NextResponse.json({ error: "Plano não gerado" }, { status: 500 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw_plan: any = JSON.parse(jsonMatch[0]);

    // Normaliza campo matérias — AI às vezes retorna sem acento ("materias")
    if (!raw_plan["matérias"] && raw_plan["materias"]) {
      raw_plan["matérias"] = raw_plan["materias"];
      delete raw_plan["materias"];
    }
    // Garante array vazio como fallback
    if (!Array.isArray(raw_plan["matérias"])) {
      raw_plan["matérias"] = [];
    }
    if (!Array.isArray(raw_plan["cronograma"])) {
      raw_plan["cronograma"] = [];
    }

    return NextResponse.json({ plan: raw_plan });

  } catch (err) {
    log.error("ai.onboarding_plano_error", {}, err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
