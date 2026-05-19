import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createWithCache, MODELS } from "@/lib/anthropic";

interface ProfileInput {
  cargo?: string;
  orgao?: string;
  banca?: string;
  dataProva?: string | null;
  dificuldades?: string | null;
  horasEstudo?: number | null;
  nivelAtual?: string | null;
  disponibilidade?: string | null;
  nomePreferido?: string | null;
  editalContent?: string | null; // conteúdo programático colado pelo aluno
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const body = await req.json() as { profile?: ProfileInput };
    const profile = body.profile;

    if (!profile?.cargo) {
      return NextResponse.json({ error: "Perfil incompleto" }, { status: 400 });
    }

    const hoje = new Date().toLocaleDateString("pt-BR");
    const diasRestantes = profile.dataProva
      ? Math.ceil((new Date(profile.dataProva).getTime() - Date.now()) / 86_400_000)
      : null;

    const horasDia = profile.horasEstudo ?? 2;
    const nivel = profile.nivelAtual ?? "iniciante";
    const nivelLabel: Record<string, string> = {
      iniciante: "Iniciante (nunca estudou para concurso)",
      intermediario: "Intermediário (já estudou um pouco)",
      avancado: "Avançado (estuda há mais de 6 meses)",
    };

    // Bloco de edital: conteúdo colado pelo aluno ou instrução para usar histórico
    const editalBloco = profile.editalContent
      ? `EDITAL DISPONÍVEL — use EXATAMENTE as matérias e tópicos abaixo (não invente matérias fora do edital):
---EDITAL---
${profile.editalContent.slice(0, 4000)}
---FIM DO EDITAL---`
      : `EDITAL NÃO DISPONÍVEL — use seu conhecimento profundo sobre editais históricos para ${profile.cargo} ${profile.orgao ? `no ${profile.orgao}` : ""} realizados pela banca ${profile.banca ?? "desconhecida"}. Liste as matérias que REALMENTE caem nesse concurso específico, com os pesos típicos de cada uma. Baseie-se em provas antigas e editais anteriores.`;

    const systemPrompt = `Você é um especialista sênior em concursos públicos com profundo conhecimento de editais, bancas e matérias cobradas em cada cargo.

${editalBloco}

Gere um plano de estudos REALISTA e ESPECÍFICO para este aluno. Retorne APENAS JSON válido (sem markdown, sem texto extra):

{
  "titulo": "Cargo exato no Órgão",
  "foco": "Frase motivadora e específica para este concurso/banca (máx 90 chars)",
  "horasPorDia": 3,
  "editalStatus": "com_edital" | "sem_edital_historico",
  "matérias": [
    "Matéria 1 (peso alto)",
    "Matéria 2 (peso alto)",
    "Matéria 3 (peso médio)",
    "..."
  ],
  "cronograma": [
    {"semana": "Sem. 1", "tema": "Matéria — Tópico específico"},
    {"semana": "Sem. 2", "tema": "Matéria — Tópico específico"},
    ...
  ]
}

REGRAS CRÍTICAS:
1. matérias: liste TODAS as matérias do edital (ou histórico) em ordem de peso/frequência — sem limite máximo
2. cronograma: TODAS as matérias do campo "matérias" devem aparecer no cronograma — distribua proporcionalmente ao peso de cada uma. Matérias de alto peso = 2-3 semanas. Médio = 1-2 semanas. Baixo = 1 semana.
3. horasPorDia: use exatamente ${horasDia} (informado pelo aluno) — não altere
4. Se não há edital publicado, baseie-se 100% em editais anteriores para este cargo/banca específicos
5. foco: mencione a banca ou o órgão na frase motivadora
6. Seja específico nos temas do cronograma (ex: "Direito Constitucional — Controle de Constitucionalidade e Repartição de Competências", não apenas "Direito Constitucional")
7. Para aluno ${nivelLabel[nivel]}, ajuste o nível dos tópicos iniciais (mais básico para iniciante, pode ir fundo para avançado)`;

    const userMsg = `Cargo: ${profile.cargo}
Órgão: ${profile.orgao ?? "Não informado"}
Banca: ${profile.banca ?? "Não informada"}
Data da prova: ${profile.dataProva ? `${profile.dataProva} (${diasRestantes != null ? `${diasRestantes} dias` : ""})` : "Não definida"}
Horas de estudo por dia: ${horasDia}h
Nível do aluno: ${nivelLabel[nivel]}
Dificuldades relatadas: ${profile.dificuldades ?? "Nenhuma"}
Data atual: ${hoje}`;

    const response = await createWithCache({
      model: MODELS.sonnet, // Sonnet tem conhecimento real de editais, Haiku não
      maxTokens: 2000,       // mais tokens para cronograma completo
      systemPrompt,
      cacheSystem: true,
      messages: [{ role: "user", content: userMsg }],
    });

    const raw = response.content[0]?.type === "text" ? response.content[0].text.trim() : "";

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("[plano] JSON not found:", raw.slice(0, 300));
      return NextResponse.json({ error: "Plano não gerado" }, { status: 500 });
    }

    const plan = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ plan });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[plano] error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
