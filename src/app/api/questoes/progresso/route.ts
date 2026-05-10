import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
  if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const { questionId, correct } = await req.json();

  // Algoritmo de repetição espaçada simples
  const existing = await prisma.progress.findUnique({
    where: { userId_questionId: { userId: dbUser.id, questionId } },
  });

  const easeFactor = existing
    ? correct
      ? Math.min(2.5, existing.easeFactor + 0.1)
      : Math.max(1.3, existing.easeFactor - 0.2)
    : 2.5;

  const interval = existing
    ? correct
      ? Math.round(existing.interval * easeFactor)
      : 1
    : 1;

  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + interval);

  const progress = await prisma.progress.upsert({
    where: { userId_questionId: { userId: dbUser.id, questionId } },
    create: { userId: dbUser.id, questionId, correct, interval, easeFactor, nextReview, reviewedAt: new Date() },
    update: { correct, interval, easeFactor, nextReview, reviewedAt: new Date() },
  });

  return NextResponse.json(progress);
}
