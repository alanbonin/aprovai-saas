import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createWithCache, MODELS } from "@/lib/anthropic";

const CASO_SYSTEM = "Você é um especialista em seleção e avaliação para concursos públicos brasileiros, com vasta experiência em estudos de caso, banca examinadora e critérios de avaliação discursiva.";

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

// POST /api/caso — gera ou avalia
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json();
  const { action, tema, cargo, cenario, resposta } = body;

  if (action === "gerar") {
    const prompt = `Gere um estudo de caso realista para o tema "${tema}"${cargo ? ` voltado para o cargo de ${cargo}` : ""}.

O caso deve ter:
- "titulo": título do caso (1 linha)
- "contexto": situação detalhada (3-5 parágrafos, com dados específicos, nomes fictícios, datas, valores)
- "pergunta": pergunta principal que o candidato deve responder (clara e objetiva)
- "dicas": array com 2-3 dicas sobre o que avaliar na resposta
- "criterios": array com 4 critérios de avaliação

Retorne APENAS JSON válido:
{"titulo":"...","contexto":"...","pergunta":"...","dicas":["..."],"criterios":["..."]}`;

    try {
      const msg = await createWithCache({
        model: MODELS.sonnet,
        maxTokens: 1500,
        systemPrompt: CASO_SYSTEM,
        messages: [{ role: "user", content: prompt }],
        cacheSystem: true,
      });
      const raw = (msg.content[0] as { type: string; text: string }).text.trim();
      return NextResponse.json(JSON.parse(extractJSON(raw)));
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message }, { status: 500 });
    }
  }

  if (action === "avaliar") {
    if (!cenario || !resposta) return NextResponse.json({ error: "cenario e resposta são obrigatórios" }, { status: 400 });

    const prompt = `Você é um avaliador experiente de concursos públicos brasileiros.

ESTUDO DE CASO:
${cenario}

RESPOSTA DO CANDIDATO:
"""
${resposta.slice(0, 2000)}
"""

Avalie a resposta considerando:
1. Identificação correta do problema principal
2. Fundamentação legal/doutrinária
3. Proposta de solução viável e coerente
4. Clareza e organização da resposta

Retorne APENAS JSON válido:
{"nota":7.5,"acertos":["..."],"melhorias":["..."],"dica_banca":"dica específica sobre o que a banca espera neste tipo de caso","gabarito_resumido":"o que seria a resposta ideal em 3-4 frases"}`;

    try {
      const msg = await createWithCache({
        model: MODELS.sonnet,
        maxTokens: 1000,
        systemPrompt: CASO_SYSTEM,
        messages: [{ role: "user", content: prompt }],
        cacheSystem: true,
      });
      const raw = (msg.content[0] as { type: string; text: string }).text.trim();
      return NextResponse.json(JSON.parse(extractJSON(raw)));
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "action inválida" }, { status: 400 });
}
