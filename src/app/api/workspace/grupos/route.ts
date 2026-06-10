import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan, db } from "@/lib/db";

const PREFIX = "__GRUPOS__";

export interface GrupoSalvo {
  id: string;
  nome: string;
  code: string;
  criadoEm: string;
  ultimaSessao: string | null;
  membros: number;
}

async function getGrupos(userId: string): Promise<GrupoSalvo[]> {
  const { data } = await db.from("Note")
    .select("content").eq("userId", userId).eq("subjectId", PREFIX).single();
  try { return data?.content ? JSON.parse(data.content) : []; }
  catch { return []; }
}

async function saveGrupos(userId: string, grupos: GrupoSalvo[]) {
  const content = JSON.stringify(grupos);
  const { data: ex } = await db.from("Note")
    .select("id").eq("userId", userId).eq("subjectId", PREFIX).single();
  if (ex?.id) await db.from("Note").update({ content }).eq("id", ex.id);
  else await db.from("Note").insert({ id: crypto.randomUUID(), userId, subjectId: PREFIX, content, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  return NextResponse.json({ grupos: await getGrupos(dbUser.id) });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const VALID_ACTIONS = new Set(["save", "remove", "touch"]);
  const body = await req.json() as {
    action: string;
    id?: string;
    nome?: string;
    code?: string;
  };

  // Allowlist de ações — rejeita strings arbitrárias
  if (!VALID_ACTIONS.has(body.action)) {
    return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
  }

  const grupos = await getGrupos(dbUser.id);

  if (body.action === "save" && body.nome && body.code) {
    // Sanitiza e limita tamanho dos campos
    const safeNome = String(body.nome).trim().slice(0, 40);
    const safeCode = String(body.code).trim().slice(0, 50); // códigos de grupo raramente passam de 10 chars
    if (!safeNome || !safeCode) {
      return NextResponse.json({ error: "Nome e código são obrigatórios" }, { status: 400 });
    }
    const exists = grupos.find(g => g.code === safeCode);
    if (!exists) {
      grupos.unshift({
        id: crypto.randomUUID(),
        nome: safeNome,
        code: safeCode,
        criadoEm: new Date().toISOString(),
        ultimaSessao: new Date().toISOString(),
        membros: 1,
      });
      // Máximo 10 grupos salvos
      if (grupos.length > 10) grupos.splice(10);
    }
    await saveGrupos(dbUser.id, grupos);
    return NextResponse.json({ grupos });
  }

  if (body.action === "remove" && body.id) {
    const updated = grupos.filter(g => g.id !== body.id);
    await saveGrupos(dbUser.id, updated);
    return NextResponse.json({ grupos: updated });
  }

  if (body.action === "touch" && body.code) {
    const updated = grupos.map(g =>
      g.code === body.code ? { ...g, ultimaSessao: new Date().toISOString() } : g
    );
    await saveGrupos(dbUser.id, updated);
    return NextResponse.json({ grupos: updated });
  }

  return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
}
