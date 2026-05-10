import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const { name, email, supabaseId } = await req.json();

  if (!name || !email || !supabaseId) {
    return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
  }

  const user = await prisma.user.upsert({
    where: { supabaseId },
    create: { supabaseId, name, email, role: "STUDENT" },
    update: { name, email },
  });

  return NextResponse.json({ ok: true, userId: user.id });
}
