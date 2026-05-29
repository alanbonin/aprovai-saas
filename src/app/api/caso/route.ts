import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { createWithCache, MODELS, extractJSON } from "@/lib/anthropic";
import type { MessageParam, ImageBlockParam, TextBlockParam } from "@anthropic-ai/sdk/resources";
import { log } from "@/lib/logger";

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

function imgBlock(base64: string, type: string): ImageBlockParam {
  return {
    type: "image",
    source: {
      type: "base64",
      media_type: (type ?? "image/jpeg") as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
      data: base64,
    },
  };
}

const AVALIACAO_FIELDS = `
Retorne APENAS JSON válido (sem markdown):
{
  "nota": 7.5,
  "classificacao": "Aprovado",
  "acertos": ["ponto positivo 1", "ponto positivo 2"],
  "melhorias": ["o que melhorar 1", "o que melhorar 2"],
  "pontos_criticos": ["ponto crítico que não pode faltar 1"],
  "dica_banca": "dica específica sobre o que a banca espera neste tipo de caso",
  "dicas_estudo": ["dica de estudo 1", "dica de estudo 2"],
  "gabarito_resumido": "o que seria a resposta ideal em 3-4 frases"
}
nota de 0 a 10. classificacao: "Aprovado" (>=7), "Recuperação" (>=5), "Reprovado" (<5).`;

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  // Verificar acesso ao plano
  const { getAccessLevel } = await import("@/lib/access");
  const access = await getAccessLevel();
  if (access.maxCasosPerWeek === 0) {
    return NextResponse.json({ error: "Recurso não disponível no seu plano. Faça upgrade para acessar Estudos de Caso." }, { status: 403 });
  }

  const body = await req.json() as {
    action: string;
    tema?: string;
    cenarioTexto?: string;
    cenarioFotoBase64?: string;
    cenarioFotoType?: string;
    respostaTexto?: string;
    respostaFotoBase64?: string;
    respostaFotoType?: string;
  };

  const { action } = body;

  // ── Sugerir temas personalizados ─────────────────────────────────────────────
  if (action === "sugerir_temas") {
    const profile = await getProfile(user.id);
    const cargo = profile?.cargo ?? "";
    const orgao = profile?.orgao ?? "";
    const perfilDesc = cargo ? `${cargo}${orgao ? ` (${orgao})` : ""}` : "servidor público em geral";

    const prompt = `Sugira 10 temas de estudo de caso para concursos públicos adequados para: ${perfilDesc}

Regras:
- Temas diretamente relevantes para a área de atuação do cargo
- TI/Tecnologia: segurança da informação, LGPD, governança de TI, incidentes cibernéticos, continuidade de negócios
- Bancário/Financeiro: compliance, lavagem de dinheiro, crédito e risco, sigilo bancário, prevenção a fraudes
- Saúde: ética médica, SUS, regulação sanitária, responsabilidade profissional
- Jurídico: processo civil/penal, responsabilidade civil do Estado, controle de constitucionalidade
- Administrativo: licitações, contratos, processo administrativo disciplinar, controle interno
- Policial: flagrante, inquérito, uso da força, crime organizado, direitos fundamentais
- Inclua sempre: ética no serviço público e atendimento ao cidadão
- Label claro com máximo 5 palavras e emoji representativo

Retorne APENAS JSON válido:
{"temas":[{"id":"slug_sem_espacos","label":"Tema do caso","icon":"emoji"}]}`;

    try {
      const msg = await createWithCache({
        model: MODELS.haiku, maxTokens: 1200, systemPrompt: CASO_SYSTEM, cacheSystem: false,
        messages: [{ role: "user", content: prompt }],
      });
      const raw = (msg.content[0] as { type: string; text: string }).text.trim();
      const parsed = extractJSON<{ temas: { id: string; label: string; icon: string }[] }>(raw);
      return NextResponse.json({ temas: parsed.temas ?? [], cargo, orgao });
    } catch (e) {
      log.error("ai.caso_sugerir_temas_error", {}, e);
      return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }
  }

  // ── Gerar cenário ────────────────────────────────────────────────────────────
  if (action === "gerar") {
    const profile = await getProfile(user.id);
    const cargo = profile?.cargo ?? "";
    const orgao = profile?.orgao ?? "";
    const { tema } = body;

    const perfilLine = cargo ? `\nCargo alvo: ${cargo}${orgao ? ` | Órgão: ${orgao}` : ""}` : "";

    const prompt = `Gere um estudo de caso para concurso público sobre: "${tema ?? "ética no serviço público"}"${perfilLine}

Seja específico para a área. Use nomes fictícios, datas e valores concretos. Contexto com 3 parágrafos objetivos.

Retorne APENAS JSON válido:
{"titulo":"título curto","contexto":"parágrafo1\\n\\nparágrafo2\\n\\nparágrafo3","pergunta":"pergunta objetiva","dicas":["dica 1","dica 2"],"criterios":["critério 1","critério 2","critério 3","critério 4"]}`;

    try {
      let msg;
      try {
        msg = await createWithCache({
          model: MODELS.haiku, maxTokens: 2500, systemPrompt: CASO_SYSTEM, cacheSystem: false,
          messages: [{ role: "user", content: prompt }],
        });
      } catch (haikuErr) {
        log.warn("ai.caso_haiku_fallback_sonnet", {}, haikuErr);
        msg = await createWithCache({
          model: MODELS.sonnet, maxTokens: 2500, systemPrompt: CASO_SYSTEM, cacheSystem: false,
          messages: [{ role: "user", content: prompt }],
        });
      }
      const raw = (msg.content[0] as { type: string; text: string }).text.trim();
      log.debug("ai.caso_gerar_raw_preview", { preview: raw.slice(0, 120) });
      const parsed = extractJSON<{ titulo: string; contexto: string; pergunta: string; dicas: string[]; criterios: string[] }>(raw);
      return NextResponse.json(parsed);
    } catch (e) {
      log.error("ai.caso_gerar_error", {}, e);
      return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }
  }

  // ── Avaliar (suporta todas as combinações de texto/foto para caso e resposta) ─
  if (action === "avaliar") {
    const { cenarioTexto, cenarioFotoBase64, cenarioFotoType,
            respostaTexto, respostaFotoBase64, respostaFotoType } = body;

    const temCaso = cenarioTexto?.trim() || cenarioFotoBase64;
    const temResposta = respostaTexto?.trim() || respostaFotoBase64;

    if (!temCaso || !temResposta) {
      return NextResponse.json({ error: "Caso e resposta são obrigatórios" }, { status: 400 });
    }

    const profile = await getProfile(user.id);
    const cargo = profile?.cargo ?? "";
    const cargoLine = cargo ? `\nCargo do candidato: ${cargo}` : "";

    // Monta o array de conteúdo da mensagem
    const parts: (ImageBlockParam | TextBlockParam)[] = [];

    // --- CASO ---
    if (cenarioFotoBase64) {
      parts.push({ type: "text", text: `O estudo de caso está na imagem abaixo.${cargoLine}` } as TextBlockParam);
      parts.push(imgBlock(cenarioFotoBase64, cenarioFotoType ?? "image/jpeg"));
    } else {
      parts.push({ type: "text", text: `ESTUDO DE CASO:${cargoLine}\n${cenarioTexto}` } as TextBlockParam);
    }

    // --- RESPOSTA ---
    if (respostaFotoBase64) {
      parts.push({ type: "text", text: "\nO candidato escreveu a resposta à mão no papel. A imagem da resposta está abaixo:" } as TextBlockParam);
      parts.push(imgBlock(respostaFotoBase64, respostaFotoType ?? "image/jpeg"));
    } else {
      parts.push({ type: "text", text: `\nRESPOSTA DO CANDIDATO:\n"""\n${(respostaTexto ?? "").slice(0, 3000)}\n"""` } as TextBlockParam);
    }

    // Instruções de avaliação
    const hasPhotoInput = !!(cenarioFotoBase64 || respostaFotoBase64);
    const ilegibilidadeInstr = hasPhotoInput
      ? `\nIMPORTANTE: Se qualquer imagem estiver ilegível, borrada ou de baixa qualidade, retorne APENAS: {"ilegivel":true,"motivo":"descrição do problema"}\n`
      : "";

    parts.push({
      type: "text",
      text: `${ilegibilidadeInstr}
Avalie a resposta do candidato de forma completa e construtiva, considerando o cargo e a área de atuação.
${AVALIACAO_FIELDS}`,
    } as TextBlockParam);

    const messages: MessageParam[] = [{ role: "user", content: parts }];

    try {
      const msg = await createWithCache({
        model: MODELS.sonnet, maxTokens: 1400, systemPrompt: CASO_SYSTEM, cacheSystem: false,
        messages,
      });
      const raw = (msg.content[0] as { type: string; text: string }).text.trim();
      const parsed = extractJSON<{
        ilegivel?: boolean;
        motivo?: string;
        nota: number;
        classificacao: string;
        acertos: string[];
        melhorias: string[];
        pontos_criticos: string[];
        dica_banca: string;
        dicas_estudo: string[];
        gabarito_resumido: string;
      }>(raw);

      if (parsed.ilegivel) {
        return NextResponse.json({ ilegivel: true, motivo: parsed.motivo ?? "Imagem ilegível" }, { status: 422 });
      }

      return NextResponse.json(parsed);
    } catch (e) {
      log.error("ai.caso_avaliar_error", {}, e);
      return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "action inválida" }, { status: 400 });
}
