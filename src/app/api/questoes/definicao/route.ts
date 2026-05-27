import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createWithCache, MODELS } from "@/lib/anthropic";
import { createLimiter } from "@/lib/rate-limit";
import { log } from "@/lib/logger";

/**
 * GET /api/questoes/definicao?termo=X&contexto=Y
 * Retorna definição concisa de um termo jurídico/técnico via Claude Haiku.
 *
 * Rate limit: 30 definições/minuto por usuário (evita abuso de créditos Anthropic).
 */

// 30 consultas/min por usuário — Claude Haiku custa tokens, não pode ser ilimitado
const definicaoLimiter = createLimiter({ max: 30, window: "1 m", prefix: "definicao" });

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  // Rate limit por usuário autenticado
  const rl = await definicaoLimiter.check(`def:${user.id}`);
  if (!rl.ok) {
    return NextResponse.json({ definicao: null, rateLimited: true }, { status: 429 });
  }

  const { searchParams } = new URL(req.url);
  const termo = (searchParams.get("termo") ?? "").trim();
  const contexto = (searchParams.get("contexto") ?? "").trim();

  if (!termo || termo.length < 2) {
    return NextResponse.json({ definicao: null });
  }

  // Limite de tamanho para evitar prompt injection via parâmetros
  const termoSafe   = termo.slice(0, 80);
  const contextoSafe = contexto.slice(0, 300);

  try {
    const msg = await createWithCache({
      model: MODELS.haiku,
      maxTokens: 200,
      cacheSystem: false,
      systemPrompt: "Você é um glossário especializado em concursos públicos brasileiros e direito. Explique termos de forma objetiva e curta.",
      messages: [{
        role: "user",
        content: `Explique o termo "${termoSafe}" em até 2 frases curtas. ${contextoSafe ? `Contexto da questão: "${contextoSafe}"` : ""} Não use markdown. Se for uma palavra comum sem sentido técnico específico, explique seu uso jurídico ou diga que é uma palavra comum.`,
      }],
    });

    const definicao = msg.content[0]?.type === "text"
      ? msg.content[0].text.trim()
      : "Definição não encontrada.";

    return NextResponse.json({ definicao });
  } catch (err) {
    log.error("ai.definicao_error", { termo: termoSafe }, err);
    return NextResponse.json({ definicao: "Erro ao buscar definição. Tente novamente." }, { status: 200 });
  }
}
