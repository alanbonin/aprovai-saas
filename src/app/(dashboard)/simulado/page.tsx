import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan, db } from "@/lib/db";
import { SimuladoClient } from "./simulado-client";

export default async function SimuladoPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) redirect("/login");

  const { data: history } = await db
    .from("SimuladoHistory")
    .select("id, total, correct, timeSecs, createdAt")
    .eq("userId", dbUser.id)
    .order("createdAt", { ascending: false })
    .limit(20);

  return (
    <SimuladoClient
      history={history ?? []}
      userId={dbUser.id}
    />
  );
}
