import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { createWithCache, MODELS, extractJSON } from "@/lib/anthropic";
import type { MessageParam, ImageBlockParam, TextBlockParam } from "@anthropic-ai/sdk/resources";
import { log } from "@/lib/logger";
import { defaultAiLimiter } from "@/lib/rate-limit";

const REDACAO_SYSTEM =
  "Você é um especialista em Redação Oficial Brasileira e avaliador de concursos públicos, com profundo conhecimento do Manual de Redação da Presidência da República e das normas técnicas de cada área. Responda apenas com JSON válido.";

async function getProfile(supabaseId: string) {
  const { data: dbUser } = await db.from("User").select("id").eq("supabaseId", supabaseId).single();
  if (!dbUser) return null;
  const { getActiveProfile } = await import("@/lib/get-active-profile");
  const profile = await getActiveProfile(dbUser.id);
  return profile ? { cargo: profile.cargo, orgao: profile.orgao } : null;
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
  { id: "dissertacao",      label: "Dissertação",          desc: "Texto argumentativo com tese e desenvolvimento" },
  { id: "argumentacao",     label: "Argumentação",         desc: "Defesa de ponto de vista com argumentos" },
  { id: "oficio",           label: "Ofício",               desc: "Comunicação oficial entre órgãos" },
  { id: "memorando",        label: "Memorando",            desc: "Comunicação interna entre setores" },
  { id: "relatorio",        label: "Relatório",            desc: "Relatório técnico ou administrativo" },
  { id: "requerimento",     label: "Requerimento",         desc: "Pedido formal dirigido a autoridade" },
  { id: "portaria",         label: "Portaria",             desc: "Ato normativo interno de autoridade" },
  { id: "despacho",         label: "Despacho",             desc: "Decisão em processo administrativo" },
];

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  // Rate limit de burst — 10 req/min por usuário
  const rl = await defaultAiLimiter.check(user.id);
  if (!rl.ok) return NextResponse.json({ error: rl.error }, { status: 429 });

  const { getAccessLevel } = await import("@/lib/access");
  const access = await getAccessLevel();
  if (access.maxRedacoesPerWeek === 0) {
    return NextResponse.json({ error: "Recurso não disponível no seu plano. Faça upgrade para acessar Redação." }, { status: 403 });
  }

  // Verificar limite semanal real (se não for ilimitado)
  if (access.maxRedacoesPerWeek > 0) {
    const { getWeeklyResourceUsage, incrementWeeklyResourceUsage } = await import("@/lib/api-utils");
    const { db: dbClient } = await import("@/lib/db");
    const { data: dbUserRow } = await dbClient.from("User").select("id").eq("supabaseId", user.id).single();
    if (dbUserRow) {
      const body0 = await req.clone().json().catch(() => ({}));
      // Só conta na ação de corrigir (não em sugerir_tipos ou gerar_tema)
      if (!body0.action || body0.action === "corrigir") {
        const usedThisWeek = await getWeeklyResourceUsage(dbUserRow.id, "redacao");
        if (usedThisWeek >= access.maxRedacoesPerWeek) {
          return NextResponse.json({ error: `Você atingiu o limite de ${access.maxRedacoesPerWeek} redações por semana do seu plano.` }, { status: 403 });
        }
        await incrementWeeklyResourceUsage(dbUserRow.id, "redacao");
      }
    }
  }

  const body = await req.json() as {
    action?: string;
    tipo?: string;
    tema?: string;
    texto?: string;
    fotoBase64?: string;
    fotoType?: string;
    cargo?: string; // contexto extra opcional
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

    const prompt = `Liste os 8 tipos de redação/documento mais relevantes para o cargo: ${perfilDesc}

REGRAS OBRIGATÓRIAS:
1. SEMPRE inclua pelo menos 2 tipos dissertativos/argumentativos (cobrados em todas as bancas):
   - Dissertação Argumentativa (CESPE, VUNESP, FCC, FGV — quase universal)
   - Texto Argumentativo / Redação Discursiva
2. Inclua os tipos de redação oficial específicos do cargo:
   - Policial/Segurança Pública: auto de prisão, boletim de ocorrência, relatório de inteligência, ofício, portaria
   - TI/Tecnologia: nota técnica, termo de referência, memorando técnico, relatório de incidente, plano de trabalho
   - Bancário/Financeiro: parecer técnico, relatório de compliance, ofício, memorando, relatório de auditoria
   - Saúde/Revalida: relatório técnico, nota informativa, ofício sanitário, memorando, portaria
   - Jurídico/OAB: petição inicial, peça processual, ofício, memorando, despacho, parecer jurídico
   - Administrativo/Geral: ofício, memorando, relatório, requerimento, portaria, despacho
   - Judiciário (Analista/Técnico): dissertação argumentativa, nota técnica, ofício, memorando, despacho, relatório
3. "desc" deve ser frase curtíssima (máx. 5 palavras)
4. id deve ser slug simples (sem acentos, hífen para espaços)

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
      log.error("ai.redacao_sugerir_tipos_error", {}, e);
      return NextResponse.json({ tipos: TIPOS_GENERICOS });
    }
  }

  // ── Gerar tema via IA para o tipo/cargo do aluno ────────────────────────────
  if (body.action === "gerar_tema") {
    const profile = await getProfile(user.id);
    const cargo = profile?.cargo ?? "";
    const orgao = profile?.orgao ?? "";
    const tipoDoc = body.tipo ?? "dissertacao";

    const perfilDesc = cargo ? `${cargo}${orgao ? ` (${orgao})` : ""}` : "servidor público em geral";

    const prompt = `Gere 3 temas/situações para redação do tipo "${tipoDoc}" adequados para o concurso de ${perfilDesc}.

Regras:
- Temas devem ser realistas e compatíveis com as atribuições do cargo
- Para dissertação/argumentação: tema de relevância pública, contemporâneo, com foco nas políticas/problemas da área
- Para redação oficial (ofício, memorando, relatório etc.): situação funcional real e específica do cargo
- Cada tema deve ser curto (1-2 frases), direto e estimulante
- Varie o grau de dificuldade: 1 fácil, 1 médio, 1 difícil

Retorne APENAS JSON válido:
{"temas":["Tema 1 completo aqui","Tema 2 completo aqui","Tema 3 completo aqui"]}`;

    try {
      const msg = await createWithCache({
        model: MODELS.haiku, maxTokens: 400, systemPrompt: REDACAO_SYSTEM, cacheSystem: false,
        messages: [{ role: "user", content: prompt }],
      });
      const raw = (msg.content[0] as { type: string; text: string }).text.trim();
      const parsed = extractJSON<{ temas: string[] }>(raw);
      return NextResponse.json({ temas: parsed.temas ?? [] });
    } catch (e) {
      log.error("ai.redacao_gerar_tema_error", {}, e);
      return NextResponse.json({ temas: [] });
    }
  }

  // ── Avaliar redação (texto digitado ou foto manuscrita) ──────────────────────
  const { tipo, tema, texto, fotoBase64, fotoType } = body;

  if (!tipo) return NextResponse.json({ error: "tipo é obrigatório" }, { status: 400 });
  if (!texto?.trim() && !fotoBase64) {
    return NextResponse.json({ error: "texto ou foto são obrigatórios" }, { status: 400 });
  }

  const ALLOWED_IMG_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  const MAX_IMAGE_B64 = 6_800_000; // ~5 MB decoded
  if (fotoBase64) {
    if (fotoBase64.length > MAX_IMAGE_B64) {
      return NextResponse.json({ error: "Imagem muito grande (máx. 5 MB)" }, { status: 400 });
    }
    if (!fotoType || !ALLOWED_IMG_TYPES.includes(fotoType)) {
      return NextResponse.json({ error: "Formato de imagem inválido ou não informado" }, { status: 400 });
    }
  }

  const profile = await getProfile(user.id);
  const cargoRaw = profile?.cargo ?? "";
  const cargoSanitized = cargoRaw
    .replace(/[\x00-\x1F\x7F-\x9F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
  const cargoLine = cargoSanitized ? `\nCargo do candidato: ${cargoSanitized}` : "";

  // Critérios adaptados ao tipo de redação
  const tiposDissertativo = ["dissertacao", "argumentacao", "redacao-discursiva", "texto-argumentativo", "dissertativa"];
  const isDissertativo = tiposDissertativo.some(t => tipo?.toLowerCase().includes(t.replace("-", "")));

  const CRITERIOS = isDissertativo ? [
    "Estrutura dissertativa (introdução, desenvolvimento, conclusão)",
    "Argumentação e fundamentação das ideias",
    "Correção gramatical e ortográfica",
    "Coerência e coesão textual",
    "Repertório sociocultural e proposta de intervenção",
  ] : [
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
      { type: "text", text: `DOCUMENTO SUBMETIDO:\nTipo: ${tipo}${tema ? `\nTema/Contexto: ${tema}` : ""}\n\nTEXTO DO ALUNO:\n"""\n${(texto ?? "").slice(0, 6000)}\n"""\n${instrucoes}` } as TextBlockParam,
    ];
  }

  const messages: MessageParam[] = [{ role: "user", content: parts }];

  try {
    let msg;
    try {
      msg = await createWithCache({
        model: MODELS.haiku, maxTokens: 5000, systemPrompt: REDACAO_SYSTEM, cacheSystem: false,
        messages,
      });
    } catch (haikuErr) {
      log.warn("ai.redacao_haiku_fallback", {}, haikuErr);
      msg = await createWithCache({
        model: MODELS.sonnet, maxTokens: 5000, systemPrompt: REDACAO_SYSTEM, cacheSystem: false,
        messages,
      });
    }
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
    const errMsg = (e as Error)?.message ?? "desconhecido";
    log.error("ai.redacao_avaliar_error", { errMsg }, e);
    return NextResponse.json({ error: `Erro ao corrigir: ${errMsg}` }, { status: 500 });
  }
}
