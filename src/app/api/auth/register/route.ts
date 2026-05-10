import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  const { name, email, supabaseId } = await req.json();
  if (!name || !email || !supabaseId) {
    return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
  }

  const { data, error } = await db.from("User").upsert(
    { supabaseId, name, email, role: "STUDENT", updatedAt: new Date().toISOString() },
    { onConflict: "supabaseId" }
  ).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, userId: data.id });
}
