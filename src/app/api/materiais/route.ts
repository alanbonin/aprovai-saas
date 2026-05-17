import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan, db } from "@/lib/db";

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const banca = searchParams.get("banca");
  const subjectId = searchParams.get("subjectId");

  let query = db.from("Material").select("*").eq("active", true).order("createdAt", { ascending: false });
  if (type) query = query.eq("type", type);
  if (banca) query = query.eq("banca", banca);
  if (subjectId) query = query.eq("subjectId", subjectId);

  // Gratuito só vê não-premium; pagante vê tudo
  const isPaid = !!dbUser.subscription;
  if (!isPaid) query = query.eq("isPremium", false);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ materials: data ?? [] });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser || dbUser.role !== "ADMIN") {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const body = await req.json();
  const { data, error } = await db.from("Material").insert(body).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
