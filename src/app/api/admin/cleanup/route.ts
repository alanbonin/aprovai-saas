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

/**
 * POST /api/admin/cleanup
 * Limpa dados de teste antes do lançamento em produção.
 * Operações:
 *   - cancelar_subs_teste: cancela assinaturas ACTIVE de planos pagos sem mpPaymentId
 *   - limpar_ai_uso: remove registros de AiUsage (zerado para lançamento)
 *   - limpar_reportes: remove todos os reportes de questões
 */
export async function POST(req: Request) {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const { operacao } = await req.json() as { operacao: string };
  const now = new Date().toISOString();
  const results: Record<string, unknown> = {};

  if (operacao === "cancelar_subs_teste") {
    // Encontra planos com price > 0
    const { data: paidPlans } = await db.from("Plan").select("id").gt("price", 0);
    const paidPlanIds = (paidPlans ?? []).map(p => p.id as string);

    if (paidPlanIds.length > 0) {
      const { data, error } = await db
        .from("Subscription")
        .update({ status: "CANCELLED", endDate: now, updatedAt: now })
        .is("mpPaymentId", null)
        .eq("status", "ACTIVE")
        .in("planId", paidPlanIds)
        .select("id");

      if (error) return NextResponse.json({ error: "Erro ao cancelar assinaturas" }, { status: 500 });
      results.canceladas = data?.length ?? 0;
    } else {
      results.canceladas = 0;
    }
  }

  else if (operacao === "limpar_ai_uso") {
    const { error } = await db.from("AiUsage").delete().neq("id", "__NEVER__");
    if (error) return NextResponse.json({ error: "Erro ao limpar uso de IA" }, { status: 500 });
    results.removidos = "todos os registros de AiUsage";
  }

  else if (operacao === "limpar_reportes") {
    const { data, error } = await db
      .from("Note")
      .delete()
      .like("subjectId", "__REPORTE_QUESTAO__%")
      .select("id");
    if (error) return NextResponse.json({ error: "Erro ao limpar reportes" }, { status: 500 });
    results.removidos = data?.length ?? 0;
  }

  else {
    return NextResponse.json({ error: "Operação inválida" }, { status: 400 });
  }

  return NextResponse.json({ ok: true, operacao, results });
}
