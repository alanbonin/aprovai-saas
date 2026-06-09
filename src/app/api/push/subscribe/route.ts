import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan, db } from "@/lib/db";
import { pushSubscribeLimiter } from "@/lib/rate-limit";

const PREFIX = "__PUSH_SUBSCRIPTION__";

// ── GET — retorna chave pública VAPID para o cliente ─────────────────────────
export async function GET() {
  return NextResponse.json({
    publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "",
  });
}

// ── POST — salva subscription do browser ─────────────────────────────────────
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  // Rate limit — previne flood de subscriptions no banco (tabela Note)
  const rl = await pushSubscribeLimiter.check(user.id);
  if (!rl.ok) {
    return NextResponse.json({ error: rl.error }, { status: 429 });
  }

  const body = await req.json() as { subscription: PushSubscriptionJSON };
  const { subscription } = body;

  if (!subscription?.endpoint) {
    return NextResponse.json({ error: "Subscription inválida" }, { status: 400 });
  }

  const content = JSON.stringify(subscription);

  // Verifica se já existe esta subscription (pelo endpoint)
  const safeSuffix = subscription.endpoint.slice(-40).replace(/%/g, "\\%").replace(/_/g, "\\_");
  const { data: existing } = await db
    .from("Note")
    .select("id")
    .eq("userId", dbUser.id)
    .eq("subjectId", PREFIX)
    .like("content", `%${safeSuffix}%`)
    .limit(1)
    .maybeSingle();

  if (existing) {
    // Atualiza (pode ter chaves rotacionadas)
    await db.from("Note").update({
      content,
      updatedAt: new Date().toISOString(),
    }).eq("id", existing.id);
  } else {
    // Cria nova
    await db.from("Note").insert({
      id:        crypto.randomUUID(),
      userId:    dbUser.id,
      subjectId: PREFIX,
      content,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  return NextResponse.json({ ok: true });
}

// ── DELETE — remove subscription ─────────────────────────────────────────────
export async function DELETE(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const { endpoint } = await req.json() as { endpoint: string };
  if (!endpoint) return NextResponse.json({ error: "endpoint obrigatório" }, { status: 400 });

  const suffix = endpoint.slice(-40).replace(/%/g, "\\%").replace(/_/g, "\\_");
  await db
    .from("Note")
    .delete()
    .eq("userId", dbUser.id)
    .eq("subjectId", PREFIX)
    .like("content", `%${suffix}%`);

  return NextResponse.json({ ok: true });
}
