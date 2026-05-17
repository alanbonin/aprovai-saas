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

const CRITERIOS = [
  "Adequação ao tipo documental (estrutura, formalidade, partes obrigatórias)",
  "Clareza e objetividade da linguagem",
  "Correção gramatical e ortográfica",
  "Coerência e coesão textual",
  "Conformidade com o Manual de Redação da Presidência da República",
];

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { tipo, tema, texto } = await req.json();
  if (!tipo || !texto) return NextResponse.json({ error: "tipo e texto são obrigatórios" }, { status: 400 });

  const prompt = `Você é um especialista em Redação Oficial Brasileira e avaliador de concursos públicos federais.

DOCUMENTO SUBMETIDO:
Tipo: ${tipo}
${tema ? `Tema/Contexto: ${tema}` : ""}

TEXTO DO ALUNO:
"""
${texto.slice(0, 3000)}
"""

Avalie este documento em 5 critérios, atribuindo nota de 0 a 10 para cada:
1. ${CRITERIOS[0]}
2. ${CRITERIOS[1]}
3. ${CRITERIOS[2]}
4. ${CRITERIOS[3]}
5. ${CRITERIOS[4]}

Também forneça:
- "pontos_fortes": array com até 3 pontos positivos
- "pontos_melhoria": array com até 3 pontos a melhorar (específicos e acionáveis)
- "versao_corrigida": versão corrigida e aprimorada do documento (mantendo a essência do aluno)
- "nota_final": média das 5 notas (número de 0 a 10)
- "parecer": 2-3 frases de parecer geral

Retorne APENAS JSON válido:
{"notas":{"criterio1":8,"criterio2":7,"criterio3":9,"criterio4":7,"criterio5":8},"nota_final":7.8,"pontos_fortes":["..."],"pontos_melhoria":["..."],"versao_corrigida":"...","parecer":"..."}`;

  try {
    const REDACAO_SYSTEM = "Você é um especialista em Redação Oficial Brasileira e avaliador de concursos públicos federais com profundo conhecimento do Manual de Redação da Presidência da República.";
    const msg = await createWithCache({
      model: MODELS.sonnet,
      maxTokens: 2000,
      systemPrompt: REDACAO_SYSTEM,
      messages: [{ role: "user", content: prompt }],
      cacheSystem: true,
    });
    const raw = (msg.content[0] as { type: string; text: string }).text.trim();
    const result = JSON.parse(extractJSON(raw));
    return NextResponse.json({ ...result, criterios: CRITERIOS });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
