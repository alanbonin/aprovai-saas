import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createWithCache, MODELS, extractJSON } from "@/lib/anthropic";
import { defaultAiLimiter } from "@/lib/rate-limit";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { data: dbUser } = await db.from("User").select("id").eq("supabaseId", user.id).single();
  if (dbUser) {
    const rl = await defaultAiLimiter.check(dbUser.id);
    if (!rl.ok) return NextResponse.json({ error: rl.error }, { status: 429 });
  }

  const { enunciado } = await req.json();
  if (!enunciado) return NextResponse.json({ termos: [] });

  const safeEnunciado = String(enunciado)
    .replace(/[\x00-\x1F\x7F-\x9F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 600);

  try {
    const GLOSSARIO_SYSTEM = "Você é um especialista jurídico e administrativo que identifica termos técnicos em questões de concursos públicos e os explica de forma simples para estudantes.";
    const msg = await createWithCache({
      model: MODELS.haiku,
      maxTokens: 600,
      systemPrompt: GLOSSARIO_SYSTEM,
      cacheSystem: true,
      messages: [{
        role: "user",
        content: `Identifique até 4 termos técnicos jurídicos ou administrativos no texto abaixo que um concurseiro pode não conhecer. Para cada termo, forneça uma definição breve (1-2 frases, em português simples).

Texto: "${safeEnunciado}"

Retorne APENAS JSON válido:
{"termos":[{"termo":"nome exato como aparece no texto","definicao":"definição em 1-2 frases simples"}]}

Se não houver termos técnicos relevantes, retorne {"termos":[]}.`,
      }],
    });

    const raw = (msg.content[0] as { type: string; text: string }).text.trim();
    const parsed = extractJSON<{ termos?: { termo: string; definicao: string }[] }>(raw);
    return NextResponse.json({ termos: parsed.termos ?? [] });
  } catch {
    return NextResponse.json({ termos: [] });
  }
}
