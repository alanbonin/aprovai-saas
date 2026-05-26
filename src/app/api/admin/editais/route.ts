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

// GET — lista editais (admin)
export async function GET(req: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const status   = searchParams.get("status");
  const area     = searchParams.get("area");
  const search   = searchParams.get("search");
  const source   = searchParams.get("source");
  const page     = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit    = Math.min(100, parseInt(searchParams.get("limit") ?? "30", 10));
  const offset   = (page - 1) * limit;

  let query = db
    .from("Edital")
    .select("*", { count: "exact" })
    .order("createdAt", { ascending: false });

  if (status) query = query.eq("status", status);
  if (area)   query = query.eq("area", area);
  if (source) query = query.eq("source", source);
  if (search) query = query.or(`titulo.ilike.%${search}%,orgao.ilike.%${search}%,cargo.ilike.%${search}%`);

  const { data: editais, count, error } = await query.range(offset, offset + limit - 1);
  if (error) return NextResponse.json({ error: "Erro interno" }, { status: 500 });

  return NextResponse.json({ editais: editais ?? [], total: count ?? 0, page, totalPages: Math.ceil((count ?? 0) / limit) });
}

// POST — criar edital
export async function POST(req: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const body = await req.json();
  const now = new Date().toISOString();
  const { error } = await db.from("Edital").insert({
    id: crypto.randomUUID(),
    titulo:              body.titulo ?? "",
    orgao:               body.orgao ?? "",
    cargo:               body.cargo ?? "",
    area:                body.area ?? null,
    vagas:               body.vagas ? parseInt(body.vagas, 10) : null,
    salario:             body.salario ? parseFloat(body.salario) : null,
    salarioMax:          body.salarioMax ? parseFloat(body.salarioMax) : null,
    banca:               body.banca ?? null,
    estado:              body.estado ?? null,
    nivel:               body.nivel ?? "federal",
    escolaridade:        body.escolaridade ?? null,
    status:              body.status ?? "previsto",
    descricao:           body.descricao ?? null,
    dataPublicacao:      body.dataPublicacao ?? null,
    dataInscricaoInicio: body.dataInscricaoInicio ?? null,
    dataInscricaoFim:    body.dataInscricaoFim ?? null,
    dataProva:           body.dataProva ?? null,
    link:                body.link ?? null,
    editalUrl:           body.editalUrl ?? null,
    source:              body.source ?? "manual",
    sourceRef:           body.sourceRef ?? null,
    isPremium:           body.isPremium ?? false,
    active:              body.active ?? true,
    createdAt:           now,
    updatedAt:           now,
  });

  if (error) return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// PATCH — atualizar edital
export async function PATCH(req: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const body = await req.json();
  const { id, ...fields } = body;
  if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });

  const { error } = await db
    .from("Edital")
    .update({ ...fields, updatedAt: new Date().toISOString() })
    .eq("id", id);

  if (error) return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE — desativar edital (soft delete)
export async function DELETE(req: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });

  const { error } = await db
    .from("Edital")
    .update({ active: false, updatedAt: new Date().toISOString() })
    .eq("id", id);

  if (error) return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
