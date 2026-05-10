import { db } from "@/lib/db";
import { Users, Brain, BookOpen, CreditCard } from "lucide-react";

export default async function AdminPage() {
  const [
    { count: totalAlunos },
    { count: totalAgentes },
    { count: totalQuestoes },
    { count: assinaturas },
  ] = await Promise.all([
    db.from("User").select("*", { count: "exact", head: true }).eq("role", "STUDENT"),
    db.from("Agent").select("*", { count: "exact", head: true }).eq("active", true),
    db.from("Question").select("*", { count: "exact", head: true }),
    db.from("Subscription").select("*", { count: "exact", head: true }).eq("status", "ACTIVE"),
  ]);

  const stats = [
    { label: "Alunos", value: totalAlunos ?? 0, icon: Users, color: "text-indigo-400", bg: "bg-indigo-500/10" },
    { label: "Agentes ativos", value: totalAgentes ?? 0, icon: Brain, color: "text-purple-400", bg: "bg-purple-500/10" },
    { label: "Questões", value: totalQuestoes ?? 0, icon: BookOpen, color: "text-blue-400", bg: "bg-blue-500/10" },
    { label: "Assinaturas ativas", value: assinaturas ?? 0, icon: CreditCard, color: "text-green-400", bg: "bg-green-500/10" },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Painel Admin</h1>
        <p className="text-gray-500 text-sm mt-1">Visão geral da plataforma</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="rounded-xl border border-white/5 bg-white/3 p-5">
            <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center mb-3`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <p className="text-2xl font-bold">{value.toLocaleString("pt-BR")}</p>
            <p className="text-gray-500 text-sm mt-0.5">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
