import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { DEFAULT_TEMPLATES, TEMPLATE_NOMES, type EmailTemplate } from "@/lib/email-templates";

const TEMPLATE_PREFIX = "__EMAIL_TEMPLATE__:";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await db.from("User").select("id, role").eq("supabaseId", user.id).single();
  return data?.role === "ADMIN" ? data : null;
}

/** GET /api/admin/email-templates — lista todos os templates com flag isCustom */
export async function GET() {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  // Busca todos os templates salvos no banco
  const { data: rows } = await db
    .from("Note")
    .select("subjectId, content, updatedAt")
    .like("subjectId", `${TEMPLATE_PREFIX}%`);

  const savedMap = new Map<string, { content: string; updatedAt: string }>();
  for (const row of rows ?? []) {
    const slug = (row.subjectId as string).replace(TEMPLATE_PREFIX, "");
    if (!savedMap.has(slug)) {
      savedMap.set(slug, { content: row.content as string, updatedAt: row.updatedAt as string });
    }
  }

  const slugs = Object.keys(DEFAULT_TEMPLATES);
  const templates = slugs.map((slug) => {
    const saved = savedMap.get(slug);
    let parsed: Partial<EmailTemplate> = {};
    if (saved?.content) {
      try { parsed = JSON.parse(saved.content); } catch { /* usa default */ }
    }

    const def = DEFAULT_TEMPLATES[slug];
    return {
      slug,
      nome: TEMPLATE_NOMES[slug] ?? slug,
      assunto: parsed.assunto ?? def.assunto,
      html: parsed.html ?? def.html,
      variaveis: parsed.variaveis ?? def.variaveis,
      updatedAt: parsed.updatedAt ?? def.updatedAt,
      isCustom: !!saved,
    };
  });

  return NextResponse.json({ templates });
}

/** POST /api/admin/email-templates — salva template customizado */
export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { slug, assunto, html } = await req.json() as {
    slug?: string;
    assunto?: string;
    html?: string;
  };

  if (!slug || !DEFAULT_TEMPLATES[slug]) {
    return NextResponse.json({ error: "Slug inválido" }, { status: 400 });
  }
  if (!assunto?.trim() || !html?.trim()) {
    return NextResponse.json({ error: "Assunto e HTML são obrigatórios" }, { status: 400 });
  }

  const key = `${TEMPLATE_PREFIX}${slug}`;
  const variaveis = DEFAULT_TEMPLATES[slug].variaveis;
  const content = JSON.stringify({
    assunto: assunto.trim(),
    html: html.trim(),
    variaveis,
    updatedAt: new Date().toISOString(),
  });

  // Verifica se já existe para fazer update ou insert
  const { data: existing } = await db
    .from("Note")
    .select("id")
    .eq("subjectId", key)
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    await db.from("Note").update({ content, updatedAt: new Date().toISOString() }).eq("id", existing.id);
  } else {
    await db.from("Note").insert({
      id: crypto.randomUUID(),
      userId: admin.id,
      subjectId: key,
      content,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  return NextResponse.json({ ok: true });
}

/** DELETE /api/admin/email-templates?slug=xxx — restaura para o default (apaga do banco) */
export async function DELETE(req: Request) {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");

  if (!slug || !DEFAULT_TEMPLATES[slug]) {
    return NextResponse.json({ error: "Slug inválido" }, { status: 400 });
  }

  const key = `${TEMPLATE_PREFIX}${slug}`;
  await db.from("Note").delete().eq("subjectId", key);

  return NextResponse.json({ ok: true });
}
