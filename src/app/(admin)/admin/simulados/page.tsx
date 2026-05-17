import { db } from "@/lib/db";
import { Trophy, TrendingUp, Target } from "lucide-react";

export default async function SimuladosAdminPage() {
  const { data: historico } = await db
    .from("SimuladoHistory")
    .select("id, userId, total, correct, timeSecs, createdAt, User(name, email)")
    .order("createdAt", { ascending: false })
    .limit(100);

  const rows = historico ?? [];

  const totalTentativas = rows.length;
  const mediaAproveitamento = totalTentativas > 0
    ? Math.round(rows.reduce((sum, r) => sum + (r.total > 0 ? r.correct / r.total : 0), 0) / totalTentativas * 100)
    : 0;
  const mediaTempo = totalTentativas > 0
    ? Math.round(rows.reduce((sum, r) => sum + r.timeSecs, 0) / totalTentativas / 60)
    : 0;

  return (
    <div className="p-8 text-white">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Simulados</h1>
        <p className="text-gray-500 text-sm mt-1">Histórico de tentativas dos alunos</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="rounded-xl border border-white/5 bg-white/3 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-4 h-4 text-yellow-400" />
            <span className="text-gray-500 text-sm">Total de tentativas</span>
          </div>
          <p className="text-2xl font-bold">{totalTentativas}</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-white/3 p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <span className="text-gray-500 text-sm">Aproveitamento médio</span>
          </div>
          <p className="text-2xl font-bold">{mediaAproveitamento}%</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-white/3 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-blue-400" />
            <span className="text-gray-500 text-sm">Tempo médio</span>
          </div>
          <p className="text-2xl font-bold">{mediaTempo}min</p>
        </div>
      </div>

      {rows.length > 0 ? (
        <div className="rounded-xl border border-white/5 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-white/5">
              <tr>
                <th className="px-4 py-3 text-left text-gray-400 font-medium">Aluno</th>
                <th className="px-4 py-3 text-left text-gray-400 font-medium">Data</th>
                <th className="px-4 py-3 text-left text-gray-400 font-medium">Resultado</th>
                <th className="px-4 py-3 text-left text-gray-400 font-medium">Aproveitamento</th>
                <th className="px-4 py-3 text-left text-gray-400 font-medium">Tempo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rows.map((r: {
                id: number; userId: string; total: number; correct: number;
                timeSecs: number; createdAt: string;
                User: { name: string; email: string } | { name: string; email: string }[] | null;
              }) => {
                const user = Array.isArray(r.User) ? r.User[0] : r.User;
                const pct = r.total > 0 ? Math.round((r.correct / r.total) * 100) : 0;
                return (
                  <tr key={r.id} className="hover:bg-white/3">
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">{user?.name ?? "—"}</p>
                      <p className="text-xs text-gray-500">{user?.email}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-400">
                      {new Date(r.createdAt).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-4 py-3">
                      {r.correct}/{r.total}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-semibold ${pct >= 70 ? "text-green-400" : pct >= 50 ? "text-yellow-400" : "text-red-400"}`}>
                        {pct}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {Math.floor(r.timeSecs / 60)}min
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-16 rounded-xl border border-white/5 text-gray-500">
          <Trophy className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p>Nenhum simulado realizado ainda.</p>
        </div>
      )}
    </div>
  );
}
