import { db } from "@/lib/db";
import { AlunosClient } from "./alunos-client";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export default async function AlunosAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const search = (params.search ?? "").trim();
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let userQuery = db
    .from("User")
    .select("id, name, email, role, createdAt, origin, partnerId, groupTag", { count: "exact" })
    .order("createdAt", { ascending: false })
    .range(from, to);

  if (search) {
    userQuery = userQuery.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
  }

  const [{ data: users, count: totalCount }, { data: plans }, { data: partners }] = await Promise.all([
    userQuery,
    db.from("Plan").select("id, name, slug, price").eq("active", true).order("price"),
    db.from("Partner").select("id, name, slug").eq("active", true).order("name"),
  ]);

  const total = totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const userIds = (users ?? []).map((u: { id: string }) => u.id);
  const { data: subs } = userIds.length
    ? await db
        .from("Subscription")
        .select("userId, planId, mpPaymentId, endDate, createdAt")
        .in("userId", userIds)
        .eq("status", "ACTIVE")
        .order("createdAt", { ascending: false })
    : { data: [] };

  const planMap = Object.fromEntries((plans ?? []).map((p: { id: string; name: string }) => [p.id, p.name]));
  const subMap: Record<string, string> = {};
  const isentoMap: Record<string, boolean> = {};
  const endDateMap: Record<string, string> = {};

  for (const s of (subs ?? []) as { userId: string; planId: string; mpPaymentId: string | null; endDate: string | null }[]) {
    if (!subMap[s.userId]) {
      subMap[s.userId] = s.planId;
      const mp = s.mpPaymentId ?? "";
      isentoMap[s.userId] = mp.startsWith("CORTESIA:") || mp === "ISENTO";
      endDateMap[s.userId] = s.endDate ?? "";
    }
  }

  const partnerMap = Object.fromEntries(
    (partners ?? []).map((p: { id: string; name: string }) => [p.id, p.name])
  );

  return (
    <AlunosClient
      users={(users ?? []) as { id: string; name: string; email: string; role: string; createdAt: string; origin: string; partnerId: string | null; groupTag: string | null }[]}
      plans={(plans ?? []) as { id: string; name: string; slug: string; price: number }[]}
      partners={(partners ?? []) as { id: string; name: string; slug: string }[]}
      planMap={planMap}
      subMap={subMap}
      isentoMap={isentoMap}
      endDateMap={endDateMap}
      partnerMap={partnerMap}
      page={page}
      totalPages={totalPages}
      total={total}
      search={search}
    />
  );
}
