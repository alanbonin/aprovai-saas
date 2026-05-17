import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createWithCache, MODELS } from "@/lib/anthropic";


function extractJSON(text: string): string {
  const start = text.indexOf("{");
  if (start === -1) throw new Error("Nenhum JSON");
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}") { depth--; if (depth === 0) return text.slice(start, i + 1); }
  }
  throw new Error("JSON incompleto");
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { enunciado } = await req.json();
  if (!enunciado) return NextResponse.json({ termos: [] });

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

Texto: "${enunciado.slice(0, 600)}"

Retorne APENAS JSON válido:
{"termos":[{"termo":"nome exato como aparece no texto","definicao":"definição em 1-2 frases simples"}]}

Se não houver termos técnicos relevantes, retorne {"termos":[]}.`,
      }],
    });

    const raw = (msg.content[0] as { type: string; text: string }).text.trim();
    const parsed = JSON.parse(extractJSON(raw));
    return NextResponse.json({ termos: parsed.termos ?? [] });
  } catch {
    return NextResponse.json({ termos: [] });
  }
}
