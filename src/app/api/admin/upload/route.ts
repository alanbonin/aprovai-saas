import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { adminUploadLimiter } from "@/lib/rate-limit";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await db.from("User").select("role").eq("supabaseId", user.id).single();
  return data?.role === "ADMIN" ? user : null;
}

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB

export async function POST(req: Request) {
  const adminUser = await requireAdmin();
  if (!adminUser) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const rl = await adminUploadLimiter.check(`admin:${adminUser.id}`);
  if (!rl.ok) return NextResponse.json({ error: rl.error }, { status: 429 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Nenhum arquivo" }, { status: 400 });

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "Arquivo muito grande (máx. 100 MB)" }, { status: 400 });
  }

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
