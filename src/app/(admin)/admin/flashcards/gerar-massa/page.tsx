"use client";
import { useState, useEffect, useRef } from "react";
import { Layers, CheckCircle2, XCircle, Loader2, Filter, Play, Square, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface Subject { id: string; name: string; categoria: string; }

type ItemStatus = "pending" | "running" | "done" | "error";

interface GenItem {
  subject: Subject;
  qty: number;
  status: ItemStatus;
  inserted: number;
  error?: string;
}

function StatusIcon({ status }: { status: ItemStatus }) {
  if (status === "running") return <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />;
  if (status === "done")    return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
  if (status === "error")   return <XCircle className="w-4 h-4 text-red-400" />;
  return <div className="w-4 h-4 rounded-full border border-white/20" />;
}

export default function GerarMassaFlashcardsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading]   = useState(true);
  const [filterCat, setFilterCat] = useState("all");
  const [search, setSearch]     = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [qtyPer, setQtyPer]     = useState(10);
  const [items, setItems]       = useState<GenItem[]>([]);
  const [running, setRunning]   = useState(false);
  const [showLog, setShowLog]   = useState(true);
  const stopRef = useRef(false);

  useEffect(() => {
    fetch("/api/admin/materias/stats")
      .then(r => r.ok ? r.json() : null)
      .then((d: Record<string, { name?: string; categoria?: string }> | null) => {
        if (!d) return;
        const list: Subject[] = Object.entries(d)
          .map(([id, v]) => ({ id, name: v.name ?? id, categoria: v.categoria ?? "—" }))
          .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
        setSubjects(list);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const categorias = [...new Set(subjects.map(s => s.categoria))].sort();

  const filtered = subjects.filter(s => {
    if (filterCat !== "all" && s.categoria !== filterCat) return false;
    if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  function toggleAll() {
    if (filtered.every(s => selected.has(s.id))) {
      setSelected(prev => { const n = new Set(prev); filtered.forEach(s => n.delete(s.id)); return n; });
    } else {
      setSelected(prev => { const n = new Set(prev); filtered.forEach(s => n.add(s.id)); return n; });
    }
  }

  function toggle(id: string) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  const selectedSubjects = subjects.filter(s => selected.has(s.id));

  async function start() {
    if (!selectedSubjects.length) return;
    stopRef.current = false;
    setRunning(true);
    setShowLog(true);

    const queue: GenItem[] = selectedSubjects.map(s => ({
      subject: s, qty: qtyPer, status: "pending", inserted: 0,
    }));
    setItems(queue);

    for (let i = 0; i < queue.length; i++) {
      if (stopRef.current) break;

      setItems(prev => prev.map((it, idx) => idx === i ? { ...it, status: "running" } : it));

      try {
        const res = await fetch("/api/admin/flashcards/gerar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subjectId: queue[i].subject.id,
            subjectName: queue[i].subject.name,
            qty: queue[i].qty,
          }),
        });
        const d = await res.json() as { inserted?: number; total?: number; error?: string; flashcards?: unknown[] };
        if (!res.ok) throw new Error(d.error ?? "Erro");
        const inserted = d.inserted ?? d.total ?? d.flashcards?.length ?? 0;
        setItems(prev => prev.map((it, idx) => idx === i ? { ...it, status: "done", inserted } : it));
      } catch (err) {
        setItems(prev => prev.map((it, idx) => idx === i ? { ...it, status: "error", error: String(err) } : it));
      }
    }

    setRunning(false);
  }

  function stop() { stopRef.current = true; }

  const done  = items.filter(i => i.status === "done").length;
  const errs  = items.filter(i => i.status === "error").length;
  const total = items.length;

  return (
    <div className="p-6 max-w-5xl text-white space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Layers className="w-6 h-6 text-cyan-400" /> Gerar Flashcards em Massa
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Selecione matérias e gere decks de flashcards automaticamente com IA.
        </p>
      </div>

      {/* Controles globais */}
      <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Flashcards por matéria</label>
            <input type="number" min={5} max={50} value={qtyPer} onChange={e => setQtyPer(Number(e.target.value))}
              className="w-full px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm text-gray-200 focus:outline-none focus:border-indigo-500" />
          </div>
          <div className="sm:col-span-3 flex items-end gap-2">
            {!running ? (
              <button onClick={start} disabled={!selectedSubjects.length}
                className="flex-1 flex items-center justify-center gap-2 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                <Play className="w-4 h-4" /> Gerar {selectedSubjects.length} matéria{selectedSubjects.length !== 1 ? "s" : ""}
              </button>
            ) : (
              <button onClick={stop}
                className="flex-1 flex items-center justify-center gap-2 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 font-bold text-sm transition-colors">
                <Square className="w-4 h-4" /> Parar
              </button>
            )}
            <button onClick={() => { setItems([]); setSelected(new Set()); }}
              disabled={running}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 text-sm disabled:opacity-40 transition-colors">
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Log de progresso */}
      {items.length > 0 && (
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
          <button onClick={() => setShowLog(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold">Progresso</span>
              <span className="text-xs text-gray-500">{done}/{total} · {errs} erros</span>
              {running && <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />}
            </div>
            {showLog ? <ChevronUp className="w-4 h-4 text-gray-600" /> : <ChevronDown className="w-4 h-4 text-gray-600" />}
          </button>
          {showLog && (
            <div className="divide-y divide-white/[0.04] max-h-80 overflow-y-auto">
              {items.map((it, i) => (
                <div key={i} className={cn("flex items-center gap-3 px-4 py-2.5 text-sm", it.status === "running" ? "bg-indigo-500/5" : "")}>
                  <StatusIcon status={it.status} />
                  <span className={cn("flex-1 truncate", it.status === "pending" ? "text-gray-600" : "text-gray-300")}>
                    {it.subject.name}
                  </span>
                  {it.status === "done" && <span className="text-xs text-emerald-400 font-mono">+{it.inserted} cards</span>}
                  {it.status === "error" && <span className="text-xs text-red-400 truncate max-w-48">{it.error}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Seleção */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar matéria..."
            className="flex-1 min-w-48 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500" />
          <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
            className="px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm text-gray-300 focus:outline-none focus:border-indigo-500">
            <option value="all">Todas categorias</option>
            {categorias.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button onClick={toggleAll}
            className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-400 hover:text-white transition-colors flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5" />
            {filtered.every(s => selected.has(s.id)) ? "Desmarcar tudo" : `Selecionar ${filtered.length}`}
          </button>
        </div>
        {loading ? (
          <div className="text-center py-8 text-gray-600"><Loader2 className="w-5 h-5 animate-spin inline" /></div>
        ) : (
          <div className="rounded-xl border border-white/[0.06] overflow-hidden">
            <div className="divide-y divide-white/[0.04] max-h-[500px] overflow-y-auto">
              {filtered.map(s => (
                <label key={s.id} className={cn("flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-white/[0.02] transition-colors", selected.has(s.id) ? "bg-cyan-500/[0.04]" : "")}>
                  <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggle(s.id)} className="accent-cyan-500 w-3.5 h-3.5 flex-shrink-0" />
                  <span className="flex-1 text-sm text-gray-300 truncate">{s.name}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/[0.04] text-gray-500 border border-white/[0.06] flex-shrink-0">{s.categoria}</span>
                </label>
              ))}
              {filtered.length === 0 && <p className="text-center py-6 text-gray-600 text-sm">Nenhuma matéria encontrada</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
