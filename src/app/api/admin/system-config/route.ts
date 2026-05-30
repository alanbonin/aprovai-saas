import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { getAllConfigs, setConfig, deleteConfig, CONFIG_DEFAULTS } from "@/lib/system-config";
import type { ConfigValue } from "@/lib/system-config";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await db.from("User").select("role").eq("supabaseId", user.id).single();
  return data?.role === "ADMIN" ? user : null;
}

// GET /api/admin/system-config — retorna todas as configs
export async function GET() {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const configs = await getAllConfigs();
  return NextResponse.json({ configs, defaults: CONFIG_DEFAULTS });
}

// POST /api/admin/system-config — { key, value } — salva uma config
export async function POST(req: Request) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  let body: { key?: string; value?: ConfigValue };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { key, value } = body;
  if (!key || value === undefined) {
    return NextResponse.json({ error: "key e value são obrigatórios" }, { status: 400 });
  }

  if (!(key in CONFIG_DEFAULTS)) {
    return NextResponse.json({ error: "Chave de configuração inválida" }, { status: 400 });
  }

  await setConfig(key, value);
  return NextResponse.json({ ok: true, key, value });
}

// DELETE /api/admin/system-config?key=xxx — restaura para o default
export async function DELETE(req: Request) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const url = new URL(req.url);
  const key = url.searchParams.get("key");
  if (!key) return NextResponse.json({ error: "key é obrigatório" }, { status: 400 });

  await deleteConfig(key);
  return NextResponse.json({ ok: true, key, restoredDefault: CONFIG_DEFAULTS[key as keyof typeof CONFIG_DEFAULTS] });
}
