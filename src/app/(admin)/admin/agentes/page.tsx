import { db } from "@/lib/db";
import { AgentesAdmin } from "./agentes-client";
import { CATEGORIAS } from "@/lib/agents";

function getWeekStart() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - d.getUTCDay()); // domingo
  return d.toISOString();
}

export default async function AgentesAdminPage() {
  const weekStart = getWeekStart();

  const [{ data: agents }, { data: usageAll }, { data: usageWeek }] = await Promise.all([
    db.from("Agent").select("*").order("createdAt", { ascending: false }),
    db.from("AiUsage").select("agentId, count"),
    db.from("AiUsage").select("agentId, count").gte("weekStart", weekStart),
  ]);

  // Agrega uso por agentId
  const usageTotalMap: Record<string, number> = {};
  for (const u of usageAll ?? []) {
    usageTotalMap[u.agentId] = (usageTotalMap[u.agentId] ?? 0) + (u.count ?? 0);
  }
  const usageWeekMap: Record<string, number> = {};
  for (const u of usageWeek ?? []) {
    usageWeekMap[u.agentId] = (usageWeekMap[u.agentId] ?? 0) + (u.count ?? 0);
  }

  return (
    <div className="p-8">
      <AgentesAdmin
        agents={agents ?? []}
        categorias={CATEGORIAS}
        usageTotalMap={usageTotalMap}
        usageWeekMap={usageWeekMap}
      />
    </div>
  );
}
