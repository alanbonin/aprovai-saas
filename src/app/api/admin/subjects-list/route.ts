import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

// GET /api/admin/subjects-list — lista matérias (requer autenticação)
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { data } = await db.from("Subject").select("id, name, categoria").order("categoria").order("name");
  return NextResponse.json(data ?? []);
}
