import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { CATEGORIAS } from "@/lib/agents";

// ── Reatribuição de mentores (mesma lógica do onboarding) ─────────────────────
function normalize(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

const AREA_KEYWORDS: Record<string, string[]> = {
  policial:      ["polici", "delegad", "agente de", "investigad", "depen", "pcdf", "pcsp"],
  tributario:    ["tribut", "auditor", "fiscal", "receita", "financ", "sefaz"],
  judiciario:    ["judici", "analista judici", "tecnico judici", "trf", "tre", "tse", "tj"],
  legislativo:   ["camara", "senado", "legislat", "assembleia", "vereador"],
  mp:            ["ministerio publico", "promotor", "mpf", "mpsp"],
  procuradoria:  ["procuradoria", "procurador", "agu", "pge", "pgm"],
  militar:       ["militar", "exerc", "marinha", "aeronaut", "bombeiro"],
  saude:         ["saude", "enfermeiro", "medico", "sus", "anvisa"],
  bancario:      ["banco", "caixa economica", "banco central", "bacen"],
  gestao:        ["gestao", "administrat", "assistente administrat"],
};

function detectArea(cargo: string, orgao: string): string {
  const text = normalize(`${cargo} ${orgao}`);
  for (const [area, keywords] of Object.entries(AREA_KEYWORDS)) {
    if (keywords.some(k => text.includes(k))) return area;
  }
  return "geral";
}

interface AgentRow { id: string; name: string; categoria: string | null; banca: string | null }

async function reassignAgents(userId: string, cargo: string, orgao: string) {
  const { data: allAgents } = await db.from("Agent").select("id, name, categoria, banca").eq("active", true);
  if (!allAgents || allAgents.length === 0) return;

  const area = detectArea(cargo, orgao);

  // Encontra a categoria do agente que bate com a área
  const categoriaId = CATEGORIAS.find(c => {
    const cid = c.id.toLowerCase();
    if (area === "policial"     && cid.includes("policial")) return true;
    if (area === "tributario"   && cid.includes("tribut")) return true;
    if (area === "judiciario"   && cid.includes("judici")) return true;
    if (area === "legislativo"  && cid.includes("legislat")) return true;
    if (area === "mp"           && cid.includes("ministerio")) return true;
    if (area === "procuradoria" && cid.includes("procurador")) return true;
    if (area === "saude"        && cid.includes("saude")) return true;
    if (area === "bancario"     && cid.includes("banco")) return true;
    if (area === "gestao"       && cid.includes("gestao")) return true;
    return false;
  })?.id ?? null;

  const agentRows = allAgents as AgentRow[];
  const areaAgent = agentRows.find(a => a.categoria === categoriaId);
  const ids: string[] = [...new Set([areaAgent?.id].filter(Boolean))] as string[];
  if (ids.length === 0) ids.push(agentRows[0].id); // fallback: primeiro agente disponível

  await db.from("UserAgent").delete().eq("userId", userId);
  for (const agentId of ids) {
    await db.from("UserAgent").insert({
      id: crypto.randomUUID(), userId, agentId, createdAt: new Date().toISOString(),
    });
  }
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { data: dbUser } = await db.from("User").select("id").eq("supabaseId", user.id).single();
  if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const { data: profile } = await db
    .from("StudentProfile")
    .select("cargo, orgao, dataProva, dificuldades, onboardingDone")
    .eq("userId", dbUser.id)
    .single();

  return NextResponse.json(profile ?? {});
}

export async function PATCH(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const { data: dbUser } = await db.from("User").select("id").eq("supabaseId", user.id).single();
    if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

    const body = await req.json();
    const { cargo, orgao, dataProva, dificuldades } = body as {
      cargo?: string; orgao?: string; dataProva?: string | null; dificuldades?: string;
    };

    // Valida dataProva
    function sanitizeDate(val: unknown): string | null {
      if (!val || typeof val !== "string") return null;
      const trimmed = val.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        const d = new Date(trimmed);
        return isNaN(d.getTime()) ? null : trimmed;
      }
      return null;
    }

    const { data: existing } = await db
      .from("StudentProfile")
      .select("id")
      .eq("userId", dbUser.id)
      .limit(1);

    const fields = {
      cargo: cargo ?? null,
      orgao: orgao ?? null,
      dataProva: sanitizeDate(dataProva),
      dificuldades: dificuldades ?? null,
      updatedAt: new Date().toISOString(),
    };

    if (existing && existing.length > 0) {
      const { error } = await db.from("StudentProfile").update(fields).eq("id", existing[0].id);
      if (error) return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    } else {
      const { error } = await db.from("StudentProfile").insert({
        id: crypto.randomUUID(),
        userId: dbUser.id,
        onboardingDone: false,
        createdAt: new Date().toISOString(),
        ...fields,
      });
      if (error) return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }

    // Reatribui mentores quando cargo/órgão mudam
    if (cargo && orgao) {
      await reassignAgents(dbUser.id, cargo, orgao);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
