import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { createWithCache, MODELS, extractJSON } from "@/lib/anthropic";
import type { MessageParam, ImageBlockParam, TextBlockParam } from "@anthropic-ai/sdk/resources";

const REDACAO_SYSTEM =
  "Você é um especialista em Redação Oficial Brasileira e avaliador de concursos públicos, com profundo conhecimento do Manual de Redação da Presidência da República e das normas técnicas de cada área. Responda apenas com JSON válido.";

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

// Tipos genéricos de fallback (usados quando não há perfil)
const TIPOS_GENERICOS = [
  { id: "oficio",       label: "Ofício",          desc: "Comunicação oficial entre órgãos" },
  { id: "memorando",    label: "Memorando",        desc: "Comunicação interna entre setores" },
  { id: "relatorio",    label: "Relatório",        desc: "Relatório técnico ou administrativo" },
  { id: "requerimento", label: "Requerimento",     desc: "Pedido formal dirigido a autoridade" },
  { id: "portaria",     label: "Portaria",         desc: "Ato normativo interno de autoridade" },
  { id: "despacho",     label: "Despacho",         desc: "Decisão em processo administrativo" },
];

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json() as {
    action?: string;
    tipo?: string;
    tema?: string;
    texto?: string;
    fotoBase64?: string;
    fotoType?: string;
  };

  // ── Sugerir tipos de documento por cargo ──────────────────────────────────────
  if (body.action === "sugerir_tipos") {
    const profile = await getProfile(user.id);
    const cargo = profile?.cargo ?? "";
    const orgao = profile?.orgao ?? "";

    if (!cargo) {
      return NextResponse.json({ tipos: TIPOS_GENERICOS });
    }

    const perfilDesc = `${cargo}${orgao ? ` (${orgao})` : ""}`;

    const prompt = `Liste os 6 tipos de documento de redação oficial mais relevantes para o cargo: ${perfilDesc}

Regras:
- Policial/Segurança Pública: auto de prisão, relatório de inteligência, boletim de ocorrência, ofício, portaria, despacho
- TI/Tecnologia: nota técnica, termo de referência, memorando técnico, relatório de incidente, ofício, plano de trabalho
- Bancário/Financeiro: relatório de compliance, ofício ao Banco Central, memorando interno, parecer técnico, comunicado, relatório de auditoria
- Saúde: relatório técnico, ofício sanitário, memorando, portaria, nota informativa, relatório de vigilância
- Jurídico: petição, ofício, memorando, despacho, portaria, nota de rodapé jurídica
- Administrativo/Geral: ofício, memorando, relatório, requerimento, portaria, despacho
- Sempre inclua pelo menos 1 tipo genérico (ofício ou memorando)
- "desc" deve ser uma frase curtíssima (máx. 6 palavras)

Retorne APENAS JSON válido:
{"tipos":[{"id":"slug","label":"Nome do tipo","desc":"descrição curta"}]}`;

    try {
      const msg = await createWithCache({
        model: MODELS.haiku, maxTokens: 600, systemPrompt: REDACAO_SYSTEM, cacheSystem: false,
        messages: [{ role: "user", content: prompt }],
      });
      const raw = (msg.content[0] as { type: string; text: string }).text.trim();
      const parsed = extractJSON<{ tipos: { id: string; label: string; desc: string }[] }>(raw);
      const tipos = parsed.tipos?.length ? parsed.tipos : TIPOS_GENERICOS;
      return NextResponse.json({ tipos, cargo, orgao });
    } catch (e) {
      console.error("[redacao/sugerir_tipos]", e);
      return NextResponse.json({ tipos: TIPOS_GENERICOS });
    }
  }

  // ── Avaliar redação (texto digitado ou foto manuscrita) ──────────────────────
  const { tipo, tema, texto, fotoBase64, fotoType } = body;

  if (!tipo) return NextResponse.json({ error: "tipo é obrigatório" }, { status: 400 });
  if (!texto?.trim() && !fotoBase64) {
    return NextResponse.json({ error: "texto ou foto são obrigatórios" }, { status: 400 });
  }

  const profile = await getProfile(user.id);
  const cargo = profile?.cargo ?? "";
  const cargoLine = cargo ? `\nCargo do candidato: ${cargo}` : "";

  const CRITERIOS = [
    "Adequação ao tipo documental (estrutura, formalidade, partes obrigatórias)",
    "Clareza e objetividade da linguagem",
    "Correção gramatical e ortográfica",
    "Coerência e coesão textual",
    "Conformidade com o Manual de Redação da Presidência da República",
  ];

  const instrucoes = `${cargoLine}

Avalie o documento em 5 critérios (nota 0-10 cada):
1. ${CRITERIOS[0]}
2. ${CRITERIOS[1]}
3. ${CRITERIOS[2]}
4. ${CRITERIOS[3]}
5. ${CRITERIOS[4]}

Forneça também:
- "pontos_fortes": array até 3 pontos positivos
- "pontos_melhoria": array até 3 pontos a melhorar (específicos e acionáveis)
- "versao_corrigida": versão corrigida e aprimorada (mantendo essência do aluno)
- "nota_final": média das 5 notas (0-10)
- "parecer": 2-3 frases de parecer geral

${fotoBase64 ? 'IMPORTANTE: Se a imagem estiver ilegível, retorne APENAS: {"ilegivel":true,"motivo":"descrição"}' : ""}

Retorne APENAS JSON válido:
{"notas":{"criterio1":8,"criterio2":7,"criterio3":9,"criterio4":7,"criterio5":8},"nota_final":7.8,"pontos_fortes":["..."],"pontos_melhoria":["..."],"versao_corrigida":"...","parecer":"..."}`;

  // Monta mensagem (texto ou foto)
  let parts: (ImageBlockParam | TextBlockParam)[];

  if (fotoBase64) {
    parts = [
      { type: "text", text: `Tipo de documento: ${tipo}${tema ? `\nTema/contexto: ${tema}` : ""}\n\nO candidato escreveu o documento à mão no papel. Leia a imagem e avalie:` } as TextBlockParam,
      imgBlock(fotoBase64, fotoType ?? "image/jpeg"),
      { type: "text", text: instrucoes } as TextBlockParam,
    ];
  } else {
    parts = [
      { type: "text", text: `DOCUMENTO SUBMETIDO:\nTipo: ${tipo}${tema ? `\nTema/Contexto: ${tema}` : ""}\n\nTEXTO DO ALUNO:\n"""\n${(texto ?? "").slice(0, 4000)}\n"""\n${instrucoes}` } as TextBlockParam,
    ];
  }

  const messages: MessageParam[] = [{ role: "user", content: parts }];

  try {
    const msg = await createWithCache({
      model: MODELS.sonnet, maxTokens: 3000, systemPrompt: REDACAO_SYSTEM, cacheSystem: false,
      messages,
    });
    const raw = (msg.content[0] as { type: string; text: string }).text.trim();
    const result = extractJSON<{
      ilegivel?: boolean;
      motivo?: string;
      notas: Record<string, number>;
      nota_final: number;
      pontos_fortes: string[];
      pontos_melhoria: string[];
      versao_corrigida: string;
      parecer: string;
    }>(raw);

    if (result.ilegivel) {
      return NextResponse.json({ ilegivel: true, motivo: result.motivo ?? "Imagem ilegível" }, { status: 422 });
    }

    return NextResponse.json({ ...result, criterios: CRITERIOS });
  } catch (e) {
    console.error("[redacao/avaliar]", e);
    return NextResponse.json({ error: `Erro ao avaliar redação: ${(e as Error).message}` }, { status: 500 });
  }
}
