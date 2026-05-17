import { db } from "@/lib/db";
import { AlunosClient } from "./alunos-client";

export default async function AlunosAdminPage() {
  const [{ data: users }, { data: plans }] = await Promise.all([
    db.from("User").select("id, name, email, role, createdAt").order("createdAt", { ascending: false }).limit(500),
    db.from("Plan").select("id, name, slug").eq("active", true).order("price"),
  ]);

  const userIds = (users ?? []).map((u: { id: string }) => u.id);
  const { data: subs } = userIds.length
    ? await db.from("Subscription").select("userId, status, planId").in("userId", userIds).eq("status", "ACTIVE")
    : { data: [] };

  const planMap = Object.fromEntries((plans ?? []).map((p: { id: string; name: string }) => [p.id, p.name]));
  const subMap = Object.fromEntries((subs ?? []).map((s: { userId: string; planId: string }) => [s.userId, s.planId]));

  return (
    <AlunosClient
      users={(users ?? []) as { id: string; name: string; email: string; role: string; createdAt: string }[]}
      plans={(plans ?? []) as { id: string; name: string; slug: string }[]}
      planMap={planMap}
      subMap={subMap}
    />
  );
}
