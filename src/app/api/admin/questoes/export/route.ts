import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await db.from("User").select("role").eq("supabaseId", user.id).single();
  return data?.role === "ADMIN" ? user : null;
}

function escapeCsv(val: unknown): string {
  if (val === null || val === undefined) return "";
  const s = String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * GET /api/admin/questoes/export
 * Exporta todas as questões como CSV para backup/edição externa.
 * Filtros: ?subjectId=xxx&banca=xxx
 */
export async function GET(req: Request) {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const subjectId = searchParams.get("subjectId");
  const banca     = searchParams.get("banca");

  let query = db
    .from("Question")
    .select("id, subjectId, banca, year, level, statement, optionA, optionB, optionC, optionD, optionE, answer, explanation")
    .order("id");

  if (subjectId) query = query.eq("subjectId", subjectId);
  if (banca)     query = query.ilike("banca", `%${banca}%`);

  const { data: questions, error } = await query;
  if (error) return NextResponse.json({ error: "Erro interno" }, { status: 500 });

  // Busca nomes de matérias
  const subjectIds = [...new Set((questions ?? []).map(q => q.subjectId).filter(Boolean))];
  const { data: subjects } = subjectIds.length
    ? await db.from("Subject").select("id, name").in("id", subjectIds as string[])
    : { data: [] };
  const subjectMap: Record<string, string> = {};
  for (const s of subjects ?? []) subjectMap[s.id] = s.name;

  const header = ["id","subjectId","subjectName","banca","year","level","statement","A","B","C","D","E","answer","explanation"];
  const rows = (questions ?? []).map(q => [
    q.id,
    q.subjectId ?? "",
    subjectMap[q.subjectId ?? ""] ?? "",
    q.banca ?? "",
    q.year ?? "",
    q.level ?? "",
    q.statement ?? "",
    q.optionA ?? "",
    q.optionB ?? "",
    q.optionC ?? "",
    q.optionD ?? "",
    q.optionE ?? "",
    q.answer ?? "",
    q.explanation ?? "",
  ].map(escapeCsv).join(","));

  const csv = [header.join(","), ...rows].join("\n");
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="questoes-${date}.csv"`,
    },
  });
}
