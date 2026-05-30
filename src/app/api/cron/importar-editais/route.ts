import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createWithCache, MODELS, extractJSON } from "@/lib/anthropic";
import { log, LogEvent } from "@/lib/logger";

/**
 * GET /api/cron/importar-editais
 * Cron diário às 9h UTC: busca novos concursos no Querido Diário e importa automaticamente.
 */

function checkAuth(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

// Termos de busca rotacionados por dia da semana para cobrir mais editais
const TERMOS_POR_DIA: string[][] = [
  ["concurso público edital inscrições 2026"],        // Dom
  ["processo seletivo vagas nível superior 2026"],     // Seg
  ["concurso público resultado gabarito 2026"],        // Ter
  ["edital abertura inscrições concurso municipal"],   // Qua
  ["concurso estadual vagas salário edital 2026"],     // Qui
  ["concurso federal auditor analista 2026"],          // Sex
  ["processo seletivo simplificado edital 2026"],      // Sáb
];

interface QDGazette {
  id: string;
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

async function buscarEImportar(termo: string): Promise<{ inseridos: number; ignorados: number; erros: string[] }> {
  const erros: string[] = [];
  let inseridos = 0;
  let ignorados = 0;

  try {
    // Busca no Querido Diário
    const qdUrl = new URL("https://queridodiario.ok.org.br/api/gazettes");
    qdUrl.searchParams.set("querystring", termo);
    qdUrl.searchParams.set("size", "8");
    qdUrl.searchParams.set("sort_by", "relevance");

    const qdRes = await fetch(qdUrl.toString(), {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(20000),
    });

    if (!qdRes.ok) {
      erros.push(`QD API ${qdRes.status} para "${termo}"`);
      return { inseridos, ignorados, erros };
    }

    const qdData = await qdRes.json() as { gazettes: QDGazette[] };
    const gazetas = qdData.gazettes ?? [];

    if (gazetas.length === 0) return { inseridos, ignorados, erros };

    // Extrai editais com Claude Haiku (mais barato para cron)
    const excerpts = gazetas
      .map((g, i) => `[${i + 1}] ${g.edition.date} | ${g.source.state_code} | ${g.source.name}\n${g.excerpt.slice(0, 600)}`)
      .join("\n\n---\n\n");

    const prompt = `Extraia concursos públicos destes trechos de Diário Oficial. Apenas concursos com edital publicado ou previsto — ignore avisos, recursos, homologações de concursos antigos.

${excerpts}

Retorne JSON: {"editais":[{"titulo":"...","orgao":"...","cargo":"...","area":"administrativa|ti|juridico|saude|policial|fiscal|educacao|engenharia|outros","vagas":null,"salario":null,"salarioMax":null,"banca":null,"estado":"sigla ou Federal","nivel":"federal|estadual|municipal","escolaridade":"fundamental|medio|tecnico|superior|pos","status":"previsto|aberto|encerrado","descricao":"1 frase","dataPublicacao":null,"dataInscricaoInicio":null,"dataInscricaoFim":null,"dataProva":null}]}

Se não houver concurso claro: {"editais":[]}`;

    const response = await createWithCache({
      model: MODELS.haiku,
      maxTokens: 2000,
      cacheSystem: false,
      systemPrompt: "Extrai dados de editais de concursos públicos. Responda apenas JSON.",
      messages: [{ role: "user", content: prompt }],
    });

    const raw = (response.content[0] as { type: string; text: string }).text;
    const result = extractJSON<{ editais: EditalExtraido[] }>(raw);
    const editais = result.editais ?? [];

    const now = new Date().toISOString();

    for (const edital of editais) {
      // Ignora se título/orgao vazio
      if (!edital.titulo || !edital.orgao || !edital.cargo) { ignorados++; continue; }

      const ref = `qd:${edital.orgao}:${edital.cargo}`.toLowerCase()
        .replace(/[^a-z0-9:_]/g, "_").slice(0, 200);

      // Checar duplicata
      const { data: existe } = await db.from("Edital").select("id").eq("sourceRef", ref).maybeSingle();
      if (existe) { ignorados++; continue; }

      const toStatus = (s?: string) =>
        ["aberto","encerrado","suspenso","resultado"].includes(s ?? "") ? s! : "previsto";

      const { error } = await db.from("Edital").insert({
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
        link:                null,
        editalUrl:           null,
        source:              "querido_diario",
        sourceRef:           ref,
        isPremium:           false,
        active:              true,
        createdAt:           now,
        updatedAt:           now,
      });

      if (error) erros.push(`Insert error: ${error.message}`);
      else inseridos++;
    }
  } catch (err) {
    erros.push(String(err));
  }

  return { inseridos, ignorados, erros };
}

export async function GET(req: Request) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const diaSemana = new Date().getDay(); // 0=Dom
  const termos = TERMOS_POR_DIA[diaSemana] ?? TERMOS_POR_DIA[0];

  let totalInseridos = 0;
  let totalIgnorados = 0;
  const todosErros: string[] = [];

  for (const termo of termos) {
    const r = await buscarEImportar(termo);
    totalInseridos += r.inseridos;
    totalIgnorados += r.ignorados;
    todosErros.push(...r.erros);
  }

  log.info(LogEvent.CRON_RUN, { job: "importar-editais", inseridos: totalInseridos, ignorados: totalIgnorados, erros: todosErros.length });

  return NextResponse.json({
    ok: true,
    inseridos: totalInseridos,
    ignorados: totalIgnorados,
    erros: todosErros.length > 0 ? todosErros : undefined,
  });
}
