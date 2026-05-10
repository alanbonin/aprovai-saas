import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan, db } from "@/lib/db";
import { Trophy, Target, Brain, TrendingUp } from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) redirect("/login");

  const [
    { count: totalQuestions },
    { count: totalCorrect },
    { count: totalSimulados },
    { data: recentSimulados },
  ] = await Promise.all([
    db.from("Progress").select("*", { count: "exact", head: true }).eq("userId", dbUser.id),
    db.from("Progress").select("*", { count: "exact", head: true }).eq("userId", dbUser.id).eq("correct", true),
    db.from("SimuladoHistory").select("*", { count: "exact", head: true }).eq("userId", dbUser.id),
    db.from("SimuladoHistory").select("*").eq("userId", dbUser.id).order("createdAt", { ascending: false }).limit(5),
  ]);

  const accuracy = (totalQuestions ?? 0) > 0
    ? Math.round(((totalCorrect ?? 0) / (totalQuestions ?? 1)) * 100)
    : 0;

  const stats = [
    { label: "Questões respondidas", value: totalQuestions ?? 0,  icon: Target,    color: "text-blue-400" },
    { label: "Taxa de acerto",       value: `${accuracy}%`,        icon: TrendingUp, color: "text-green-400" },
    { label: "Simulados feitos",     value: totalSimulados ?? 0,  icon: Trophy,    color: "text-yellow-400" },
    { label: "Plano atual",          value: dbUser.subscription?.plan?.name ?? "Gratuito", icon: Brain, color: "text-indigo-400" },
  ];

  return (
    <div className="p-8 text-white">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Olá, {dbUser.name.split(" ")[0]}! 👋</h1>
        <p className="text-gray-400 mt-1">Vamos estudar hoje?</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-xl bg-white/5 border border-white/5 p-5">
            <div className="flex items-center gap-3 mb-3">
              <Icon className={`w-5 h-5 ${color}`} />
              <span className="text-gray-400 text-sm">{label}</span>
            </div>
            <p className="text-2xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Ações rápidas</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <a href="/questoes" className="flex items-center gap-4 p-5 rounded-xl bg-indigo-600/10 border border-indigo-500/20 hover:bg-indigo-600/20 transition-colors">
            <Target className="w-8 h-8 text-indigo-400" />
            <div><p className="font-medium">Praticar Questões</p><p className="text-sm text-gray-400">Estude por matéria</p></div>
          </a>
          <a href="/mentor" className="flex items-center gap-4 p-5 rounded-xl bg-purple-600/10 border border-purple-500/20 hover:bg-purple-600/20 transition-colors">
            <Brain className="w-8 h-8 text-purple-400" />
            <div><p className="font-medium">Falar com Mentor</p><p className="text-sm text-gray-400">IA especialista</p></div>
          </a>
          <a href="/simulado" className="flex items-center gap-4 p-5 rounded-xl bg-yellow-600/10 border border-yellow-500/20 hover:bg-yellow-600/20 transition-colors">
            <Trophy className="w-8 h-8 text-yellow-400" />
            <div><p className="font-medium">Fazer Simulado</p><p className="text-sm text-gray-400">Teste seus conhecimentos</p></div>
          </a>
        </div>
      </div>

      {(recentSimulados ?? []).length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Últimos simulados</h2>
          <div className="rounded-xl border border-white/5 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-4 py-3 text-left text-gray-400 font-medium">Data</th>
                  <th className="px-4 py-3 text-left text-gray-400 font-medium">Acertos</th>
                  <th className="px-4 py-3 text-left text-gray-400 font-medium">Aproveitamento</th>
                  <th className="px-4 py-3 text-left text-gray-400 font-medium">Tempo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {(recentSimulados ?? []).map((s: { id: number; createdAt: string; correct: number; total: number; timeSecs: number }) => (
                  <tr key={s.id} className="hover:bg-white/5">
                    <td className="px-4 py-3 text-gray-300">{new Date(s.createdAt).toLocaleDateString("pt-BR")}</td>
                    <td className="px-4 py-3">{s.correct}/{s.total}</td>
                    <td className="px-4 py-3">
                      <span className={`font-medium ${(s.correct / s.total) >= 0.7 ? "text-green-400" : "text-red-400"}`}>
                        {Math.round((s.correct / s.total) * 100)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400">{Math.floor(s.timeSecs / 60)}min</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
