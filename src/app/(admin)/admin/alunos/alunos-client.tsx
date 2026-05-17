"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { UserPlus, Crown, Trash2, ChevronDown, X, AlertCircle, CheckCircle2, Search, BarChart2, Loader2, Target, Layers, ClipboardList, Flame, Zap } from "lucide-react";

interface User { id: string; name: string; email: string; role: string; createdAt: string; }
interface Plan { id: string; name: string; slug: string; }

interface Props {
  users: User[];
  plans: Plan[];
  planMap: Record<string, string>;
  subMap: Record<string, string>; // userId → planId
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#0d1117] border border-white/10 rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <h2 className="font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export function AlunosClient({ users: initialUsers, plans, planMap, subMap: initialSubMap }: Props) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [subMap, setSubMap] = useState(initialSubMap);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [planModal, setPlanModal] = useState<User | null>(null);
  const [deleteModal, setDeleteModal] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  // Stats drawer
  interface StudentStats {
    totalQuestoes: number; accuracy: number; q30: number; acc30: number; q7: number;
    streak: number; xp: number; cargo: string | null; dataProva: string | null;
    totalFlashcards: number; flashcardsDueHoje: number;
    totalSimulados: number; mediaSimulados: number;
    plan: { name: string; status: string; startDate: string; endDate: string } | null;
    topSubjects: { name: string; correct: number; total: number; accuracy: number }[];
  }
  const [statsUser, setStatsUser] = useState<User | null>(null);
  const [statsData, setStatsData] = useState<StudentStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  async function openStats(u: User) {
    setStatsUser(u);
    setStatsData(null);
    setStatsLoading(true);
    const res = await fetch(`/api/admin/alunos/${u.id}/stats`);
    if (res.ok) setStatsData(await res.json());
    setStatsLoading(false);
  }

