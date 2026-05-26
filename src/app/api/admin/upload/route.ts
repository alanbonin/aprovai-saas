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

export async function POST(req: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Nenhum arquivo" }, { status: 400 });

  const ext = file.name.split(".").pop()?.toLowerCase();
  const allowed = ["pdf", "png", "jpg", "jpeg", "mp4", "webm"];
  if (!ext || !allowed.includes(ext)) {
    return NextResponse.json({ error: "Tipo de arquivo não permitido" }, { status: 400 });
  }

  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const bytes = await file.arrayBuffer();

  const { data, error } = await db.storage
    .from("materiais")
    .upload(fileName, bytes, { contentType: file.type, upsert: false });

  if (error) return NextResponse.json({ error: "Erro interno" }, { status: 500 });

  const { data: { publicUrl } } = db.storage.from("materiais").getPublicUrl(data.path);

  return NextResponse.json({ url: publicUrl, size: file.size, path: data.path });
}
