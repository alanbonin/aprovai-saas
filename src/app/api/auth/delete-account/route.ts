import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { db } from "@/lib/db";
import { log, LogEvent } from "@/lib/logger";

/**
 * DELETE /api/auth/delete-account
 * LGPD Art. 18 — direito ao esquecimento.
 * Cancela assinatura, apaga dados pessoais e remove o usuário do Supabase Auth.
 * Não remove a linha de User para manter integridade referencial — apenas
 * cancela a Subscription e apaga dados pessoais vinculados.
 */
export async function DELETE(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const userId = user.id;
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  log.security(LogEvent.LGPD_DATA_EXPORT, {
    userId,
    dataType: "account_deletion",
    ip,
  });

  try {
    // 1. Cancelar assinatura
    await db
      .from("Subscription")
      .update({ status: "CANCELLED", updatedAt: new Date().toISOString() })
      .eq("userId", userId);

    // 2. Apagar progresso (histórico de questões)
    await db.from("Progress").delete().eq("userId", userId);

    // 3. Apagar notas
    await db.from("Note").delete().eq("userId", userId);

    // 4. Apagar perfil do aluno
    await db.from("StudentProfile").delete().eq("userId", userId);

    // 5. Deletar usuário do Supabase Auth via Admin API (service role)
    const adminUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
    const adminSupabase = createAdminClient(adminUrl, adminKey);
    const { error: deleteError } = await adminSupabase.auth.admin.deleteUser(userId);

    if (deleteError) {
      log.error(LogEvent.PAYMENT_FAILED, { stage: "delete_auth_user", userId }, deleteError);
      return NextResponse.json({ error: "Erro ao remover conta" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    log.error(LogEvent.PAYMENT_FAILED, { stage: "delete_account", userId }, err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
