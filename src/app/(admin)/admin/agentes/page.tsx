import { db } from "@/lib/db";
import { AgentesAdmin } from "./agentes-client";
import { CATEGORIAS, BANCAS } from "@/lib/agents";

export default async function AgentesAdminPage() {
  const { data: agents } = await db
    .from("Agent")
    .select("*")
    .order("createdAt", { ascending: false });

  return (
    <div className="p-8">
      <AgentesAdmin agents={agents ?? []} categorias={CATEGORIAS} bancas={BANCAS} />
    </div>
  );
}
