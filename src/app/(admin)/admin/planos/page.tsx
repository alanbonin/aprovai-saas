import { db } from "@/lib/db";
import { PlanosAdminClient } from "./planos-client";

export default async function PlanosAdminPage() {
  const { data: plans } = await db.from("Plan").select("*").order("price");
  return <PlanosAdminClient plans={plans ?? []} />;
}
