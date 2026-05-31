"use client";

import { useState, useCallback, useEffect } from "react";
import { Trash2, FileText, Pencil, Search, X, Loader2, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface Doc {
  id: string; title: string; description?: string;
  subjectId?: string; topicId?: string; storagePath: string;
  fileSize: number; pageCount?: number; planLevel: string;
  createdAt: string; updatedAt: string;
  Subject?: { name: string; categoria: string } | null;
}

const PLAN_LEVELS = ["trial", "focado", "aprovacao", "elite"];
const PLAN_LABELS: Record<string, string> = {
  trial: "Todos (Trial)", focado: "Focado+", aprovacao: "Aprovação+", elite: "Elite",
};

function formatSize(bytes: number) {
  if (!bytes) return "—";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(iso));
}

export function BibliotecaAdminClient() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategoria, setFilterCategoria] = useState("");
  const [filterPlan, setFilterPlan] = useState("");
  const [editDoc, setEditDoc] = useState<Doc | null>(null);
  const [editForm, setEditForm] = useState({ title: "", description: "", planLevel: "trial" });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  const showToast = (msg: string, type: "ok" | "err") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/biblioteca");
      const d = await res.json();
      setDocs(d.docs ?? []);
      setTotal(d.total ?? 0);
    } catch { showToast("Erro ao carregar", "err"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const categorias = [...new Set(docs.map(d => d.Subject?.categoria).filter(Boolean))] as string[];

  const filtered = docs.filter(d => {
    const matchSearch = !search || d.title.toLowerCase().includes(search.toLowerCase()) ||
      d.Subject?.name?.toLowerCase().includes(search.toLowerCase());
    const matchCat = !filterCategoria || d.Subject?.categoria === filterCategoria;
    const matchPlan = !filterPlan || d.planLevel === filterPlan;
    return matchSearch && matchCat && matchPlan;
  });

  function openEdit(doc: Doc) {
    setEditDoc(doc);
    setEditForm({ title: doc.title, description: doc.description ?? "", planLevel: doc.planLevel });
  }

  async function handleSave() {
    if (!editDoc) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/biblioteca", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editDoc.id, ...editForm }),
      });
      if (res.ok) {
        setDocs(prev => prev.map(d => d.id === editDoc.id ? { ...d, ...editForm } : d));
        setEditDoc(null);
        showToast("Salvo com sucesso", "ok");
      } else showToast("Erro ao salvar", "err");
    } finally { setSaving(false); }
  }

  async function handleDelete(doc: Doc) {
    if (!confirm(`Excluir "${doc.title}"? O arquivo será removido do storage.`)) return;
    setDeleting(doc.id);
    try {
      const res = await fetch("/api/admin/biblioteca", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: doc.id }),
      });
      if (res.ok) {
        setDocs(prev => prev.filter(d => d.id !== doc.id));
        setTotal(t => t - 1);
        showToast("Excluído", "ok");
      } else showToast("Erro ao excluir", "err");
    } finally { setDeleting(null); }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {toast && (
        <div className={cn("fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-xl",
          toast.type === "ok" ? "bg-emerald-600 text-white" : "bg-red-600 text-white")}>
          {toast.msg}
        </div>
      )}

      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-indigo-400" /> Biblioteca PDF
          </h1>
          <p className="text-slate-400 text-sm mt-1">{total} documentos · {filtered.length} exibidos</p>
        </div>
        <button onClick={load} className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm">Atualizar</button>
      </div>

      {/* Stats por plano */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {PLAN_LEVELS.map(level => (
          <div key={level} className="bg-slate-900/60 border border-slate-700 rounded-xl p-4 text-center cursor-pointer hover:border-indigo-500/50 transition-colors"
            onClick={() => setFilterPlan(filterPlan === level ? "" : level)}>
            <p className={cn("text-2xl font-black", filterPlan === level ? "text-indigo-400" : "text-white")}>
              {docs.filter(d => d.planLevel === level).length}
            </p>
            <p className="text-xs text-slate-500 mt-1">{PLAN_LABELS[level]}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por título ou matéria..."
            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500" />
          {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="w-3.5 h-3.5 text-slate-500" /></button>}
        </div>
        <select value={filterCategoria} onChange={e => setFilterCategoria(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500">
          <option value="">Todas as categorias</option>
          {categorias.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        {(search || filterCategoria || filterPlan) && (
          <button onClick={() => { setSearch(""); setFilterCategoria(""); setFilterPlan(""); }}
            className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm flex items-center gap-1">
            <X className="w-3.5 h-3.5" /> Limpar filtros
          </button>
        )}
      </div>

      {/* Tabela */}
      {loading ? (
        <div className="flex items-center justify-center h-40 gap-3 text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin" /> Carregando...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Nenhum documento encontrado</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800/80 text-slate-400 text-xs uppercase tracking-wider">
                <th className="px-4 py-3 text-left">Documento</th>
                <th className="px-4 py-3 text-left">Matéria / Categoria</th>
                <th className="px-4 py-3 text-left">Acesso</th>
                <th className="px-4 py-3 text-left">Tamanho</th>
                <th className="px-4 py-3 text-left">Criado</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filtered.map(doc => (
                <tr key={doc.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-red-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-white font-medium truncate max-w-xs">{doc.title}</p>
                        {doc.description && <p className="text-slate-500 text-xs truncate max-w-xs">{doc.description}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-slate-300 text-xs">{doc.Subject?.name ?? "—"}</p>
                    <p className="text-slate-600 text-xs">{doc.Subject?.categoria ?? ""}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium",
                      doc.planLevel === "trial" ? "bg-teal-500/10 text-teal-400" :
                      doc.planLevel === "elite" ? "bg-yellow-500/10 text-yellow-400" :
                      "bg-indigo-500/10 text-indigo-400")}>
                      {PLAN_LABELS[doc.planLevel] ?? doc.planLevel}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{formatSize(doc.fileSize)}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{formatDate(doc.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => openEdit(doc)} title="Editar"
                        className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(doc)} disabled={deleting === doc.id} title="Excluir"
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors disabled:opacity-50">
                        {deleting === doc.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Editar */}
      {editDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#0f111a] rounded-2xl border border-white/10 shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08]">
              <h3 className="font-semibold text-white">Editar Documento</h3>
              <button onClick={() => setEditDoc(null)} className="text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Título</label>
                <input value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Descrição</label>
                <textarea value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                  rows={3} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 resize-none" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Nível de acesso</label>
                <select value={editForm.planLevel} onChange={e => setEditForm(f => ({ ...f, planLevel: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500">
                  {PLAN_LEVELS.map(p => <option key={p} value={p}>{PLAN_LABELS[p]}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 px-5 pb-5">
              <button onClick={() => setEditDoc(null)} className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm">Cancelar</button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />} Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
