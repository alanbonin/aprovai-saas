"use client";
import { useState, useMemo } from "react";
import { Plus, Edit2, ToggleLeft, ToggleRight, X, Check, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface Agent {
  id: string; name: string; slug: string; description: string;
  categoria: string | null;
  color: string; active: boolean; isPremium: boolean;
  systemPrompt: string;
}

interface Props {
  agents: Agent[];
  categorias: { id: string; label: string }[];
  usageTotalMap?: Record<string, number>;
  usageWeekMap?: Record<string, number>;
}

const COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#ef4444", "#14b8a6", "#f97316", "#06b6d4"];

const empty: Omit<Agent, "id"> = {
  name: "", slug: "", description: "", categoria: null,
  color: "#6366f1", active: true, isPremium: false, systemPrompt: "",
};

export function AgentesAdmin({ agents: initial, categorias, usageTotalMap = {}, usageWeekMap = {} }: Props) {
  const [agents, setAgents] = useState(initial);
  const [editing, setEditing] = useState<Partial<Agent> | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [filterPremium, setFilterPremium] = useState<"all" | "premium" | "free">("all");

  const filtered = useMemo(() => agents.filter(a => {
    if (search && !a.name.toLowerCase().includes(search.toLowerCase()) && !a.description.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterCat !== "all" && a.categoria !== filterCat) return false;
    if (filterStatus === "active" && !a.active) return false;
    if (filterStatus === "inactive" && a.active) return false;
    if (filterPremium === "premium" && !a.isPremium) return false;
    if (filterPremium === "free" && a.isPremium) return false;
    return true;
  }), [agents, search, filterCat, filterStatus, filterPremium]);

  async function save() {
    if (!editing?.name?.trim()) return;
    setSaving(true);
    setError("");

    const isNew = !editing.id;
    const slug = editing.slug || editing.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const body = { ...editing, slug };

    const res = await fetch("/api/admin/agentes", {
      method: isNew ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Erro ao salvar");
      setSaving(false);
      return;
    }

    const saved = await res.json();
    if (isNew) {
      setAgents(a => [saved, ...a]);
    } else {
      setAgents(a => a.map(ag => ag.id === saved.id ? saved : ag));
    }
    setEditing(null);
    setSaving(false);
  }

  async function toggleActive(agent: Agent) {
    await fetch("/api/admin/agentes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: agent.id, active: !agent.active }),
    });
    setAgents(a => a.map(ag => ag.id === agent.id ? { ...ag, active: !ag.active } : ag));
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Agentes IA</h1>
          <p className="text-gray-500 text-sm mt-1">
            {agents.filter(a => a.active).length} ativos · {agents.length} total · exibindo {filtered.length}
          </p>
        </div>
        <button
          onClick={() => setEditing({ ...empty })}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo agente
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome ou descrição..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500"
          />
        </div>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
          className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm text-gray-300 focus:outline-none focus:border-indigo-500">
          <option value="all">Todas categorias</option>
          {categorias.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as "all"|"active"|"inactive")}
          className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm text-gray-300 focus:outline-none focus:border-indigo-500">
          <option value="all">Ativos + Inativos</option>
          <option value="active">Somente ativos</option>
          <option value="inactive">Somente inativos</option>
        </select>
        <select value={filterPremium} onChange={e => setFilterPremium(e.target.value as "all"|"premium"|"free")}
          className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm text-gray-300 focus:outline-none focus:border-indigo-500">
          <option value="all">Premium + Free</option>
          <option value="premium">Somente premium</option>
          <option value="free">Somente free</option>
        </select>
        {(search || filterCat !== "all" || filterStatus !== "all" || filterPremium !== "all") && (
          <button onClick={() => { setSearch(""); setFilterCat("all"); setFilterStatus("all"); setFilterPremium("all"); }}
            className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm text-gray-400 hover:text-white transition-colors">
            Limpar filtros
          </button>
        )}
      </div>

      <div className="rounded-xl border border-white/5 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5 bg-white/3">
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Agente</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium hidden sm:table-cell">Categoria</th>
              <th className="text-right px-4 py-3 text-gray-500 font-medium hidden md:table-cell">Semana</th>
              <th className="text-right px-4 py-3 text-gray-500 font-medium hidden md:table-cell">Total msgs</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="text-center py-8 text-gray-500 text-sm">Nenhum agente encontrado com os filtros aplicados.</td></tr>
            )}
            {filtered.map(agent => {
              const cat = categorias.find(c => c.id === agent.categoria);
              const weekMsgs = usageWeekMap[agent.id] ?? 0;
              const totalMsgs = usageTotalMap[agent.id] ?? 0;
              return (
                <tr key={agent.id} className="hover:bg-white/3 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ backgroundColor: agent.color + "33", color: agent.color }}>
                        {agent.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium">{agent.name}</p>
                        <p className="text-gray-500 text-xs truncate max-w-48">{agent.description}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs hidden sm:table-cell">{cat?.label ?? "—"}</td>
                  <td className="px-4 py-3 text-right hidden md:table-cell">
                    {weekMsgs > 0
                      ? <span className="text-xs font-semibold text-indigo-400">{weekMsgs}</span>
                      : <span className="text-xs text-gray-700">—</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-right hidden md:table-cell">
                    {totalMsgs > 0
                      ? <span className="text-xs text-gray-400 tabular-nums">{totalMsgs}</span>
                      : <span className="text-xs text-gray-700">—</span>
                    }
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleActive(agent)}>
                      {agent.active
                        ? <ToggleRight className="w-5 h-5 text-green-400" />
                        : <ToggleLeft className="w-5 h-5 text-gray-600" />}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => setEditing({ ...agent })} className="text-gray-500 hover:text-indigo-400 transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-[#0d1117] border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-white/5">
              <h2 className="font-semibold">{editing.id ? "Editar agente" : "Novo agente"}</h2>
              <button onClick={() => setEditing(null)} className="text-gray-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Nome *</label>
                <input
                  value={editing.name ?? ""}
                  onChange={e => setEditing(v => ({ ...v, name: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  placeholder="Ex: Especialista Tributário CESPE"
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">Descrição</label>
                <input
                  value={editing.description ?? ""}
                  onChange={e => setEditing(v => ({ ...v, description: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  placeholder="Breve descrição do especialista"
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">Categoria</label>
                <select
                  value={editing.categoria ?? ""}
                  onChange={e => setEditing(v => ({ ...v, categoria: e.target.value || null }))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Nenhuma</option>
                  {categorias.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">Cor</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setEditing(v => ({ ...v, color: c }))}
                      className={cn("w-7 h-7 rounded-full transition-transform hover:scale-110", editing.color === c && "ring-2 ring-white ring-offset-2 ring-offset-[#0d1117]")}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">System Prompt (opcional)</label>
                <textarea
                  value={editing.systemPrompt ?? ""}
                  onChange={e => setEditing(v => ({ ...v, systemPrompt: e.target.value }))}
                  rows={5}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 resize-none font-mono"
                  placeholder="Deixe em branco para usar o prompt gerado automaticamente pela categoria/banca"
                />
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={editing.active ?? true}
                    onChange={e => setEditing(v => ({ ...v, active: e.target.checked }))}
                    className="w-4 h-4 rounded accent-indigo-500"
                  />
                  <span className="text-sm text-gray-300">Ativo</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={editing.isPremium ?? false}
                    onChange={e => setEditing(v => ({ ...v, isPremium: e.target.checked }))}
                    className="w-4 h-4 rounded accent-orange-500"
                  />
                  <span className="text-sm text-gray-300">Premium</span>
                </label>
              </div>

              {error && <p className="text-red-400 text-xs">{error}</p>}
            </div>

            <div className="flex gap-3 p-5 border-t border-white/5">
              <button onClick={() => setEditing(null)} className="flex-1 py-2 rounded-lg border border-white/10 text-sm text-gray-400 hover:text-white transition-colors">
                Cancelar
              </button>
              <button
                onClick={save}
                disabled={saving || !editing.name?.trim()}
                className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
