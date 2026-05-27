import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { log, LogEvent } from "@/lib/logger";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await db.from("User").select("id, role").eq("supabaseId", user.id).single();
  return data?.role === "ADMIN" ? data : null;
}

function escapeCsv(val: string | number | null | undefined): string {
  const s = String(val ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * GET /api/admin/alunos/export
 * Exporta alunos como CSV com plano, questões respondidas e taxa de acerto.
 *
 * LGPD: log obrigatório — exportação massiva de dados pessoais por admin.
 */
export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  // LGPD — exportação massiva de dados pessoais (art. 37, ANPD)
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  log.security(LogEvent.ADMIN_EXPORT, {
    adminId: admin.id,
    dataType: "users_full_list",
    format: "csv",
    ip,
  });

  // Busca todos os usuários com assinaturas e planos
  const { data: users } = await db
    .from("User")
    .select("id, name, email, role, createdAt")
    .order("createdAt", { ascending: false });

  if (!users?.length) {
    return new Response("name,email,role,plano,questoes,acerto,cadastro\n", {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="alunos.csv"',
      },
    });
  }

  const userIds = users.map(u => u.id);

  // Assinaturas ativas
  const { data: subscriptions } = await db
    .from("Subscription")
    .select("userId, planId, Plan:planId(name)")
    .in("userId", userIds)
    .eq("status", "ACTIVE");

  const planByUser: Record<string, string> = {};
  for (const sub of subscriptions ?? []) {
    const planName = Array.isArray(sub.Plan) ? sub.Plan[0]?.name : (sub.Plan as { name?: string } | null)?.name;
    if (planName) planByUser[sub.userId] = planName;
  }

  // Progresso por usuário
  const { data: progresso } = await db
    .from("Progress")
    .select("userId, correct")
    .in("userId", userIds);

  const statsByUser: Record<string, { total: number; correct: number }> = {};
  for (const p of progresso ?? []) {
    if (!statsByUser[p.userId]) statsByUser[p.userId] = { total: 0, correct: 0 };
    statsByUser[p.userId].total++;
    if (p.correct) statsByUser[p.userId].correct++;
  }

  const headers = ["Nome", "Email", "Perfil", "Plano", "Questões", "Acerto (%)", "Cadastrado em"];
  const rows = users.map(u => {
    const stats = statsByUser[u.id];
    const total   = stats?.total ?? 0;
    const correct = stats?.correct ?? 0;
    const acc     = total > 0 ? Math.round((correct / total) * 100) : 0;
    return [
      escapeCsv(u.name),
      escapeCsv(u.email),
      escapeCsv(u.role === "ADMIN" ? "Admin" : "Aluno"),
      escapeCsv(planByUser[u.id] ?? "Gratuito"),
      total,
      total > 0 ? `${acc}%` : "—",
      escapeCsv(new Date(u.createdAt ?? "").toLocaleDateString("pt-BR")),
    ].join(",");
  });

  const csv = [headers.join(","), ...rows].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="alunos.csv"',
    },
  });
}
