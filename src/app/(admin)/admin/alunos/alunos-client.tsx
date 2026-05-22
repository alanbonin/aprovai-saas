"use client";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  UserPlus, Crown, Trash2, ChevronDown, X, AlertCircle, CheckCircle2,
  Search, BarChart2, Loader2, Target, Layers, ClipboardList, Flame, Zap,
  Pencil, Check, Square, CheckSquare, ShieldAlert, KeyRound,
} from "lucide-react";

interface User { id: string; name: string; email: string; role: string; createdAt: string; }
interface Plan { id: string; name: string; slug: string; }
interface Props {
  users: User[];
  plans: Plan[];
  planMap: Record<string, string>;
  subMap: Record<string, string>;
}

function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className={cn("w-full bg-[#0d1117] border border-white/10 rounded-2xl shadow-2xl", wide ? "max-w-lg" : "max-w-md")}>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-gray-400 mb-1.5 font-medium">{label}</label>
      {children}
    </div>
  );
}

const INPUT = "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors";

export function AlunosClient({ users: initialUsers, plans, planMap, subMap: initialSubMap }: Props) {
  const [users, setUsers] = useState(initialUsers);
  const [subMap, setSubMap] = useState(initialSubMap);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  // Seleção múltipla
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Modais
  const [showCreate, setShowCreate] = useState(false);
  const [planModal, setPlanModal] = useState<User | null>(null);
  const [deleteModal, setDeleteModal] = useState<User | null>(null);
  const [editModal, setEditModal] = useState<User | null>(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

  // Form criar aluno
  const [form, setForm] = useState({ name: "", email: "", password: "", planId: "" });

  // Form editar aluno
  const [editForm, setEditForm] = useState({ name: "", email: "", newPassword: "" });

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

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  const filtered = useMemo(() =>
    users.filter(u =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
    ), [users, search]);

  // ── Seleção ─────────────────────────────────────────────────────────
  const selectableIds = filtered.filter(u => u.role !== "ADMIN").map(u => u.id);
  const allSelected = selectableIds.length > 0 && selectableIds.every(id => selected.has(id));
  const someSelected = selectableIds.some(id => selected.has(id));

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(selectableIds));
    }
  }

  function toggleOne(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  // ── Stats ────────────────────────────────────────────────────────────
  async function openStats(u: User) {
    setStatsUser(u); setStatsData(null); setStatsLoading(true);
    const res = await fetch(`/api/admin/alunos/${u.id}/stats`);
    if (res.ok) setStatsData(await res.json());
    setStatsLoading(false);
  }

  // ── Criar aluno ──────────────────────────────────────────────────────
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
      if (data.user) {
        setUsers(prev => [data.user, ...prev]);
        if (form.planId) setSubMap(m => ({ ...m, [data.user.id]: form.planId }));
      }
      showToast("Aluno criado com sucesso!");
      setShowCreate(false);
      setForm({ name: "", email: "", password: "", planId: "" });
    } finally { setLoading(false); }
  }

  // ── Editar aluno ─────────────────────────────────────────────────────
  function openEdit(u: User) {
    setEditModal(u);
    setEditForm({ name: u.name, email: u.email, newPassword: "" });
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editModal) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/alunos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "editUser",
          userId: editModal.id,
          name: editForm.name || undefined,
          email: editForm.email || undefined,
          newPassword: editForm.newPassword || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error ?? "Erro ao editar", false); return; }
      setUsers(prev => prev.map(u => u.id === editModal.id
        ? { ...u, name: editForm.name || u.name, email: editForm.email || u.email }
        : u));
      setEditModal(null);
      showToast("Dados atualizados!");
    } finally { setLoading(false); }
  }

  // ── Mudar plano ──────────────────────────────────────────────────────
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
      showToast(planId ? `Plano: ${planMap[planId]}` : "Plano removido");
    } finally { setLoading(false); }
  }

  // ── Excluir 1 ────────────────────────────────────────────────────────
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
      setSelected(prev => { const next = new Set(prev); next.delete(userId); return next; });
      setDeleteModal(null);
      showToast("Aluno removido");
    } finally { setLoading(false); }
  }

  // ── Excluir em lote ──────────────────────────────────────────────────
  async function handleBulkDelete() {
    const userIds = [...selected];
    setLoading(true);
    try {
      const res = await fetch("/api/admin/alunos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "bulkDelete", userIds }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error ?? "Erro", false); return; }
      setUsers(prev => prev.filter(u => !userIds.includes(u.id)));
      setSelected(new Set());
      setBulkDeleteConfirm(false);
      showToast(`${userIds.length} aluno(s) removido(s)`);
    } finally { setLoading(false); }
  }

  return (
    <div className="p-8 text-white">
      {/* Toast */}
      {toast && (
        <div className={cn(
          "fixed top-4 right-4 z-[100] flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium",
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
          <a href="/api/admin/alunos/export" download="alunos.csv"
            className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-medium transition-colors text-gray-300">
            <Zap className="w-4 h-4 text-amber-400" /> Exportar CSV
          </a>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-sm font-medium transition-colors">
            <UserPlus className="w-4 h-4" /> Criar Aluno
          </button>
        </div>
      </div>

      {/* Barra de busca + ações em lote */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome ou e-mail..."
            className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500" />
        </div>

        {/* Barra de seleção múltipla */}
        {someSelected && (
          <div className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border border-indigo-500/30 rounded-xl">
            <Check className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-sm text-indigo-300 font-medium">{selected.size} selecionado(s)</span>
            <button
              onClick={() => setBulkDeleteConfirm(true)}
              className="flex items-center gap-1.5 ml-2 px-2.5 py-1 bg-red-500/15 border border-red-500/30 rounded-lg text-xs text-red-400 hover:bg-red-500/25 transition-colors font-medium"
            >
              <Trash2 className="w-3 h-3" /> Excluir selecionados
            </button>
            <button onClick={() => setSelected(new Set())}
              className="text-gray-500 hover:text-white ml-1">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Tabela */}
      <div className="rounded-xl border border-white/5 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5 bg-white/[0.02]">
              <th className="px-4 py-3 w-8">
                <button onClick={toggleAll} className="text-gray-500 hover:text-white transition-colors">
                  {allSelected
                    ? <CheckSquare className="w-4 h-4 text-indigo-400" />
                    : someSelected
                      ? <CheckSquare className="w-4 h-4 text-indigo-400/50" />
                      : <Square className="w-4 h-4" />}
                </button>
              </th>
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
              const isChecked = selected.has(u.id);
              const isAdmin = u.role === "ADMIN";
              return (
                <tr key={u.id} className={cn("hover:bg-white/[0.02] transition-colors", isChecked && "bg-indigo-500/5")}>
                  <td className="px-4 py-3">
                    {!isAdmin && (
                      <button onClick={() => toggleOne(u.id)} className="text-gray-500 hover:text-white transition-colors">
                        {isChecked
                          ? <CheckSquare className="w-4 h-4 text-indigo-400" />
                          : <Square className="w-4 h-4" />}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-indigo-600/20 flex items-center justify-center text-xs font-bold text-indigo-400 flex-shrink-0">
                        {(u.name || "?").charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-white truncate">{u.name}</p>
                        <p className="text-gray-500 text-xs truncate">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {currentPlanName
                      ? <span className="flex items-center gap-1 text-orange-400 text-xs font-medium"><Crown className="w-3 h-3" /> {currentPlanName}</span>
                      : <span className="text-gray-600 text-xs">Gratuito</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("text-xs px-2 py-0.5 rounded-full",
                      isAdmin ? "bg-red-500/20 text-red-400" : "bg-white/5 text-gray-500")}>
                      {isAdmin ? "Admin" : "Aluno"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {new Date(u.createdAt).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {/* Stats */}
                      <button onClick={() => openStats(u)}
                        className="p-1.5 rounded-lg text-gray-600 hover:text-blue-400 hover:bg-blue-500/10 transition-colors" title="Ver métricas">
                        <BarChart2 className="w-3.5 h-3.5" />
                      </button>
                      {/* Editar */}
                      {!isAdmin && (
                        <button onClick={() => openEdit(u)}
                          className="p-1.5 rounded-lg text-gray-600 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors" title="Editar aluno">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {/* Plano */}
                      <button onClick={() => setPlanModal(u)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs hover:bg-indigo-500/20 transition-colors">
                        <Crown className="w-3 h-3" />
                        {currentPlanName ? "Mudar plano" : "Atribuir plano"}
                        <ChevronDown className="w-3 h-3" />
                      </button>
                      {/* Excluir */}
                      {!isAdmin && (
                        <button onClick={() => setDeleteModal(u)}
                          className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors" title="Remover aluno">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-600">Nenhum aluno encontrado</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Modal: Criar Aluno ─────────────────────────────────────────── */}
      {showCreate && (
        <Modal title="Criar novo aluno" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            <Field label="Nome completo">
              <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                required placeholder="João Silva" className={INPUT} />
            </Field>
            <Field label="E-mail">
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                required placeholder="joao@email.com" className={INPUT} />
            </Field>
            <Field label="Senha inicial">
              <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                required minLength={6} placeholder="mínimo 6 caracteres" className={INPUT} />
            </Field>
            <Field label="Plano (opcional)">
              <select value={form.planId} onChange={e => setForm(f => ({ ...f, planId: e.target.value }))}
                className={INPUT}>
                <option value="">Sem plano (Gratuito)</option>
                {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowCreate(false)}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-400 hover:text-white text-sm transition-colors">Cancelar</button>
              <button type="submit" disabled={loading}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium transition-colors">
                {loading ? "Criando..." : "Criar aluno"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Modal: Editar Aluno ────────────────────────────────────────── */}
      {editModal && (
        <Modal title={`Editar — ${editModal.name}`} onClose={() => setEditModal(null)} wide>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nome completo">
                <input type="text" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                  placeholder={editModal.name} className={INPUT} />
              </Field>
              <Field label="E-mail">
                <input type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                  placeholder={editModal.email} className={INPUT} />
              </Field>
            </div>

            {/* Redefinir senha */}
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                <p className="text-xs font-medium text-gray-300">Redefinir senha</p>
                <span className="text-[10px] text-gray-600">(deixe em branco para não alterar)</span>
              </div>
              <input type="password" value={editForm.newPassword}
                onChange={e => setEditForm(f => ({ ...f, newPassword: e.target.value }))}
                placeholder="Nova senha (mín. 6 caracteres)"
                minLength={editForm.newPassword ? 6 : undefined}
                className={INPUT} />
              {editForm.newPassword && editForm.newPassword.length < 6 && (
                <p className="text-xs text-red-400">Mínimo 6 caracteres</p>
              )}
            </div>

            {/* Mudar plano inline */}
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
              <div className="flex items-center gap-2 mb-3">
                <Crown className="w-3.5 h-3.5 text-amber-400" />
                <p className="text-xs font-medium text-gray-300">Plano atual:
                  <span className="text-amber-400 ml-1">{subMap[editModal.id] ? planMap[subMap[editModal.id]] : "Gratuito"}</span>
                </p>
                <button type="button" onClick={() => { setEditModal(null); setPlanModal(editModal); }}
                  className="ml-auto text-xs text-indigo-400 hover:underline">Mudar plano →</button>
              </div>
            </div>

            <p className="text-xs text-gray-600">Deixe campos em branco para manter os valores atuais.</p>

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setEditModal(null)}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-400 hover:text-white text-sm transition-colors">Cancelar</button>
              <button type="submit" disabled={loading || (!!editForm.newPassword && editForm.newPassword.length < 6)}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium transition-colors">
                {loading ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" />Salvando...</span> : "Salvar alterações"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Modal: Atribuir Plano ──────────────────────────────────────── */}
      {planModal && (
        <Modal title={`Plano — ${planModal.name}`} onClose={() => setPlanModal(null)}>
          <p className="text-xs text-gray-500 mb-4">{planModal.email}</p>
          <div className="space-y-2">
            <button onClick={() => handleChangePlan(planModal.id, "")} disabled={loading}
              className={cn("w-full text-left px-4 py-3 rounded-xl border text-sm transition-colors",
                !subMap[planModal.id] ? "border-indigo-500/50 bg-indigo-500/10 text-indigo-300" : "border-white/10 hover:border-white/20 text-gray-400")}>
              <p className="font-medium">Gratuito</p>
              <p className="text-xs text-gray-600 mt-0.5">Sem plano ativo</p>
            </button>
            {plans.map(p => (
              <button key={p.id} onClick={() => handleChangePlan(planModal.id, p.id)} disabled={loading}
                className={cn("w-full text-left px-4 py-3 rounded-xl border text-sm transition-colors",
                  subMap[planModal.id] === p.id ? "border-orange-500/50 bg-orange-500/10 text-orange-300" : "border-white/10 hover:border-white/20 text-gray-400")}>
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

      {/* ── Modal: Confirmar exclusão simples ─────────────────────────── */}
      {deleteModal && (
        <Modal title="Remover aluno" onClose={() => setDeleteModal(null)}>
          <p className="text-sm text-gray-300 mb-1">Tem certeza que deseja remover:</p>
          <p className="font-semibold text-white mb-1">{deleteModal.name}</p>
          <p className="text-xs text-gray-500 mb-4">{deleteModal.email}</p>
          <p className="text-xs text-red-400 mb-5 flex items-start gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            Esta ação é irreversível. Remove o acesso e todos os dados do aluno.
          </p>
          <div className="flex gap-3">
            <button onClick={() => setDeleteModal(null)}
              className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-400 hover:text-white text-sm transition-colors">Cancelar</button>
            <button onClick={() => handleDelete(deleteModal.id)} disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-sm font-medium transition-colors">
              {loading ? "Removendo..." : "Sim, remover"}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Modal: Confirmar exclusão em lote ─────────────────────────── */}
      {bulkDeleteConfirm && (
        <Modal title="Excluir em lote" onClose={() => setBulkDeleteConfirm(false)}>
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/5 border border-red-500/20 mb-5">
            <ShieldAlert className="w-8 h-8 text-red-400 flex-shrink-0" />
            <div>
              <p className="font-semibold text-white text-sm mb-0.5">{selected.size} aluno(s) serão removidos</p>
              <p className="text-xs text-gray-400">Todos os dados, progresso e histórico serão apagados permanentemente.</p>
            </div>
          </div>
          <p className="text-xs text-red-400 mb-5 flex items-start gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            Esta ação é irreversível e não pode ser desfeita.
          </p>
          <div className="flex gap-3">
            <button onClick={() => setBulkDeleteConfirm(false)}
              className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-400 hover:text-white text-sm transition-colors">Cancelar</button>
            <button onClick={handleBulkDelete} disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-sm font-medium transition-colors flex items-center justify-center gap-2">
              {loading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Removendo...</> : `Remover ${selected.size} aluno(s)`}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Drawer: Stats do aluno ─────────────────────────────────────── */}
      {statsUser && (
        <div className="fixed inset-0 z-50 flex" onClick={() => setStatsUser(null)}>
          <div className="flex-1 bg-black/50" />
          <div className="w-full max-w-sm bg-[#0d1117] border-l border-white/10 h-full overflow-y-auto flex flex-col"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 flex-shrink-0">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-blue-400" />
                <div>
                  <p className="font-semibold text-sm">{statsUser.name}</p>
                  <p className="text-xs text-gray-500">{statsUser.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => { setStatsUser(null); openEdit(statsUser); }}
                  className="p-1.5 rounded-lg text-gray-500 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors" title="Editar">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => setStatsUser(null)} className="text-gray-500 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-5 flex-1">
              {statsLoading && <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 text-blue-400 animate-spin" /></div>}
              {!statsLoading && !statsData && <p className="text-gray-500 text-sm text-center py-10">Erro ao carregar métricas</p>}
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
                          {new Date(statsData.plan.startDate).toLocaleDateString("pt-BR")} → {new Date(statsData.plan.endDate).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                    ) : <p className="text-gray-500 text-sm">Sem assinatura ativa</p>}
                    {statsData.cargo && <p className="text-xs text-indigo-400 mt-1">🎯 {statsData.cargo}</p>}
                    {statsData.dataProva && <p className="text-xs text-gray-500 mt-0.5">Prova: {new Date(statsData.dataProva).toLocaleDateString("pt-BR")}</p>}
                  </div>

                  {/* KPIs */}
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { icon: Target,        label: "Total questões", value: statsData.totalQuestoes,   color: "text-blue-400" },
                      { icon: CheckCircle2,  label: "Acerto geral",   value: `${statsData.accuracy}%`,  color: statsData.accuracy >= 70 ? "text-green-400" : statsData.accuracy >= 50 ? "text-amber-400" : "text-red-400" },
                      { icon: Target,        label: "Questões 30d",   value: statsData.q30,             color: "text-indigo-400" },
                      { icon: Target,        label: "Acerto 30d",     value: `${statsData.acc30}%`,     color: statsData.acc30 >= 70 ? "text-green-400" : statsData.acc30 >= 50 ? "text-amber-400" : "text-red-400" },
                      { icon: Flame,         label: "Streak",         value: `${statsData.streak}d`,    color: "text-orange-400" },
                      { icon: Zap,           label: "XP total",       value: statsData.xp,              color: "text-yellow-400" },
                      { icon: Layers,        label: "Flashcards",     value: statsData.totalFlashcards, color: "text-purple-400" },
                      { icon: ClipboardList, label: "Simulados",      value: statsData.totalSimulados,  color: "text-teal-400" },
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
