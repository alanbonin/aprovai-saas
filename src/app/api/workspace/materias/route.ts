import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { getActiveProfile } from "@/lib/get-active-profile";

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { data: dbUser } = await db.from("User").select("id").eq("supabaseId", user.id).single();
  if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  // Busca perfil ativo (suporta multi-perfil)
  const profile = await getActiveProfile(dbUser.id);
  const profileId = profile?.id ?? null;

  // Matérias sempre filtradas por perfil ativo (StudentSubject com profileId)

  // Matérias do perfil ativo (profileId) + legadas sem profileId
  const buildSubjectList = async () => {
    const baseQuery = db
      .from("StudentSubject")
      .select("subjectId, Subject(id, name, slug, description)")
      .eq("userId", dbUser.id);

    let rows: { subjectId: string; Subject: unknown }[] = [];

    if (profileId) {
      // Somente matérias deste perfil — sem misturar com outros perfis
      const { data: withProfile } = await baseQuery.eq("profileId", profileId);
      rows = withProfile ?? [];

      // Fallback apenas se o perfil não tiver matérias configuradas ainda
      if (rows.length === 0) {
        const { data: legacy } = await db
          .from("StudentSubject")
          .select("subjectId, Subject(id, name, slug, description)")
          .eq("userId", dbUser.id)
          .is("profileId", null);
        rows = legacy ?? [];
      }
    } else {
      const { data } = await baseQuery.is("profileId", null);
      rows = data ?? [];
    }

    return rows
      .map(ss => {
        const s = ss.Subject as { id: string; name: string; slug: string; description: string }[] | null;
        return Array.isArray(s) ? s[0] : s;
      })
      .filter(Boolean);
  };

  // Mescla subjects com mesmo nome (cross-categoria) para unificação visual
  // Cada entry tem: id (primeiro encontrado), name, ids (todos os IDs com esse nome)
  function mergeByName(list: { id: string; name: string; slug?: string; description?: string }[]) {
    const map = new Map<string, { id: string; name: string; slug?: string; description?: string; ids: string[] }>();
    for (const s of list) {
      const key = s.name.toLowerCase().trim();
      if (map.has(key)) {
        map.get(key)!.ids.push(s.id);
      } else {
        map.set(key, { ...s, ids: [s.id] });
      }
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }

  const rawSubjects = await buildSubjectList();
  return NextResponse.json({ subjects: mergeByName(rawSubjects as { id: string; name: string }[]), profileId });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { data: dbUser } = await db.from("User").select("id").eq("supabaseId", user.id).single();
  if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const profile = await getActiveProfile(dbUser.id);
  const profileId = profile?.id ?? null;

  const { subjectIds } = await req.json();

  // Remove matérias do perfil ativo
  if (profileId) {
    await db.from("StudentSubject").delete().eq("userId", dbUser.id).eq("profileId", profileId);
  } else {
    await db.from("StudentSubject").delete().eq("userId", dbUser.id).is("profileId", null);
  }

  if (subjectIds && subjectIds.length > 0) {
    const now = new Date().toISOString();
    await db.from("StudentSubject").insert(
      subjectIds.map((id: string) => ({
        userId: dbUser.id,
        profileId,
        subjectId: id,
        fromEdital: false,
        createdAt: now,
      }))
    );
  }

  // Retornar matérias confirmadas
  const { data: subjects } = await db
    .from("Subject")
    .select("id, name, slug, description")
    .in("id", subjectIds ?? []);

  return NextResponse.json({ subjects: subjects ?? [] });
}
