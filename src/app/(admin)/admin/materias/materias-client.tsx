"use client";
import { useState } from "react";
import { Plus, Edit2, X, Check, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface Subject {
  id: string; name: string; slug: string; categoria: string | null;
  description: string | null; ordem: number;
}
interface Props {
  subjects: Subject[];
  categorias: { id: string; label: string }[];
}

const empty = { name: "", slug: "", categoria: "", description: "", ordem: 0 };

export function MateriasAdmin({ subjects: initial, categorias }: Props) {
  const [subjects, setSubjects] = useState(initial);
  const [editing, setEditing] = useState<Partial<Subject> | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [filterCat, setFilterCat] = useState("");

  const filtered = filterCat ? subjects.filter(s => s.categoria === filterCat) : subjects;

  // Agrupar por categoria
  const groups: Record<string, Subject[]> = {};
  filtered.forEach(s => {
    const cat = s.categoria ?? "sem-categoria";
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(s);
  });

  async function save() {
    if (!editing?.name?.trim()) return;
    setSaving(true);
    setError("");

    const slug = editing.slug || editing.name.toLowerCase()
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

    const isNew = !editing.id;
    const res = await fetch("/api/admin/materias", {
      method: isNew ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...editing, slug }),
    });

    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Erro ao salvar");
      setSaving(false);
      return;
    }

    const saved = await res.json();
    if (isNew) setSubjects(s => [...s, saved].sort((a, b) => a.ordem - b.ordem));
    else setSubjects(s => s.map(sub => sub.id === saved.id ? saved : sub));
    setEditing(null);
    setSaving(false);
  }

  async function remove(id: string) {
    if (!confirm("Remover esta matéria? Questões e materiais vinculados perderão a referência.")) return;
    await fetch("/api/admin/materias", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setSubjects(s => s.filter(sub => sub.id !== id));
  }

  return (
    <>
      <div className="flex items-center gap-3 mb-6">
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-indigo-500">
          <option value="">Todas as categorias</option>
          {categorias.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
        <button onClick={() => setEditing({ ...empty })}
          className="ml-auto flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" />
          Nova matéria
        </button>
      </div>

      {Object.entries(groups).map(([catId, subs]) => {
        const catLabel = categorias.find(c => c.id === catId)?.label ?? catId;
        return (
          <div key={catId} className="mb-6">
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 px-1">{catLabel}</h3>
            <div className="rounded-xl border border-white/5 overflow-hidden">
              {subs.map((s, i) => (
                <div key={s.id} className={cn(
                  "flex items-center gap-3 px-4 py-3 hover:bg-white/3 transition-colors",
                  i < subs.length - 1 && "border-b border-white/5"
                )}>
                  <div className="w-6 h-6 rounded-md bg-indigo-600/20 flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-3 h-3 text-indigo-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{s.name}</p>
                    {s.description && <p className="text-xs text-gray-500 truncate">{s.description}</p>}
                  </div>
                  <span className="text-xs text-gray-700">#{s.ordem}</span>
                  <button onClick={() => setEditing({ ...s })} className="text-gray-600 hover:text-indigo-400 transition-colors ml-1">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => remove(s.id)} className="text-gray-700 hover:text-red-400 transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-[#0d1117] border border-white/10 rounded-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-white/5">
              <h2 className="font-semibold">{editing.id ? "Editar matéria" : "Nova matéria"}</h2>
              <button onClick={() => setEditing(null)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Nome *</label>
                <input value={editing.name ?? ""} onChange={e => setEditing(v => ({ ...v, name: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  placeholder="Ex: Direito Penal" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Categoria</label>
                <select value={editing.categoria ?? ""} onChange={e => setEditing(v => ({ ...v, categoria: e.target.value || null }))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-indigo-500">
                  <option value="">Nenhuma</option>
                  {categorias.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Descrição</label>
                <input value={editing.description ?? ""} onChange={e => setEditing(v => ({ ...v, description: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  placeholder="Breve descrição (opcional)" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Ordem</label>
                <input type="number" value={editing.ordem ?? 0} onChange={e => setEditing(v => ({ ...v, ordem: parseInt(e.target.value) || 0 }))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" />
              </div>
              {error && <p className="text-red-400 text-xs">{error}</p>}
            </div>
            <div className="flex gap-3 p-5 border-t border-white/5">
              <button onClick={() => setEditing(null)} className="flex-1 py-2 rounded-lg border border-white/10 text-sm text-gray-400 hover:text-white transition-colors">
                Cancelar
              </button>
              <button onClick={save} disabled={saving || !editing.name?.trim()}
                className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
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
