import { db } from "@/lib/db";
import { Crown } from "lucide-react";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("pt-BR");
}

export default async function AlunosAdminPage() {
  const { data: users } = await db
    .from("User")
    .select("id, name, email, role, createdAt")
    .order("createdAt", { ascending: false })
    .limit(200);

  const userIds = (users ?? []).map((u: { id: string }) => u.id);
  const { data: subs } = userIds.length
    ? await db.from("Subscription").select("userId, status, planId").in("userId", userIds).eq("status", "ACTIVE")
    : { data: [] };

  const { data: plans } = await db.from("Plan").select("id, name");
  const planMap = Object.fromEntries((plans ?? []).map((p: { id: string; name: string }) => [p.id, p.name]));
  const subMap = Object.fromEntries((subs ?? []).map((s: { userId: string; planId: string }) => [s.userId, planMap[s.planId] ?? "—"]));

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Alunos</h1>
        <p className="text-gray-500 text-sm mt-1">{users?.length ?? 0} usuários cadastrados</p>
      </div>

      <div className="rounded-xl border border-white/5 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5 bg-white/3">
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Aluno</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Plano</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Função</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Cadastro</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {(users ?? []).map((u: { id: string; name: string; email: string; role: string; createdAt: string }) => (
              <tr key={u.id} className="hover:bg-white/3 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-indigo-600/20 flex items-center justify-center text-xs font-bold text-indigo-400">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-white">{u.name}</p>
                      <p className="text-gray-500 text-xs">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {subMap[u.id] ? (
                    <span className="flex items-center gap-1 text-orange-400 text-xs font-medium">
                      <Crown className="w-3 h-3" />
                      {subMap[u.id]}
                    </span>
                  ) : (
                    <span className="text-gray-600 text-xs">Gratuito</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${u.role === "ADMIN" ? "bg-red-500/20 text-red-400" : "bg-white/5 text-gray-500"}`}>
                    {u.role === "ADMIN" ? "Admin" : "Aluno"}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {formatDate(u.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
