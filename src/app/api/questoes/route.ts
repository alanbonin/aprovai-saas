import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
  if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const subjectId = searchParams.get("subject");
  const excludeIds = searchParams.get("exclude")?.split(",").map(Number).filter(Boolean) ?? [];

  const question = await prisma.question.findFirst({
    where: {
      subjectId: subjectId ?? undefined,
      id: { notIn: excludeIds },
    },
    orderBy: { createdAt: "desc" },
  });

  const total = await prisma.question.count({
    where: { subjectId: subjectId ?? undefined },
  });

  return NextResponse.json({ question, total });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
  if (!dbUser || dbUser.role !== "ADMIN") {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const body = await req.json();
  const question = await prisma.question.create({ data: body });
  return NextResponse.json(question, { status: 201 });
}
