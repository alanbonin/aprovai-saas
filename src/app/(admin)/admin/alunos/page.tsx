import { db } from "@/lib/db";
import { AlunosClient } from "./alunos-client";

export const dynamic = "force-dynamic";

export default async function AlunosAdminPage() {
  const [{ data: users }, { data: plans }] = await Promise.all([
    db.from("User").select("id, name, email, role, createdAt").order("createdAt", { ascending: false }).limit(500),
    db.from("Plan").select("id, name, slug").eq("active", true).order("price"),
  ]);

  const userIds = (users ?? []).map((u: { id: string }) => u.id);
  // Busca subscrições ACTIVE ordenadas por createdAt desc — pega a mais recente por usuário
  const { data: subs } = userIds.length
    ? await db
        .from("Subscription")
        .select("userId, planId, createdAt")
        .in("userId", userIds)
        .eq("status", "ACTIVE")
        .order("createdAt", { ascending: false })
    : { data: [] };

  const planMap = Object.fromEntries((plans ?? []).map((p: { id: string; name: string }) => [p.id, p.name]));
  // Como está ordenado desc, o primeiro para cada userId é o mais recente
  const subMap: Record<string, string> = {};
  for (const s of (subs ?? []) as { userId: string; planId: string }[]) {
    if (!subMap[s.userId]) subMap[s.userId] = s.planId;
  }

  return (
    <AlunosClient
      users={(users ?? []) as { id: string; name: string; email: string; role: string; createdAt: string }[]}
      plans={(plans ?? []) as { id: string; name: string; slug: string }[]}
      planMap={planMap}
      subMap={subMap}
    />
  );
}
