"use client";
import { useState, useEffect, useCallback } from "react";
import { Plus, X, Edit2, Check, BookOpen, FileText, Search, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

interface Note {
  id: string;
  subjectId: string | null;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

interface Subject { id: string; name: string; }

const empty = { title: "", body: "", subjectId: "" };

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function NotasPage() {
  const [notes, setNotes]         = useState<Note[]>([]);
  const [subjects, setSubjects]   = useState<Subject[]>([]);
  const [loading, setLoading]     = useState(true);
  const [editing, setEditing]     = useState<Partial<Note> | null>(null);
  const [isNew, setIsNew]         = useState(false);
  const [saving, setSaving]       = useState(false);
  const [search, setSearch]       = useState("");
  const [filterSub, setFilterSub] = useState("");
  const [error, setError]         = useState("");

  const loadNotes = useCallback(async () => {
    setLoading(true);
    try {
      const [notesRes, subjectsRes] = await Promise.all([
        fetch("/api/notas"),
        fetch("/api/workspace/materias"),
      ]);
      const notesData    = notesRes.ok    ? await notesRes.json()    : {};
      const subjectsData = subjectsRes.ok ? await subjectsRes.json() : {};
      setNotes(notesData.notes ?? []);
      setSubjects(subjectsData.subjects ?? []);
    } catch {
      // Mantém estado vazio em caso de falha de rede
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadNotes(); }, [loadNotes]);

  const filtered = notes.filter(n => {
    const q = search.toLowerCase();
    const matchSearch = !q || n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q);
    const matchSub = !filterSub || n.subjectId === filterSub;
    return matchSearch && matchSub;
  });

  async function save() {
    if (!editing) return;
    if (!editing.title?.trim() && !editing.body?.trim()) {
      setError("Adicione um título ou conteúdo");
      return;
    }
    setSaving(true);
    setError("");
    const res = await fetch("/api/notas", {
      method: isNew ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(isNew ? {} : { id: editing.id }),
        title: editing.title ?? "",
        body: editing.body ?? "",
        subjectId: editing.subjectId || null,
      }),
    });
    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Erro ao salvar");
      setSaving(false);
      return;
    }
    const saved: Note = await res.json();
    if (isNew) {
      setNotes(n => [saved, ...n]);
    } else {
      setNotes(n => n.map(x => x.id === saved.id ? saved : x));
    }
    setEditing(null);
    setSaving(false);
  }

  async function remove(id: string) {
    if (!confirm("Remover esta anotação?")) return;
    await fetch("/api/notas", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setNotes(n => n.filter(x => x.id !== id));
  }

  return (
    <div className="p-6 text-white max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-400" /> Anotações
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {notes.length > 0
              ? `${notes.length} anotaç${notes.length === 1 ? "ão" : "ões"} salvas`
              : "Anote pontos importantes enquanto estuda"}
          </p>
        </div>
        <button
          onClick={() => { setEditing({ ...empty }); setIsNew(true); setError(""); }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" /> Nova nota
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar anotações…"
            className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500"
          />
        </div>
        <div className="relative">
          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          <select
            value={filterSub}
            onChange={e => setFilterSub(e.target.value)}
            className="pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="">Todas as matérias</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div className="text-center py-16 rounded-xl border border-white/5">
          <BookOpen className="w-12 h-12 text-gray-700 mx-auto mb-3" />
          {notes.length === 0 ? (
            <>
              <p className="text-gray-400 text-base">Nenhuma anotação ainda</p>
              <p className="text-gray-600 text-sm mt-1">Crie sua primeira nota clicando em "Nova nota"</p>
            </>
          ) : (
            <>
              <p className="text-gray-400 text-base">Nenhuma nota encontrada</p>
              <p className="text-gray-600 text-sm mt-1">Tente um termo diferente ou limpe os filtros</p>
            </>
          )}
        </div>
      )}

      {/* Notes grid */}
      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(note => {
            const sub = subjects.find(s => s.id === note.subjectId);
            return (
              <div
                key={note.id}
                className="group rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.05] p-4 flex flex-col gap-2 transition-colors"
              >
                {/* Subject tag */}
                {sub && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 self-start">
                    {sub.name}
                  </span>
                )}

                {/* Title */}
                {note.title && (
                  <h3 className="text-sm font-semibold text-white leading-snug">{note.title}</h3>
                )}

                {/* Body preview */}
                {note.body && (
                  <p className="text-xs text-gray-400 leading-relaxed line-clamp-4 flex-1">
                    {note.body}
                  </p>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-1 border-t border-white/5 mt-auto">
                  <span className="text-[10px] text-gray-600">{fmtDate(note.updatedAt)}</span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => { setEditing({ ...note }); setIsNew(false); setError(""); }}
                      className="p-1 text-gray-600 hover:text-indigo-400 transition-colors"
                      title="Editar"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => remove(note.id)}
                      className="p-1 text-gray-600 hover:text-red-400 transition-colors"
                      title="Remover"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {editing && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setEditing(null)}
        >
          <div
            className="bg-[#0d1117] border border-white/10 rounded-2xl w-full max-w-lg"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-white/5">
              <h2 className="font-semibold">{isNew ? "Nova anotação" : "Editar anotação"}</h2>
              <button onClick={() => setEditing(null)} className="text-gray-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label htmlFor="nota-titulo" className="text-xs text-gray-500 mb-1 block">Título</label>
                <input
                  id="nota-titulo"
                  autoFocus
                  value={editing.title ?? ""}
                  onChange={e => setEditing(v => ({ ...v, title: e.target.value }))}
                  placeholder="Ex: Princípios do Direito Administrativo"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label htmlFor="nota-materia" className="text-xs text-gray-500 mb-1 block">Matéria (opcional)</label>
                <select
                  id="nota-materia"
                  value={editing.subjectId ?? ""}
                  onChange={e => setEditing(v => ({ ...v, subjectId: e.target.value || "" }))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Sem matéria</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div>
                <label htmlFor="nota-conteudo" className="text-xs text-gray-500 mb-1 block">Conteúdo</label>
                <textarea
                  id="nota-conteudo"
                  rows={8}
                  value={editing.body ?? ""}
                  onChange={e => setEditing(v => ({ ...v, body: e.target.value }))}
                  placeholder="Escreva aqui seus pontos importantes, resumos, macetes…"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              {error && <p className="text-red-400 text-xs">{error}</p>}
            </div>

            <div className="flex gap-3 p-5 border-t border-white/5">
              <button
                onClick={() => setEditing(null)}
                className="flex-1 py-2 rounded-lg border border-white/10 text-sm text-gray-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving
                  ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <Check className="w-4 h-4" />
                }
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
