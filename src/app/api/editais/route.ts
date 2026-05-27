import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { log } from "@/lib/logger";

// GET /api/editais — lista editais para o aluno, com relevância baseada no perfil
export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const { data: dbUser } = await db.from("User").select("id").eq("supabaseId", user.id).single();
    if (!dbUser) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

    const { searchParams } = new URL(req.url);
    const area        = searchParams.get("area");
    const estado      = searchParams.get("estado");
    const status      = searchParams.get("status");
    const escolaridade = searchParams.get("escolaridade");
    const nivel       = searchParams.get("nivel");
    const search      = searchParams.get("search");
    const soFavoritos = searchParams.get("favoritos") === "1";
    const page        = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit       = Math.min(50, parseInt(searchParams.get("limit") ?? "20", 10));
    const offset      = (page - 1) * limit;

    // Perfil do aluno para relevância
    const { data: profile } = await db
      .from("StudentProfile")
      .select("cargo, orgao, escolaridade, modalidade")
      .eq("userId", dbUser.id)
      .maybeSingle();

    // Favoritos do aluno
    const { data: favData } = await db
      .from("EditalFavorito")
      .select("editalId")
      .eq("userId", dbUser.id);
    const favSet = new Set((favData ?? []).map((f: { editalId: string }) => f.editalId));

    let query = db
      .from("Edital")
      .select("id, titulo, orgao, cargo, area, vagas, salario, salarioMax, banca, estado, nivel, escolaridade, status, descricao, dataPublicacao, dataInscricaoInicio, dataInscricaoFim, dataProva, link, editalUrl, isPremium, createdAt", { count: "exact" })
      .eq("active", true)
      .order("createdAt", { ascending: false });

    if (area)         query = query.eq("area", area);
    if (estado)       query = query.eq("estado", estado);
    if (status)       query = query.eq("status", status);
    if (escolaridade) query = query.eq("escolaridade", escolaridade);
    if (nivel)        query = query.eq("nivel", nivel);
    if (search)       query = query.or(`titulo.ilike.%${search}%,orgao.ilike.%${search}%,cargo.ilike.%${search}%`);
    if (soFavoritos)  query = query.in("id", favSet.size > 0 ? [...favSet] : ["__none__"]);

    const { data: editais, count, error } = await query.range(offset, offset + limit - 1);
    if (error) return NextResponse.json({ error: "Erro interno" }, { status: 500 });

    // Adiciona flags de relevância e favorito
    const cargoProfile = (profile?.cargo ?? "").toLowerCase();
    const result = (editais ?? []).map((e: Record<string, unknown>) => {
      const cargoBusca = ((e.cargo as string) ?? "").toLowerCase();
      const relevante = cargoProfile.length > 0 && (
        cargoBusca.includes(cargoProfile) ||
        cargoProfile.includes(cargoBusca.split(" ")[0])
      );
      return {
        ...e,
        isFavorito: favSet.has(e.id as string),
        relevante,
      };
    });

    // Ordenar relevantes primeiro
    result.sort((a: { relevante: boolean; isFavorito: boolean }, b: { relevante: boolean; isFavorito: boolean }) => {
      if (a.isFavorito !== b.isFavorito) return a.isFavorito ? -1 : 1;
      if (a.relevante !== b.relevante) return a.relevante ? -1 : 1;
      return 0;
    });

    return NextResponse.json({
      editais: result,
      total: count ?? 0,
      page,
      totalPages: Math.ceil((count ?? 0) / limit),
    });
  } catch (err) {
    log.error("db.editais_get_error", {}, err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
