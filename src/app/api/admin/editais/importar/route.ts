import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { createWithCache, MODELS, extractJSON } from "@/lib/anthropic";
import { log } from "@/lib/logger";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await db.from("User").select("role").eq("supabaseId", user.id).single();
  return data?.role === "ADMIN" ? user : null;
}

interface QDResult {
  id: string;
  source_text: string;
  excerpt: string;
  edition: { date: string; file_url: string };
  source: { name: string; state_code: string };
}

interface EditalExtraido {
  titulo: string;
  orgao: string;
  cargo: string;
  area?: string;
  vagas?: number;
  salario?: number;
  salarioMax?: number;
  banca?: string;
  estado?: string;
  nivel?: string;
  escolaridade?: string;
  status?: string;
  descricao?: string;
  dataPublicacao?: string;
  dataInscricaoInicio?: string;
  dataInscricaoFim?: string;
  dataProva?: string;
  link?: string;
}

// POST /api/admin/editais/importar
// body: { query?: string; queryTerms?: string[]; estados?: string[] }
export async function POST(req: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const body = await req.json() as {
    query?: string;
    queryTerms?: string[];
    estados?: string[];
    limite?: number;
  };

  const searchTerms = body.queryTerms ?? [
    "concurso público edital inscrições",
    "processo seletivo vagas",
    "concurso público resultado",
  ];
  const limite = Math.min(body.limite ?? 3, 5); // máximo 5 pesquisas por chamada

  const importados: EditalExtraido[] = [];
  const erros: string[] = [];
  let totalGazetas = 0;

  for (const termo of searchTerms.slice(0, limite)) {
    try {
      // Busca no Querido Diário
      const qdUrl = new URL("https://queridodiario.ok.org.br/api/gazettes");
      qdUrl.searchParams.set("querystring", body.query ?? termo);
      qdUrl.searchParams.set("size", "5");
      qdUrl.searchParams.set("sort_by", "relevance");
      if (body.estados?.length) {
        body.estados.forEach(e => qdUrl.searchParams.append("territory_ids", e));
      }

      const qdRes = await fetch(qdUrl.toString(), {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(15000),
      });

      if (!qdRes.ok) {
        erros.push(`QD API error ${qdRes.status} para "${termo}"`);
        continue;
      }

      const qdData = await qdRes.json() as { gazettes: QDResult[] };
      const gazetas = qdData.gazettes ?? [];
      totalGazetas += gazetas.length;

      if (gazetas.length === 0) continue;

      // Extrai editais com Claude
      const excerpts = gazetas
        .map((g, i) => `[${i + 1}] Data: ${g.edition.date} | Estado: ${g.source.state_code} | Fonte: ${g.source.name}\n${g.excerpt.slice(0, 800)}`)
        .join("\n\n---\n\n");

      const prompt = `Analise os trechos de Diário Oficial abaixo e extraia TODOS os concursos públicos mencionados.
Para cada concurso, retorne um objeto no array. Se não houver concurso claro, retorne array vazio.

TRECHOS:
${excerpts}

Regras de extração:
- titulo: nome do concurso (ex: "Concurso Público TJSP 2025")
- orgao: órgão/empresa realizadora (ex: "Tribunal de Justiça de SP")
- cargo: cargos principais separados por vírgula
- area: uma de [administrativa, ti, juridico, saude, policial, fiscal, educacao, engenharia, outros]
- vagas: número total de vagas (null se não mencionado)
- salario: valor mínimo em R$ (null se não mencionado)
- salarioMax: valor máximo em R$ (null se não mencionado)
- banca: organizadora (CESPE, FGV, VUNESP, etc.) ou null
- estado: sigla do estado (SP, RJ, etc.) ou "Federal" para federais
- nivel: "federal", "estadual" ou "municipal"
- escolaridade: "fundamental", "medio", "tecnico", "superior", "pos" (nível mínimo) ou null
- status: "previsto", "aberto", "encerrado" (baseado na data de inscrição)
- descricao: resumo em 1-2 frases
- dataPublicacao: ISO date (YYYY-MM-DD) ou null
- dataInscricaoInicio: ISO date ou null
- dataInscricaoFim: ISO date ou null
- dataProva: ISO date ou null

Retorne APENAS JSON: {"editais": [...]}`;

      const response = await createWithCache({
        model: MODELS.haiku,
        maxTokens: 2000,
        cacheSystem: false,
        systemPrompt: "Você extrai dados estruturados de editais de concursos públicos de Diários Oficiais. Responda apenas com JSON.",
        messages: [{ role: "user", content: prompt }],
      });

      const raw = (response.content[0] as { type: string; text: string }).text;
      const result = extractJSON<{ editais: EditalExtraido[] }>(raw);
      importados.push(...(result.editais ?? []));
    } catch (err) {
      log.error("admin.editais_import_error", { termo }, err);
      erros.push(`Erro ao processar "${termo}". Verifique os logs.`);
    }
  }

  if (importados.length === 0) {
    return NextResponse.json({
      ok: false,
      message: `Nenhum edital encontrado em ${totalGazetas} gazetas analisadas.`,
      erros,
    });
  }

  // Insere no banco (ignora duplicatas por sourceRef)
  const now = new Date().toISOString();
  let inseridos = 0;
  const jaExistentes: string[] = [];

  for (const edital of importados) {
    const ref = `qd:${edital.orgao}:${edital.cargo}`.toLowerCase().replace(/\s+/g, "_").slice(0, 200);

    // Checar duplicata por sourceRef
    const { data: existe } = await db
      .from("Edital")
      .select("id")
      .eq("sourceRef", ref)
      .maybeSingle();

    if (existe) {
      jaExistentes.push(edital.titulo);
      continue;
    }

    const toStatus = (s?: string): string => {
      if (s === "aberto" || s === "encerrado" || s === "suspenso" || s === "resultado") return s;
      return "previsto";
    };

    await db.from("Edital").insert({
      id:                  crypto.randomUUID(),
      titulo:              edital.titulo,
      orgao:               edital.orgao,
      cargo:               edital.cargo,
      area:                edital.area ?? null,
      vagas:               edital.vagas ?? null,
      salario:             edital.salario ?? null,
      salarioMax:          edital.salarioMax ?? null,
      banca:               edital.banca ?? null,
      estado:              edital.estado ?? null,
      nivel:               edital.nivel ?? "estadual",
      escolaridade:        edital.escolaridade ?? null,
      status:              toStatus(edital.status),
      descricao:           edital.descricao ?? null,
      dataPublicacao:      edital.dataPublicacao ?? null,
      dataInscricaoInicio: edital.dataInscricaoInicio ?? null,
      dataInscricaoFim:    edital.dataInscricaoFim ?? null,
      dataProva:           edital.dataProva ?? null,
      link:                edital.link ?? null,
      editalUrl:           null,
      source:              "querido_diario",
      sourceRef:           ref,
      isPremium:           false,
      active:              true,
      createdAt:           now,
      updatedAt:           now,
    });
    inseridos++;
  }

  return NextResponse.json({
    ok: true,
    inseridos,
    jaExistentes: jaExistentes.length,
    totalGazetas,
    erros: erros.length > 0 ? erros : undefined,
    message: `${inseridos} editais importados. ${jaExistentes.length} duplicatas ignoradas.`,
  });
}