  // Form criar aluno
  const [form, setForm] = useState({ name: "", email: "", password: "", planId: "" });

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/admin/alunos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error ?? "Erro ao criar aluno", false); return; }
      showToast("Aluno criado com sucesso!");
      setShowCreate(false);
      setForm({ name: "", email: "", password: "", planId: "" });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleChangePlan(userId: string, planId: string) {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/alunos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, planId }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error ?? "Erro", false); return; }
      setSubMap(m => ({ ...m, [userId]: planId }));
      setPlanModal(null);
      showToast(planId ? `Plano atribuído: ${planMap[planId]}` : "Plano removido");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(userId: string) {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/alunos", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error ?? "Erro", false); return; }
      setUsers(u => u.filter(x => x.id !== userId));
      setDeleteModal(null);
      showToast("Aluno removido");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8 text-white">
      {/* Toast */}
      {toast && (
        <div className={cn(
          "fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium",
          toast.ok ? "bg-green-500/20 border border-green-500/30 text-green-300" : "bg-red-500/20 border border-red-500/30 text-red-300"
        )}>
          {toast.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Alunos</h1>
          <p className="text-gray-500 text-sm mt-1">{users.length} usuários cadastrados</p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/api/admin/alunos/export"
            download="alunos.csv"
            className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-medium transition-colors text-gray-300"
          >
            <Zap className="w-4 h-4 text-amber-400" /> Exportar CSV
          </a>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-sm font-medium transition-colors"
          >
            <UserPlus className="w-4 h-4" /> Criar Aluno
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nome ou e-mail..."
          className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500"
        />
      </div>

      {/* Tabela */}
      <div className="rounded-xl border border-white/5 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5 bg-white/3">
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Aluno</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Plano</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Função</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Cadastro</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.map(u => {
              const currentPlanId = subMap[u.id];
              const currentPlanName = currentPlanId ? planMap[currentPlanId] : null;
              return (
                <tr key={u.id} className="hover:bg-white/3 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-indigo-600/20 flex items-center justify-center text-xs font-bold text-indigo-400 flex-shrink-0">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-white truncate">{u.name}</p>
                        <p className="text-gray-500 text-xs truncate">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {currentPlanName ? (
                      <span className="flex items-center gap-1 text-orange-400 text-xs font-medium">
                        <Crown className="w-3 h-3" /> {currentPlanName}
                      </span>
                    ) : (
                      <span className="text-gray-600 text-xs">Gratuito</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded-full",
                      u.role === "ADMIN" ? "bg-red-500/20 text-red-400" : "bg-white/5 text-gray-500"
                    )}>
                      {u.role === "ADMIN" ? "Admin" : "Aluno"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {new Date(u.createdAt).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openStats(u)}
                        className="p-1.5 rounded-lg text-gray-600 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                        title="Ver métricas"
                      >
                        <BarChart2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setPlanModal(u)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs hover:bg-indigo-500/20 transition-colors"
                      >
                        <Crown className="w-3 h-3" />
                        {currentPlanName ? "Mudar plano" : "Atribuir plano"}
                        <ChevronDown className="w-3 h-3" />
                      </button>
                      {u.role !== "ADMIN" && (
                        <button
                          onClick={() => setDeleteModal(u)}
                          className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Remover aluno"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-600">Nenhum aluno encontrado</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: Criar Aluno */}
      {showCreate && (
        <Modal title="Criar novo aluno" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Nome completo</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                required
                placeholder="João Silva"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">E-mail</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                required
                placeholder="joao@email.com"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Senha inicial</label>
              <input
                type="password"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                required
                minLength={6}
                placeholder="mínimo 6 caracteres"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Plano (opcional)</label>
              <select
                value={form.planId}
                onChange={e => setForm(f => ({ ...f, planId: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="">Sem plano (Gratuito)</option>
                {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowCreate(false)}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-400 hover:text-white text-sm transition-colors">
                Cancelar
              </button>
              <button type="submit" disabled={loading}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium transition-colors">
                {loading ? "Criando..." : "Criar aluno"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Atribuir Plano */}
      {planModal && (
        <Modal title={`Plano — ${planModal.name}`} onClose={() => setPlanModal(null)}>
          <p className="text-xs text-gray-500 mb-4">{planModal.email}</p>
          <div className="space-y-2">
            <button
              onClick={() => handleChangePlan(planModal.id, "")}
              disabled={loading}
              className={cn(
                "w-full text-left px-4 py-3 rounded-xl border text-sm transition-colors",
                !subMap[planModal.id]
                  ? "border-indigo-500/50 bg-indigo-500/10 text-indigo-300"
                  : "border-white/10 hover:border-white/20 text-gray-400"
              )}
            >
              <p className="font-medium">Gratuito</p>
              <p className="text-xs text-gray-600 mt-0.5">Sem plano ativo</p>
            </button>
            {plans.map(p => (
              <button
                key={p.id}
                onClick={() => handleChangePlan(planModal.id, p.id)}
                disabled={loading}
                className={cn(
                  "w-full text-left px-4 py-3 rounded-xl border text-sm transition-colors",
                  subMap[planModal.id] === p.id
                    ? "border-orange-500/50 bg-orange-500/10 text-orange-300"
                    : "border-white/10 hover:border-white/20 text-gray-400"
                )}
              >
                <div className="flex items-center gap-2">
                  <Crown className={cn("w-3.5 h-3.5", subMap[planModal.id] === p.id ? "text-orange-400" : "text-gray-600")} />
                  <p className="font-medium">{p.name}</p>
                  {subMap[planModal.id] === p.id && <span className="ml-auto text-xs text-orange-400">Atual</span>}
                </div>
              </button>
            ))}
          </div>
          {loading && <p className="text-xs text-gray-500 text-center mt-3">Salvando...</p>}
        </Modal>
      )}

      {/* Modal: Confirmar exclusão */}
      {deleteModal && (
        <Modal title="Remover aluno" onClose={() => setDeleteModal(null)}>
          <p className="text-sm text-gray-300 mb-1">Tem certeza que deseja remover:</p>
          <p className="font-semibold text-white mb-1">{deleteModal.name}</p>
          <p className="text-xs text-gray-500 mb-5">{deleteModal.email}</p>
          <p className="text-xs text-red-400 mb-5 flex items-start gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            Esta ação é irreversível. Remove o acesso e todos os dados do aluno.
          </p>
          <div className="flex gap-3">
            <button onClick={() => setDeleteModal(null)}
              className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-400 hover:text-white text-sm transition-colors">
              Cancelar
            </button>
            <button onClick={() => handleDelete(deleteModal.id)} disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-sm font-medium transition-colors">
              {loading ? "Removendo..." : "Sim, remover"}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Drawer: Stats do aluno ──────────────────────────────── */}
      {statsUser && (
        <div className="fixed inset-0 z-50 flex" onClick={() => setStatsUser(null)}>
          <div className="flex-1 bg-black/50" />
          <div
            className="w-full max-w-sm bg-[#0d1117] border-l border-white/10 h-full overflow-y-auto flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 flex-shrink-0">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-blue-400" />
                <div>
                  <p className="font-semibold text-sm">{statsUser.name}</p>
                  <p className="text-xs text-gray-500">{statsUser.email}</p>
                </div>
              </div>
              <button onClick={() => setStatsUser(null)} className="text-gray-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 flex-1">
              {statsLoading && (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                </div>
              )}

              {!statsLoading && !statsData && (
                <p className="text-gray-500 text-sm text-center py-10">Erro ao carregar métricas</p>
              )}

              {!statsLoading && statsData && (
                <div className="space-y-4">
                  {/* Plano */}
                  <div className="rounded-xl bg-white/3 border border-white/5 p-4">
                    <p className="text-xs text-gray-500 mb-2 flex items-center gap-1.5">
                      <Crown className="w-3 h-3 text-amber-400" /> Assinatura
                    </p>
                    {statsData.plan ? (
                      <div>
                        <p className="font-semibold text-amber-400">{statsData.plan.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {new Date(statsData.plan.startDate).toLocaleDateString("pt-BR")} →{" "}
                          {new Date(statsData.plan.endDate).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">Sem assinatura ativa</p>
                    )}
                    {statsData.cargo && (
                      <p className="text-xs text-indigo-400 mt-1">🎯 {statsData.cargo}</p>
                    )}
                    {statsData.dataProva && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        Prova: {new Date(statsData.dataProva).toLocaleDateString("pt-BR")}
                      </p>
                    )}
                  </div>

                  {/* KPIs */}
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { icon: Target,       label: "Total questões",   value: statsData.totalQuestoes,         color: "text-blue-400" },
                      { icon: CheckCircle2, label: "Acerto geral",     value: `${statsData.accuracy}%`,        color: statsData.accuracy >= 70 ? "text-green-400" : statsData.accuracy >= 50 ? "text-amber-400" : "text-red-400" },
                      { icon: Target,       label: "Questões 30d",     value: statsData.q30,                   color: "text-indigo-400" },
                      { icon: Target,       label: "Acerto 30d",       value: `${statsData.acc30}%`,           color: statsData.acc30 >= 70 ? "text-green-400" : statsData.acc30 >= 50 ? "text-amber-400" : "text-red-400" },
                      { icon: Flame,        label: "Streak",           value: `${statsData.streak}d`,          color: "text-orange-400" },
                      { icon: Zap,          label: "XP total",         value: statsData.xp,                    color: "text-yellow-400" },
                      { icon: Layers,       label: "Flashcards",       value: statsData.totalFlashcards,       color: "text-purple-400" },
                      { icon: ClipboardList,label: "Simulados",        value: statsData.totalSimulados,        color: "text-teal-400" },
                    ].map(({ icon: Icon, label, value, color }) => (
                      <div key={label} className="rounded-xl bg-white/3 border border-white/5 p-3">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Icon className={`w-3 h-3 ${color}`} />
                          <span className="text-[10px] text-gray-500">{label}</span>
                        </div>
                        <p className={`text-xl font-bold tabular-nums ${color}`}>{value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Top matérias */}
                  {statsData.topSubjects.length > 0 && (
                    <div className="rounded-xl bg-white/3 border border-white/5 p-4">
                      <p className="text-xs text-gray-500 mb-3">Top matérias (por volume)</p>
                      <div className="space-y-2.5">
                        {statsData.topSubjects.map(s => (
                          <div key={s.name}>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-gray-300 truncate max-w-[160px]">{s.name}</span>
                              <span className={s.accuracy >= 70 ? "text-green-400" : s.accuracy >= 50 ? "text-amber-400" : "text-red-400"}>
                                {s.accuracy}% <span className="text-gray-600">({s.total})</span>
                              </span>
                            </div>
                            <div className="h-1 rounded-full bg-white/8">
                              <div className={`h-full rounded-full ${s.accuracy >= 70 ? "bg-green-500" : s.accuracy >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                                style={{ width: `${s.accuracy}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Flashcards due */}
                  {statsData.flashcardsDueHoje > 0 && (
                    <div className="rounded-xl bg-amber-500/5 border border-amber-500/15 p-3 flex items-center gap-2">
                      <Layers className="w-4 h-4 text-amber-400 flex-shrink-0" />
                      <p className="text-xs text-amber-300">
                        <strong>{statsData.flashcardsDueHoje}</strong> flashcard{statsData.flashcardsDueHoje > 1 ? "s" : ""} para revisão hoje
                      </p>
                    </div>
                  )}

                  {statsData.totalSimulados > 0 && (
                    <div className="rounded-xl bg-white/3 border border-white/5 p-3 flex items-center justify-between">
                      <span className="text-xs text-gray-400">Média nos simulados</span>
                      <span className={`text-sm font-bold ${statsData.mediaSimulados >= 70 ? "text-green-400" : statsData.mediaSimulados >= 50 ? "text-amber-400" : "text-red-400"}`}>
                        {statsData.mediaSimulados}%
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
