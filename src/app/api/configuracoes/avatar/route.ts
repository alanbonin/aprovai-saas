import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { db } from "@/lib/db";

const BUCKET = "avatars";
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { data: dbUser } = await db.from("User").select("id, avatarUrl").eq("supabaseId", user.id).single();
  if (!dbUser) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

  const formData = await req.formData();
  const file = formData.get("avatar") as File | null;
  if (!file) return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });

  // Validações
  if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
    return NextResponse.json({ error: "Formato inválido. Use JPG, PNG ou WebP." }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Imagem muito grande. Máximo 2MB." }, { status: 400 });
  }

  const supabaseAdmin = createSupabaseAdmin(
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Garante que o bucket existe
  const { data: buckets } = await supabaseAdmin.storage.listBuckets();
  if (!buckets?.some(b => b.name === BUCKET)) {
    await supabaseAdmin.storage.createBucket(BUCKET, { public: true, fileSizeLimit: MAX_SIZE });
  }

  // Remove avatar anterior se existir
  if (dbUser.avatarUrl) {
    const oldPath = dbUser.avatarUrl.split(`/${BUCKET}/`)[1];
    if (oldPath) await supabaseAdmin.storage.from(BUCKET).remove([oldPath]);
  }

  // Upload do novo arquivo
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const filePath = `${dbUser.id}/avatar-${Date.now()}.${ext}`;
  const arrayBuffer = await file.arrayBuffer();

  const { error: uploadError } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(filePath, arrayBuffer, { contentType: file.type, upsert: true });

  if (uploadError) {
    return NextResponse.json({ error: "Erro no upload: " + uploadError.message }, { status: 500 });
  }

  // URL pública
  const { data: { publicUrl } } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(filePath);

  // Salva no banco
  await db.from("User").update({ avatarUrl: publicUrl }).eq("id", dbUser.id);

  return NextResponse.json({ avatarUrl: publicUrl });
}

export async function DELETE() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { data: dbUser } = await db.from("User").select("id, avatarUrl").eq("supabaseId", user.id).single();
  if (!dbUser) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

  if (dbUser.avatarUrl) {
    const supabaseAdmin = createSupabaseAdmin(
      process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    const oldPath = dbUser.avatarUrl.split(`/${BUCKET}/`)[1];
    if (oldPath) await supabaseAdmin.storage.from(BUCKET).remove([oldPath]);
    await db.from("User").update({ avatarUrl: null }).eq("id", dbUser.id);
  }

  return NextResponse.json({ ok: true });
}
