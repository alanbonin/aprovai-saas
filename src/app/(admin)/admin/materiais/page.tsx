import { db } from "@/lib/db";
import { FileText, Plus } from "lucide-react";

export default async function MateriaisAdminPage() {
  const { data: materials, count } = await db
    .from("Material")
    .select("id, title, type, banca, isPremium, active, createdAt", { count: "exact" })
    .order("createdAt", { ascending: false })
    .limit(100);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Materiais</h1>
          <p className="text-gray-500 text-sm mt-1">{count ?? 0} materiais cadastrados</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" />
          Novo material
        </button>
      </div>

      {(materials ?? []).length === 0 ? (
        <div className="text-center py-20 rounded-xl border border-white/5 bg-white/3">
          <FileText className="w-12 h-12 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-400">Nenhum material cadastrado</p>
          <p className="text-gray-600 text-sm mt-1">Adicione PDFs, apostilas e links de estudo</p>
        </div>
      ) : (
        <div className="rounded-xl border border-white/5 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 bg-white/3">
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Título</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Tipo</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Banca</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Premium</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {(materials ?? []).map((m: { id: string; title: string; type: string; banca: string | null; isPremium: boolean }) => (
                <tr key={m.id} className="hover:bg-white/3">
                  <td className="px-4 py-3 font-medium">{m.title}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{m.type}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{m.banca ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${m.isPremium ? "bg-yellow-500/10 text-yellow-400" : "bg-white/5 text-gray-600"}`}>
                      {m.isPremium ? "Sim" : "Não"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
