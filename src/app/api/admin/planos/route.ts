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

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  const { data } = await db.from("Plan").select("*").order("price");
  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const body = await req.json();
  const { name, slug, price, intervalDays, aiCreditsPerWeek, maxAgents, features, active } = body;

  if (!name || !slug || price == null) {
    return NextResponse.json({ error: "name, slug e price são obrigatórios" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const { data, error } = await db.from("Plan").insert({
    id: crypto.randomUUID(),
    name,
    slug,
    price: Number(price),
    intervalDays: intervalDays ?? 30,
    aiCreditsPerWeek: aiCreditsPerWeek ?? 10,
    maxAgents: maxAgents ?? 1,
    features: features ?? [],
    active: active ?? true,
    createdAt: now,
  }).select().single();

  if (error) return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(req: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const body = await req.json() as Record<string, unknown>;
  const { id } = body;
  if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });

  const ALLOWED = ["name", "slug", "price", "intervalDays", "aiCreditsPerWeek", "maxAgents", "features", "active"];
  const updates: Record<string, unknown> = {};
  for (const key of ALLOWED) {
    if (key in body) updates[key] = body[key];
  }
  if (typeof updates.price === "number") updates.price = Number(updates.price);

  const { data, error } = await db.from("Plan").update(updates).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { id, permanent } = await req.json();
  if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });

  if (permanent) {
    // Verifica se há assinaturas vinculadas antes de deletar
    const { count } = await db.from("Subscription").select("id", { count: "exact", head: true }).eq("planId", id);
    if ((count ?? 0) > 0) {
      return NextResponse.json({
        error: `Não é possível excluir: existem ${count} assinatura(s) vinculadas a este plano. Desative-o ao invés de excluir.`
      }, { status: 409 });
    }
    const { error } = await db.from("Plan").delete().eq("id", id);
    if (error) return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    return NextResponse.json({ ok: true, deleted: true });
  }

  // Soft delete (desativar) — comportamento padrão
  const { error } = await db.from("Plan").update({ active: false }).eq("id", id);
  if (error) return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  return NextResponse.json({ ok: true, deleted: false });
}
