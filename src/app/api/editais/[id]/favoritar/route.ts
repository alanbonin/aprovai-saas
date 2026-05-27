import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { log } from "@/lib/logger";

// POST /api/editais/[id]/favoritar — toggle favorito
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: editalId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const { data: dbUser } = await db.from("User").select("id").eq("supabaseId", user.id).single();
    if (!dbUser) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

    // Verificar se edital existe
    const { data: edital } = await db.from("Edital").select("id").eq("id", editalId).eq("active", true).single();
    if (!edital) return NextResponse.json({ error: "Edital não encontrado" }, { status: 404 });

    // Verificar se já é favorito
    const { data: existing } = await db
      .from("EditalFavorito")
      .select("id")
      .eq("userId", dbUser.id)
      .eq("editalId", editalId)
      .maybeSingle();

    if (existing) {
      // Remover favorito
      await db.from("EditalFavorito").delete().eq("id", existing.id);
      return NextResponse.json({ favoritado: false });
    } else {
      // Adicionar favorito
      await db.from("EditalFavorito").insert({
        id: crypto.randomUUID(),
        userId: dbUser.id,
        editalId,
        createdAt: new Date().toISOString(),
      });
      return NextResponse.json({ favoritado: true });
    }
  } catch (err) {
    log.error("db.editais_favoritar_error", {}, err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
