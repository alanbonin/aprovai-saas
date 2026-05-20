import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { createWithCache, MODELS, extractJSON } from "@/lib/anthropic";
import type { MessageParam } from "@anthropic-ai/sdk/resources";

const CASO_SYSTEM =
  "Você é um especialista em seleção e avaliação para concursos públicos brasileiros, com vasta experiência em estudos de caso, banca examinadora e critérios de avaliação discursiva. Responda apenas com JSON válido.";

async function getProfile(supabaseId: string) {
  const { data: dbUser } = await db.from("User").select("id").eq("supabaseId", supabaseId).single();
  if (!dbUser) return null;
  const { data: profile } = await db
    .from("StudentProfile")
    .select("cargo, orgao")
    .eq("userId", dbUser.id)
    .maybeSingle();
  return profile;
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json() as {
    action: string;
    tema?: string;
    cargo?: string;
    orgao?: string;
    cenario?: string;
    resposta?: string;
    cenarioManual?: string;
    imageBase64?: string;
    imageType?: string;
  };

  const { action } = body;

  // ── Sugerir temas personalizados por cargo ────────────────────────────────────
  if (action === "sugerir_temas") {
    const profile = await getProfile(user.id);
    const cargo = body.cargo ?? profile?.cargo ?? "";
    const orgao = body.orgao ?? profile?.orgao ?? "";
    const perfilDesc = cargo ? `${cargo}${orgao ? ` (${orgao})` : ""}` : "servidor público em geral";

    const prompt = `Sugira 10 temas de estudo de caso para concursos públicos adequados para: ${perfilDesc}

Regras:
- Temas diretamente relevantes para a área de atuação do cargo
- TI/Tecnologia: segurança da informação, LGPD, governança de TI, incidentes cibernéticos, continuidade de negócios
- Bancário/Financeiro: compliance, lavagem de dinheiro, crédito e risco, sigilo bancário, prevenção a fraudes
- Saúde: ética médica, SUS, regulação sanitária, responsabilidade profissional
- Jurídico/Advocacia: processo civil/penal, responsabilidade civil do Estado, controle de constitucionalidade
- Administrativo: licitações, contratos, processo administrativo disciplinar, controle interno
- Policial: flagrante, inquérito, direitos fundamentais, uso da força, crime organizado
- Inclua sempre: ética no serviço público e atendimento ao cidadão
- Label claro com máximo 5 palavras e emoji representativo

Retorne APENAS JSON válido:
{"temas":[{"id":"slug_sem_espacos","label":"Tema do caso","icon":"emoji"}]}`;

    try {
      const msg = await createWithCache({
        model: MODELS.haiku,
        maxTokens: 800,
        systemPrompt: CASO_SYSTEM,
        cacheSystem: false,
        messages: [{ role: "user", content: prompt }],
      });
      const raw = (msg.content[0] as { type: string; text: string }).text.trim();
      const parsed = extractJSON<{ temas: { id: string; label: string; icon: string }[] }>(raw);
      return NextResponse.json({ temas: parsed.temas ?? [], cargo, orgao });
    } catch (e) {
      console.error("[caso/sugerir_temas]", e);
      return NextResponse.json({ error: (e as Error).message }, { status: 500 });
    }
  }

  // ── Gerar cenário com IA ──────────────────────────────────────────────────────
  if (action === "gerar") {
    const profile = await getProfile(user.id);
    const cargo = body.cargo ?? profile?.cargo ?? "";
    const orgao = body.orgao ?? profile?.orgao ?? "";
    const { tema } = body;

    const perfilLine = cargo
      ? `\nCargo alvo: ${cargo}${orgao ? ` | Órgão: ${orgao}` : ""}`
      : "";

    const prompt = `Gere um estudo de caso realista para o tema "${tema ?? "ética no serviço público"}"${perfilLine}

O caso deve:
- Ser específico e realista para a área de atuação descrita (não genérico)
- Ter dados concretos: nomes fictícios, datas, valores, procedimentos específicos da área
- "titulo": título objetivo do caso (1 linha)
- "contexto": situação detalhada em 3-5 parágrafos com complexidade adequada ao cargo
- "pergunta": pergunta principal clara que o candidato deve responder
- "dicas": array com 2-3 dicas sobre o que avaliar na resposta
- "criterios": array com 4 critérios de avaliação específicos para este cargo/área

Retorne APENAS JSON válido:
{"titulo":"...","contexto":"...","pergunta":"...","dicas":["..."],"criterios":["..."]}`;

    try {
      const msg = await createWithCache({
        model: MODELS.sonnet,
        maxTokens: 1800,
        systemPrompt: CASO_SYSTEM,
        cacheSystem: false,
        messages: [{ role: "user", content: prompt }],
      });
      const raw = (msg.content[0] as { type: string; text: string }).text.trim();
      const parsed = extractJSON<{ titulo: string; contexto: string; pergunta: string; dicas: string[]; criterios: string[] }>(raw);
      return NextResponse.json(parsed);
    } catch (e) {
      console.error("[caso/gerar]", e);
      return NextResponse.json({ error: (e as Error).message }, { status: 500 });
    }
  }

  // ── Avaliar resposta (IA ou manual) ───────────────────────────────────────────
  if (action === "avaliar") {
    const { cenario, cenarioManual, resposta } = body;
    const textoDoCase = cenarioManual?.trim() || cenario?.trim();
    if (!textoDoCase || !resposta?.trim()) {
      return NextResponse.json({ error: "cenario e resposta são obrigatórios" }, { status: 400 });
    }

    const profile = await getProfile(user.id);
    const cargo = body.cargo ?? profile?.cargo ?? "";
    const cargoLine = cargo ? `\nCargo do candidato: ${cargo}` : "";

    const prompt = `Você é um avaliador experiente de concursos públicos brasileiros.${cargoLine}

ESTUDO DE CASO:
${textoDoCase}

RESPOSTA DO CANDIDATO:
"""
${resposta.slice(0, 3000)}
"""

Avalie a resposta considerando o perfil do cargo e a qualidade técnica da resposta.

Retorne APENAS JSON válido:
{"nota":7.5,"acertos":["ponto positivo 1","ponto positivo 2"],"melhorias":["melhoria 1","melhoria 2"],"dica_banca":"dica específica sobre o que a banca espera neste tipo de caso","gabarito_resumido":"o que seria a resposta ideal em 3-4 frases"}`;

    try {
      const msg = await createWithCache({
        model: MODELS.sonnet,
        maxTokens: 1000,
        systemPrompt: CASO_SYSTEM,
        cacheSystem: false,
        messages: [{ role: "user", content: prompt }],
      });
      const raw = (msg.content[0] as { type: string; text: string }).text.trim();
      const parsed = extractJSON<{ nota: number; acertos: string[]; melhorias: string[]; dica_banca: string; gabarito_resumido: string }>(raw);
      return NextResponse.json(parsed);
    } catch (e) {
      console.error("[caso/avaliar]", e);
      return NextResponse.json({ error: (e as Error).message }, { status: 500 });
    }
  }

  // ── Avaliar via foto (visão computacional) ────────────────────────────────────
  if (action === "avaliar_foto") {
    const { imageBase64, imageType, resposta } = body;
    if (!imageBase64 || !resposta?.trim()) {
      return NextResponse.json({ error: "imageBase64 e resposta são obrigatórios" }, { status: 400 });
    }

    const profile = await getProfile(user.id);
    const cargo = body.cargo ?? profile?.cargo ?? "";
    const cargoLine = cargo ? `\nCargo do candidato: ${cargo}` : "";

    const messages: MessageParam[] = [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: (imageType ?? "image/jpeg") as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
              data: imageBase64,
            },
          },
          {
            type: "text",
            text: `Esta imagem contém um estudo de caso de concurso público.${cargoLine}

Leia o enunciado/caso da imagem e avalie a seguinte resposta do candidato:
"""
${resposta.slice(0, 3000)}
"""

Retorne APENAS JSON válido:
{"caso_lido":"transcrição resumida do caso da imagem","nota":7.5,"acertos":["..."],"melhorias":["..."],"dica_banca":"...","gabarito_resumido":"..."}`,
          },
        ],
      },
    ];

    try {
      const msg = await createWithCache({
        model: MODELS.sonnet,
        maxTokens: 1200,
        systemPrompt: CASO_SYSTEM,
        cacheSystem: false,
        messages,
      });
      const raw = (msg.content[0] as { type: string; text: string }).text.trim();
      const parsed = extractJSON<{
        caso_lido: string;
        nota: number;
        acertos: string[];
        melhorias: string[];
        dica_banca: string;
        gabarito_resumido: string;
      }>(raw);
      return NextResponse.json(parsed);
    } catch (e) {
      console.error("[caso/avaliar_foto]", e);
      return NextResponse.json({ error: (e as Error).message }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "action inválida" }, { status: 400 });
}
