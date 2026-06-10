import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan, db } from "@/lib/db";
import { log, LogEvent } from "@/lib/logger";
import { adminExportLimiter } from "@/lib/rate-limit";

/**
 * GET /api/relatorio/export
 * Exporta o histórico completo de progresso do aluno como CSV.
 *
 * Colunas: data, materia, banca, ano, nivel, correto, nextReview
 *
 * LGPD: log obrigatório — exportação de dados pessoais do titular.
 */
export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  // Rate limit — export é query pesada (5/hora por usuário)
  const rl = await adminExportLimiter.check(user.id);
  if (!rl.ok) return NextResponse.json({ error: rl.error }, { status: 429 });

  // LGPD art. 37 — registro de operações de tratamento de dados pessoais
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  log.security(LogEvent.LGPD_DATA_EXPORT, {
    userId: dbUser.id,
    dataType: "progress_history",
    format: "csv",
    ip,
  });

  // Fetch all progress records — cap: 12 meses / 10k registros para proteger o banco
  const since = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
  const { data: progress, error } = await db
    .from("Progress")
    .select("questionId, correct, createdAt, nextReview")
    .eq("userId", dbUser.id)
    .gte("createdAt", since)
    .order("createdAt", { ascending: false })
    .limit(10_000);

  if (error) return NextResponse.json({ error: "Erro interno" }, { status: 500 });

  const rows = progress ?? [];

  // Batch-fetch questions
  const qIds = [...new Set(rows.map(r => r.questionId as number))];
  const questionMap: Record<number, { subjectId: string | null; banca: string | null; year: number | null; level: string }> = {};

  for (let i = 0; i < qIds.length; i += 500) {
    const { data: qs } = await db
      .from("Question")
      .select("id, subjectId, banca, year, level")
      .in("id", qIds.slice(i, i + 500));
    for (const q of qs ?? []) {
      questionMap[q.id] = { subjectId: q.subjectId, banca: q.banca, year: q.year, level: q.level };
    }
  }

  // Collect unique subject IDs and fetch names
  const subjectIds = [...new Set(Object.values(questionMap).map(q => q.subjectId).filter(Boolean) as string[])];
  const subjectMap: Record<string, string> = {};
  if (subjectIds.length > 0) {
    const { data: subjects } = await db.from("Subject").select("id, name").in("id", subjectIds);
    for (const s of subjects ?? []) subjectMap[s.id] = s.name;
  }

  // Build CSV
  const header = ["data", "materia", "banca", "ano", "nivel", "correto", "proxima_revisao"];
  const csvLines: string[] = [header.join(";")];

  for (const row of rows) {
    const q = questionMap[row.questionId as number];
    const levelMap: Record<string, string> = { facil: "Fácil", medio: "Médio", dificil: "Difícil" };
    const cols = [
      new Date(row.createdAt as string).toLocaleDateString("pt-BR"),
      q?.subjectId ? (subjectMap[q.subjectId] ?? q.subjectId) : "",
      q?.banca ?? "",
      q?.year?.toString() ?? "",
      levelMap[q?.level ?? ""] ?? (q?.level ?? ""),
      (row.correct as boolean) ? "Sim" : "Não",
      row.nextReview ? new Date(row.nextReview as string).toLocaleDateString("pt-BR") : "",
    ];
    csvLines.push(cols.map(c => `"${String(c).replace(/"/g, '""')}"`).join(";"));
  }

  const csv = "﻿" + csvLines.join("\n"); // BOM for Excel UTF-8 compatibility
  const filename = `relatorio-aprovai-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
