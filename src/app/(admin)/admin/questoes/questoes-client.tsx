"use client";
import { useState, useCallback } from "react";
import { Plus, X, Check, Sparkles, Loader2, BookOpen, ChevronDown, Bot, Zap, CheckCircle2, Search, ChevronLeft, ChevronRight, Upload, FileText, AlertCircle, Edit2, Download } from "lucide-react";
import { cn } from "@/lib/utils";

interface Question {
  id: number; banca: string | null; year: number | null;
  level: string; statement: string; answer: string; subjectId: string | null;
}
interface Subject { id: string; name: string; }
interface Agent { id: string; name: string; banca: string | null; area: string | null; description: string; color: string; }

const BANCAS = ["CESPE/CEBRASPE", "FGV", "VUNESP", "FCC", "IBFC", "CESGRANRIO", "AOCP", "NC-UFPR", "FUNRIO", "IDECAN", "IADES", "ESAF"];
const BANCAS_AGENTS_SLUGS = ["banca-cespe", "banca-fgv", "banca-vunesp", "banca-fcc", "banca-ibfc", "banca-cesgranrio", "banca-aocp", "banca-idecan", "banca-iades", "banca-esaf"];

const emptyQ = {
  banca: "", year: "", level: "medio",
  statement: "", optionA: "", optionB: "", optionC: "", optionD: "", optionE: "",
  answer: "A", explanation: "", subjectId: "",
};

interface LoteItem { subjectId: string; subjectName: string; qty: number; }

export function QuestoesAdmin({ questions: initial, subjects, agents, totalInitial }: {
  questions: Question[]; subjects: Subject[]; agents: Agent[]; totalInitial?: number;
}) {
  const [questions, setQuestions] = useState(initial);
  const [total, setTotal] = useState(totalInitial ?? initial.length);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loadingQ, setLoadingQ] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showGerarModal, setShowGerarModal] = useState(false);
  const [showLoteModal, setShowLoteModal] = useState(false);
  const [form, setForm] = useState(emptyQ);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [filterSubject, setFilterSubject] = useState("");
  const [filterBanca, setFilterBanca] = useState("");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editingQ, setEditingQ] = useState<(typeof emptyQ & { id?: number }) | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const fetchQuestions = useCallback(async (params: { subjectId?: string; banca?: string; search?: string; page?: number }) => {
    setLoadingQ(true);
    const sp = new URLSearchParams();
    if (params.subjectId) sp.set("subjectId", params.subjectId);
    if (params.banca) sp.set("banca", params.banca);
    if (params.search) sp.set("search", params.search);
    if (params.page) sp.set("page", String(params.page));
    sp.set("limit", "50");
    const res = await fetch(`/api/admin/questoes?${sp.toString()}`);
    if (res.ok) {
      const d = await res.json() as { questions: Question[]; total: number; pages: number; page: number };
      setQuestions(d.questions);
      setTotal(d.total);
      setPages(d.pages);
      setPage(d.page);
    }
    setLoadingQ(false);
  }, []);

  function applyFilters(overrides: { subjectId?: string; banca?: string; search?: string; page?: number } = {}) {
    const params = {
      subjectId: overrides.subjectId ?? filterSubject,
      banca: overrides.banca ?? filterBanca,
      search: overrides.search ?? search,
      page: overrides.page ?? 1,
    };
    void fetchQuestions(params);
  }

  // Agentes separados por tipo
  const bancaAgents = agents.filter(a => a.banca || a.name.toLowerCase().includes("cespe") || a.name.toLowerCase().includes("fgv") || a.name.toLowerCase().includes("banca") || a.name.toLowerCase().includes("vunesp") || a.name.toLowerCase().includes("fcc") || a.name.toLowerCase().includes("ibfc") || a.name.toLowerCase().includes("aocp") || a.name.toLowerCase().includes("idecan") || a.name.toLowerCase().includes("iades") || a.name.toLowerCase().includes("esaf") || a.name.toLowerCase().includes("cesgranrio") || a.name.toLowerCase().includes("funrio"));
  const cargoAgents = agents.filter(a => !bancaAgents.includes(a));

  // Geração unitária
  const [gerarForm, setGerarForm] = useState({ subjectId: "", banca: "", extraContext: "", qty: 10, cargoAgentId: "", bancaAgentId: "" });
  const [gerando, setGerando] = useState(false);
  const [gerarMsg, setGerarMsg] = useState("");

  // Geração em lote
  const [loteForm, setLoteForm] = useState({ cargoAgentId: "", bancaAgentId: "", banca: "", extraContext: "" });
  const [loteItems, setLoteItems] = useState<LoteItem[]>([]);
  const [gerandoLote, setGerandoLote] = useState(false);
  const [loteProgress, setLoteProgress] = useState("");
  const [loteTotal, setLoteTotal] = useState(0);

  // Importação CSV
  const [showImportModal, setShowImportModal] = useState(false);
  const [importCsv, setImportCsv] = useState("");
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<{ inserted: number; skipped: number; errors: { row: number; reason: string }[] } | null>(null);

  async function handleImport() {
    if (!importCsv.trim()) return;
    setImportLoading(true);
    setImportResult(null);
    const res = await fetch("/api/admin/questoes/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csv: importCsv }),
    });
    const data = await res.json();
    setImportLoading(false);
    if (!res.ok) { setImportResult({ inserted: 0, skipped: 0, errors: [{ row: 0, reason: data.error ?? "Erro desconhecido" }] }); return; }
    setImportResult(data);
    if (data.inserted > 0) applyFilters();
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setImportCsv(text);
    e.target.value = "";
  }

  const bancasExistentes = BANCAS;
  const filtered = questions; // filtering now done server-side

  function handleBancaAgentSelect(agentId: string) {
    const agent = agents.find(a => a.id === agentId);
    setGerarForm(f => ({ ...f, bancaAgentId: agentId, banca: agent?.banca ?? f.banca }));
  }

  function handleLoteBancaAgent(agentId: string) {
    const agent = agents.find(a => a.id === agentId);
    setLoteForm(f => ({ ...f, bancaAgentId: agentId, banca: agent?.banca ?? f.banca }));
  }

  function addLoteItem(subjectId: string) {
    const subj = subjects.find(s => s.id === subjectId);
    if (!subj || loteItems.find(i => i.subjectId === subjectId)) return;
    setLoteItems(prev => [...prev, { subjectId, subjectName: subj.name, qty: 20 }]);
  }

  function updateLoteQty(subjectId: string, qty: number) {
    setLoteItems(prev => prev.map(i => i.subjectId === subjectId ? { ...i, qty } : i));
  }

  function removeLoteItem(subjectId: string) {
    setLoteItems(prev => prev.filter(i => i.subjectId !== subjectId));
  }

  async function save() {
    setSaving(true); setError("");
    const res = await fetch("/api/questoes", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, year: form.year ? parseInt(form.year) : null }),
    });
    if (!res.ok) { const d = await res.json(); setError(d.error ?? "Erro"); setSaving(false); return; }
    const saved = await res.json();
    setQuestions(q => [saved, ...q]);
    setForm(emptyQ); setShowForm(false); setSaving(false);
  }

  async function gerar() {
    if (!gerarForm.subjectId) { setGerarMsg("Selecione uma matéria"); return; }
    setGerando(true); setGerarMsg("");
    const subject = subjects.find(s => s.id === gerarForm.subjectId);
    const res = await fetch("/api/admin/questoes/gerar", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subjectId: gerarForm.subjectId, subjectName: subject?.name ?? "",
        banca: gerarForm.banca || null, extraContext: gerarForm.extraContext || null,
        qty: gerarForm.qty,
        cargoAgentId: gerarForm.cargoAgentId || null,
        bancaAgentId: gerarForm.bancaAgentId || null,
      }),
    });
    const data = await res.json();
    if (!res.ok) { setGerarMsg(data.error ?? "Erro ao gerar"); setGerando(false); return; }
    setQuestions(q => [...(data.questions ?? []), ...q]);
    setGerarMsg(`Concluído: ${data.count} questões adicionadas com artigo + dica da banca!`);
    setGerando(false);
  }

  async function gerarLote() {
    if (loteItems.length === 0) { setLoteProgress("Adicione pelo menos uma matéria"); return; }
    setGerandoLote(true); setLoteProgress("Iniciando geração em lote..."); setLoteTotal(0);

    const totalQuestoes = loteItems.reduce((s, i) => s + i.qty, 0);
    setLoteProgress(`Gerando ${totalQuestoes} questões em ${loteItems.length} matéria(s)...`);

    const res = await fetch("/api/admin/questoes/gerar", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lote: loteItems,
        banca: loteForm.banca || null,
        extraContext: loteForm.extraContext || null,
        cargoAgentId: loteForm.cargoAgentId || null,
        bancaAgentId: loteForm.bancaAgentId || null,
      }),
    });

    const data = await res.json();
    setGerandoLote(false);

    if (!res.ok) {
      setLoteProgress(`Erro: ${data.error ?? "Falha na geração"}`);
      return;
    }

    setLoteTotal(data.total ?? 0);
    setLoteProgress(`Concluído! ${data.total} questões salvas no banco.${data.erros?.length ? ` Erros: ${data.erros.join(", ")}` : ""}`);
    setQuestions(q => q); // refresh indicativo — tabela de questões não atualiza em lote pois pode ser centenas
  }

  async function openEdit(q: Question) {
    // Fetch full question data
    const res = await fetch(`/api/admin/questoes/${q.id}`).catch(() => null);
    if (res?.ok) {
      const full = await res.json();
      setEditingQ({
        id: full.id,
        banca: full.banca ?? "",
        year: full.year ? String(full.year) : "",
        level: full.level ?? "medio",
        statement: full.statement ?? "",
        optionA: full.optionA ?? "",
        optionB: full.optionB ?? "",
        optionC: full.optionC ?? "",
        optionD: full.optionD ?? "",
        optionE: full.optionE ?? "",
        answer: full.answer ?? "A",
        explanation: full.explanation ?? "",
        subjectId: full.subjectId ?? "",
      });
    } else {
      // Fallback with what we have
      setEditingQ({
        id: q.id,
        banca: q.banca ?? "",
        year: q.year ? String(q.year) : "",
        level: q.level ?? "medio",
        statement: q.statement ?? "",
        optionA: "", optionB: "", optionC: "", optionD: "", optionE: "",
        answer: q.answer ?? "A",
        explanation: "",
        subjectId: q.subjectId ?? "",
      });
    }
    setEditError("");
  }

  async function saveEdit() {
    if (!editingQ?.id) return;
    setEditSaving(true);
    setEditError("");
    const res = await fetch(`/api/admin/questoes/${editingQ.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        banca: editingQ.banca || null,
        year: editingQ.year ? parseInt(editingQ.year) : null,
        level: editingQ.level,
        statement: editingQ.statement,
        optionA: editingQ.optionA || null,
        optionB: editingQ.optionB || null,
        optionC: editingQ.optionC || null,
        optionD: editingQ.optionD || null,
        optionE: editingQ.optionE || null,
        answer: editingQ.answer,
        explanation: editingQ.explanation || null,
        subjectId: editingQ.subjectId || null,
      }),
    });
    const d = await res.json();
    if (!res.ok) { setEditError(d.error ?? "Erro ao salvar"); setEditSaving(false); return; }
    // Update local list with updated data
    setQuestions(prev => prev.map(q => q.id === d.id ? { ...q, ...d } : q));
    setEditingQ(null);
    setEditSaving(false);
  }

  const subjectName = (id: string | null) => id ? subjects.find(s => s.id === id)?.name ?? "—" : "—";
  const selectedCargoAgent = agents.find(a => a.id === gerarForm.cargoAgentId);
  const selectedBancaAgent = agents.find(a => a.id === gerarForm.bancaAgentId);

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600" />
          <input
            type="text"
            placeholder="Buscar enunciado…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") applyFilters({ search: e.currentTarget.value }); }}
            className="bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-indigo-500 w-52"
          />
        </div>
        <select value={filterSubject} onChange={e => { setFilterSubject(e.target.value); applyFilters({ subjectId: e.target.value }); }}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-indigo-500">
          <option value="">Todas as matérias</option>
          {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={filterBanca} onChange={e => { setFilterBanca(e.target.value); applyFilters({ banca: e.target.value }); }}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-indigo-500">
          <option value="">Todas as bancas</option>
          {bancasExistentes.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
        <span className="text-xs text-gray-600">{loadingQ ? "carregando…" : `${total} questão(ões)`}</span>
        <div className="ml-auto flex gap-2">
          <button onClick={() => setShowLoteModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 rounded-lg text-sm font-medium transition-colors">
            <Zap className="w-4 h-4" />Lote em massa
          </button>
          <button onClick={() => setShowGerarModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-sm font-medium transition-colors">
            <Sparkles className="w-4 h-4" />Gerar com IA
          </button>
          <button onClick={() => { setShowImportModal(true); setImportCsv(""); setImportResult(null); }}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 rounded-lg text-sm font-medium transition-colors">
            <Upload className="w-4 h-4" />Importar CSV
          </button>
          <a
            href={`/api/admin/questoes/export${filterSubject ? `?subjectId=${filterSubject}` : ""}`}
            download
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors text-gray-200"
          >
            <Download className="w-4 h-4" />Exportar CSV
          </a>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" />Manual
          </button>
        </div>
      </div>

      {/* Tabela */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 rounded-xl border border-white/5 bg-white/3">
          <BookOpen className="w-12 h-12 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-400">Nenhuma questão encontrada</p>
          <p className="text-gray-600 text-sm mt-1">Use "Lote em massa" para popular o banco ou "Gerar com IA" para adicionar questões</p>
        </div>
      ) : (
        <div className="rounded-xl border border-white/5 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 bg-white/3">
                <th className="text-left px-4 py-3 text-gray-500 font-medium w-10">#</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Enunciado</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Matéria</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Banca</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Nível</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Gab.</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map(q => (
                <>
                  <tr key={q.id} onClick={() => setExpandedId(expandedId === q.id ? null : q.id)}
                    className="hover:bg-white/3 transition-colors cursor-pointer">
                    <td className="px-4 py-3 text-gray-600 text-xs">{q.id}</td>
                    <td className="px-4 py-3 text-gray-300 max-w-sm">
                      <div className="flex items-start gap-2">
                        <ChevronDown className={cn("w-3.5 h-3.5 mt-0.5 text-gray-600 flex-shrink-0 transition-transform", expandedId === q.id && "rotate-180")} />
                        <p className="line-clamp-2 text-xs">{q.statement}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{subjectName(q.subjectId)}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{q.banca ?? "—"}{q.year ? ` ${q.year}` : ""}</td>
                    <td className="px-4 py-3">
                      <span className={cn("text-xs px-2 py-0.5 rounded-full", {
                        "bg-green-500/10 text-green-400": q.level === "facil",
                        "bg-yellow-500/10 text-yellow-400": q.level === "medio",
                        "bg-red-500/10 text-red-400": q.level === "dificil",
                      })}>{q.level}</span>
                    </td>
                    <td className="px-4 py-3 font-bold text-indigo-400 text-center">{q.answer}</td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(q)}
                          className="p-1 rounded text-gray-600 hover:text-indigo-400 transition-colors"
                          title="Editar questão">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={async () => {
                            if (!confirm(`Excluir questão #${q.id}?`)) return;
                            const res = await fetch(`/api/admin/questoes/${q.id}`, { method: "DELETE" });
                            if (res.ok) setQuestions(prev => prev.filter(x => x.id !== q.id));
                          }}
                          className="p-1 rounded text-gray-700 hover:text-red-400 transition-colors"
                          title="Excluir questão">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedId === q.id && (
                    <tr key={`exp-${q.id}`}><td colSpan={7} className="px-8 py-4 bg-white/2">
                      <p className="text-xs text-gray-300 leading-relaxed">{q.statement}</p>
                      <p className="text-xs text-indigo-400 mt-2">Gabarito: {q.answer}</p>
                    </td></tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Paginação */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-4">
          <button
            onClick={() => { const p = page - 1; setPage(p); applyFilters({ page: p }); }}
            disabled={page <= 1 || loadingQ}
            className="p-1.5 rounded-lg border border-white/10 text-gray-400 hover:text-white disabled:opacity-30 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs text-gray-500">Página {page} de {pages}</span>
          <button
            onClick={() => { const p = page + 1; setPage(p); applyFilters({ page: p }); }}
            disabled={page >= pages || loadingQ}
            className="p-1.5 rounded-lg border border-white/10 text-gray-400 hover:text-white disabled:opacity-30 transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Modal: Geração em LOTE ────────────────────────────── */}
      {showLoteModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setShowLoteModal(false)}>
          <div className="bg-[#0d1117] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-violet-400" />
                <div>
                  <h2 className="font-semibold">Geração em Massa</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Popula o banco de questões com centenas de perguntas de uma vez</p>
                </div>
              </div>
              <button onClick={() => setShowLoteModal(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-5 space-y-5">
              {/* 2 agentes */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Agente do cargo / área</label>
                  <select value={loteForm.cargoAgentId} onChange={e => setLoteForm(f => ({ ...f, cargoAgentId: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-indigo-500">
                    <option value="">Sem agente de cargo</option>
                    {cargoAgents.map(a => <option key={a.id} value={a.id}>{a.name}{a.area ? ` · ${a.area}` : ""}</option>)}
                  </select>
                  {loteForm.cargoAgentId && (
                    <p className="text-xs text-indigo-400 mt-1 flex items-center gap-1">
                      <Bot className="w-3 h-3" />{agents.find(a => a.id === loteForm.cargoAgentId)?.description}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Agente da banca</label>
                  <select value={loteForm.bancaAgentId} onChange={e => handleLoteBancaAgent(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-indigo-500">
                    <option value="">Sem agente de banca</option>
                    {bancaAgents.map(a => <option key={a.id} value={a.id}>{a.name}{a.banca ? ` · ${a.banca}` : ""}</option>)}
                  </select>
                  {loteForm.bancaAgentId && (
                    <p className="text-xs text-indigo-400 mt-1 flex items-center gap-1">
                      <Bot className="w-3 h-3" />{agents.find(a => a.id === loteForm.bancaAgentId)?.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Banca manual se agente não tiver */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Banca {loteForm.banca ? `(${loteForm.banca})` : "(manual)"}</label>
                  <select value={loteForm.banca} onChange={e => setLoteForm(f => ({ ...f, banca: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-indigo-500">
                    <option value="">Do agente / CESPE</option>
                    {BANCAS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Contexto adicional (cargo)</label>
                  <input value={loteForm.extraContext} onChange={e => setLoteForm(f => ({ ...f, extraContext: e.target.value }))}
                    placeholder="Ex: Delegado de Polícia, nível superior"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" />
                </div>
              </div>

              {/* Matérias com qty */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-gray-500">Matérias para gerar</label>
                  <span className="text-xs text-gray-600">Total: {loteItems.reduce((s, i) => s + i.qty, 0)} questões</span>
                </div>

                {/* Adicionar matéria */}
                <select onChange={e => { addLoteItem(e.target.value); e.target.value = ""; }}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-indigo-500 mb-3">
                  <option value="">+ Adicionar matéria...</option>
                  {subjects.filter(s => !loteItems.find(i => i.subjectId === s.id)).map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>

                {loteItems.length === 0 ? (
                  <p className="text-xs text-gray-600 text-center py-4">Nenhuma matéria selecionada. Adicione acima.</p>
                ) : (
                  <div className="space-y-2">
                    {loteItems.map(item => (
                      <div key={item.subjectId} className="flex items-center gap-3 p-3 rounded-lg bg-white/3 border border-white/5">
                        <p className="text-sm flex-1 text-gray-300">{item.subjectName}</p>
                        <div className="flex gap-1.5 flex-shrink-0">
                          {[10, 20, 30, 50].map(n => (
                            <button key={n} onClick={() => updateLoteQty(item.subjectId, n)}
                              className={cn("w-10 py-1 rounded text-xs font-medium transition-colors",
                                item.qty === n ? "bg-violet-600 text-white" : "bg-white/5 text-gray-500 hover:text-white")}>
                              {n}
                            </button>
                          ))}
                        </div>
                        <button onClick={() => removeLoteItem(item.subjectId)} className="text-gray-700 hover:text-red-400 transition-colors flex-shrink-0">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Status */}
              {loteProgress && (
                <div className={cn("p-3 rounded-lg border text-xs", 
                  loteTotal > 0 ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : 
                  loteProgress.startsWith("Erro") ? "bg-red-500/10 border-red-500/20 text-red-400" :
                  "bg-violet-500/10 border-violet-500/20 text-violet-300")}>
                  {loteTotal > 0 && <CheckCircle2 className="w-3.5 h-3.5 inline mr-1.5" />}
                  {loteProgress}
                </div>
              )}

              <div className="bg-violet-500/5 border border-violet-500/10 rounded-lg p-3 text-xs text-gray-500">
                <strong className="text-violet-400">Como funciona:</strong> O sistema gera questões completas (enunciado, alternativas, gabarito, artigo, justificativa e dica da banca) e salva diretamente no banco. Os alunos veem imediatamente no workspace. Recomendado: 20-50 questões por matéria para variedade.
              </div>
            </div>

            <div className="flex gap-3 p-5 border-t border-white/5">
              <button onClick={() => setShowLoteModal(false)} className="flex-1 py-2 rounded-lg border border-white/10 text-sm text-gray-400 hover:text-white transition-colors">Fechar</button>
              <button onClick={gerarLote} disabled={gerandoLote || loteItems.length === 0}
                className="flex-1 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {gerandoLote
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Gerando {loteItems.reduce((s, i) => s + i.qty, 0)} questões...</>
                  : <><Zap className="w-4 h-4" />Gerar {loteItems.reduce((s, i) => s + i.qty, 0)} questões agora</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Gerar IA (unitário) ────────────────────────── */}
      {showGerarModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setShowGerarModal(false)}>
          <div className="bg-[#0d1117] border border-white/10 rounded-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-white/5">
              <div className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-emerald-400" /><h2 className="font-semibold">Gerar questões com IA</h2></div>
              <button onClick={() => setShowGerarModal(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              {/* 2 agentes */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Agente do cargo</label>
                  <select value={gerarForm.cargoAgentId} onChange={e => setGerarForm(f => ({ ...f, cargoAgentId: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-indigo-500">
                    <option value="">Sem agente</option>
                    {cargoAgents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                  {selectedCargoAgent && <p className="text-xs text-indigo-400 mt-1 flex items-center gap-1"><Bot className="w-3 h-3" />{selectedCargoAgent.description}</p>}
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Agente da banca</label>
                  <select value={gerarForm.bancaAgentId} onChange={e => handleBancaAgentSelect(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-indigo-500">
                    <option value="">Sem agente</option>
                    {bancaAgents.map(a => <option key={a.id} value={a.id}>{a.name}{a.banca ? ` · ${a.banca}` : ""}</option>)}
                  </select>
                  {selectedBancaAgent && <p className="text-xs text-indigo-400 mt-1 flex items-center gap-1"><Bot className="w-3 h-3" />{selectedBancaAgent.description}</p>}
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">Matéria *</label>
                <select value={gerarForm.subjectId} onChange={e => setGerarForm(f => ({ ...f, subjectId: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-indigo-500">
                  <option value="">Selecione...</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Banca {gerarForm.banca ? `(${gerarForm.banca})` : ""}</label>
                  <select value={gerarForm.banca} onChange={e => setGerarForm(f => ({ ...f, banca: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-indigo-500">
                    <option value="">Do agente / CESPE</option>
                    {BANCAS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Contexto extra</label>
                  <input value={gerarForm.extraContext} onChange={e => setGerarForm(f => ({ ...f, extraContext: e.target.value }))}
                    placeholder="Ex: Delegado, nível alto"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">Quantidade</label>
                <div className="flex gap-2">
                  {[5, 10, 15, 20, 30].map(n => (
                    <button key={n} onClick={() => setGerarForm(f => ({ ...f, qty: n }))}
                      className={cn("flex-1 py-2 rounded-lg text-sm font-medium transition-colors",
                        gerarForm.qty === n ? "bg-emerald-600 text-white" : "bg-white/5 border border-white/10 text-gray-400 hover:text-white")}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {gerarMsg && (
                <p className={cn("text-xs p-3 rounded-lg border", gerarMsg.startsWith("Concluído") ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20")}>
                  {gerarMsg}
                </p>
              )}
            </div>
            <div className="flex gap-3 p-5 border-t border-white/5">
              <button onClick={() => setShowGerarModal(false)} className="flex-1 py-2 rounded-lg border border-white/10 text-sm text-gray-400 hover:text-white transition-colors">Fechar</button>
              <button onClick={gerar} disabled={gerando || !gerarForm.subjectId}
                className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {gerando ? <><Loader2 className="w-4 h-4 animate-spin" />Gerando...</> : <><Sparkles className="w-4 h-4" />Gerar {gerarForm.qty}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Manual ────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-[#0d1117] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-white/5">
              <h2 className="font-semibold">Nova questão (manual)</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Matéria</label>
                  <select value={form.subjectId} onChange={e => setForm(f => ({ ...f, subjectId: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-indigo-500">
                    <option value="">Nenhuma</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Nível</label>
                  <select value={form.level} onChange={e => setForm(f => ({ ...f, level: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-indigo-500">
                    <option value="facil">Fácil</option><option value="medio">Médio</option><option value="dificil">Difícil</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Banca</label>
                  <select value={form.banca} onChange={e => setForm(f => ({ ...f, banca: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-indigo-500">
                    <option value="">Selecionar...</option>
                    {BANCAS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Ano</label>
                  <input value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" placeholder="2024" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Enunciado *</label>
                <textarea value={form.statement} onChange={e => setForm(f => ({ ...f, statement: e.target.value }))}
                  rows={4} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {(["A","B","C","D","E"] as const).map(k => (
                  <div key={k}>
                    <label className="text-xs text-gray-500 mb-1 block">Opção {k}</label>
                    <input value={form[`option${k}` as keyof typeof form]} onChange={e => setForm(f => ({ ...f, [`option${k}`]: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" />
                  </div>
                ))}
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Gabarito</label>
                  <select value={form.answer} onChange={e => setForm(f => ({ ...f, answer: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-indigo-500">
                    {["A","B","C","D","E"].map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Explicação</label>
                <textarea value={form.explanation} onChange={e => setForm(f => ({ ...f, explanation: e.target.value }))}
                  rows={2} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 resize-none" />
              </div>
              {error && <p className="text-red-400 text-xs">{error}</p>}
            </div>
            <div className="flex gap-3 p-5 border-t border-white/5">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2 rounded-lg border border-white/10 text-sm text-gray-400 hover:text-white transition-colors">Cancelar</button>
              <button onClick={save} disabled={saving || !form.statement.trim()}
                className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Editar questão ────────────────────────────────── */}
      {editingQ && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setEditingQ(null)}>
          <div className="bg-[#0d1117] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-indigo-400" />
                <h2 className="font-semibold">Editar questão #{editingQ.id}</h2>
              </div>
              <button onClick={() => setEditingQ(null)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Matéria</label>
                  <select value={editingQ.subjectId} onChange={e => setEditingQ(v => v ? { ...v, subjectId: e.target.value } : v)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-indigo-500">
                    <option value="">Nenhuma</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Nível</label>
                  <select value={editingQ.level} onChange={e => setEditingQ(v => v ? { ...v, level: e.target.value } : v)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-indigo-500">
                    <option value="facil">Fácil</option><option value="medio">Médio</option><option value="dificil">Difícil</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Gabarito</label>
                  <select value={editingQ.answer} onChange={e => setEditingQ(v => v ? { ...v, answer: e.target.value } : v)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-indigo-500">
                    {["A","B","C","D","E"].map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Banca</label>
                  <select value={editingQ.banca} onChange={e => setEditingQ(v => v ? { ...v, banca: e.target.value } : v)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-indigo-500">
                    <option value="">—</option>
                    {BANCAS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Ano</label>
                  <input value={editingQ.year} onChange={e => setEditingQ(v => v ? { ...v, year: e.target.value } : v)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" placeholder="2024" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Enunciado *</label>
                <textarea value={editingQ.statement} onChange={e => setEditingQ(v => v ? { ...v, statement: e.target.value } : v)}
                  rows={4} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {(["A","B","C","D","E"] as const).map(k => (
                  <div key={k}>
                    <label className="text-xs text-gray-500 mb-1 block">Opção {k}</label>
                    <input value={editingQ[`option${k}` as keyof typeof editingQ] as string ?? ""} onChange={e => setEditingQ(v => v ? { ...v, [`option${k}`]: e.target.value } : v)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" />
                  </div>
                ))}
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Explicação</label>
                <textarea value={editingQ.explanation} onChange={e => setEditingQ(v => v ? { ...v, explanation: e.target.value } : v)}
                  rows={2} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 resize-none" />
              </div>
              {editError && <p className="text-red-400 text-xs">{editError}</p>}
            </div>
            <div className="flex gap-3 p-5 border-t border-white/5">
              <button onClick={() => setEditingQ(null)} className="flex-1 py-2 rounded-lg border border-white/10 text-sm text-gray-400 hover:text-white transition-colors">Cancelar</button>
              <button onClick={saveEdit} disabled={editSaving || !editingQ.statement.trim()}
                className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {editSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
                Salvar alterações
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Importar CSV ──────────────────────────────────── */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setShowImportModal(false)}>
          <div className="bg-[#0d1117] border border-white/10 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-amber-400" />
                <div>
                  <h2 className="font-semibold">Importar Questões via CSV</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Cole o CSV abaixo ou faça upload de um arquivo .csv</p>
                </div>
              </div>
              <button onClick={() => setShowImportModal(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-5 space-y-4">
              {/* Formato */}
              <div className="rounded-xl bg-white/3 border border-white/5 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-3.5 h-3.5 text-gray-500" />
                  <span className="text-xs font-medium text-gray-400">Formato esperado (cabeçalho obrigatório)</span>
                </div>
                <code className="text-[11px] text-amber-300 break-all leading-relaxed">
                  subjectId,banca,year,level,statement,A,B,C,D,E,answer,explanation
                </code>
                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-gray-500">
                  <span><span className="text-gray-300">subjectId</span> — UUID da matéria (obrigatório)</span>
                  <span><span className="text-gray-300">level</span> — easy | medium | hard</span>
                  <span><span className="text-gray-300">A, B</span> — alternativas obrigatórias</span>
                  <span><span className="text-gray-300">C, D, E</span> — alternativas opcionais</span>
                  <span><span className="text-gray-300">answer</span> — A, B, C, D ou E</span>
                  <span><span className="text-gray-300">explanation</span> — opcional</span>
                </div>
              </div>

              {/* Upload de arquivo */}
              <div>
                <label className="flex items-center gap-2 w-fit cursor-pointer px-4 py-2 rounded-lg border border-white/10 text-sm text-gray-400 hover:text-white hover:border-amber-500/40 transition-colors">
                  <Upload className="w-4 h-4" />
                  Selecionar arquivo .csv
                  <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleImportFile} />
                </label>
                {importCsv && (
                  <p className="text-xs text-green-400 mt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    {importCsv.split("\n").length - 1} linhas carregadas do arquivo
                  </p>
                )}
              </div>

              {/* Textarea */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Ou cole o CSV aqui</label>
                <textarea
                  value={importCsv}
                  onChange={e => setImportCsv(e.target.value)}
                  rows={10}
                  placeholder={"subjectId,banca,year,level,statement,A,B,C,D,E,answer,explanation\nabc-123,CESPE,2024,medium,\"Enunciado da questão...\",\"Alt A\",\"Alt B\",\"Alt C\",\"Alt D\",\"Alt E\",B,\"Gabarito explicado\""}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-gray-300 focus:outline-none focus:border-amber-500/50 resize-none"
                />
              </div>

              {/* Resultado */}
              {importResult && (
                <div className={`rounded-xl border p-4 ${importResult.inserted > 0 ? "bg-green-500/5 border-green-500/20" : "bg-red-500/5 border-red-500/20"}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {importResult.inserted > 0
                      ? <CheckCircle2 className="w-4 h-4 text-green-400" />
                      : <AlertCircle className="w-4 h-4 text-red-400" />}
                    <span className="text-sm font-medium">
                      {importResult.inserted} inserida(s) · {importResult.skipped} ignorada(s)
                    </span>
                  </div>
                  {importResult.errors.length > 0 && (
                    <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                      {importResult.errors.slice(0, 10).map((e, i) => (
                        <p key={i} className="text-[11px] text-red-400">
                          {e.row > 0 ? `Linha ${e.row}: ` : ""}{e.reason}
                        </p>
                      ))}
                      {importResult.errors.length > 10 && (
                        <p className="text-[11px] text-gray-600">
                          ...e mais {importResult.errors.length - 10} erro(s)
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-3 p-5 border-t border-white/5">
              <button onClick={() => setShowImportModal(false)}
                className="flex-1 py-2 rounded-lg border border-white/10 text-sm text-gray-400 hover:text-white transition-colors">
                Fechar
              </button>
              <button
                onClick={handleImport}
                disabled={importLoading || !importCsv.trim()}
                className="flex-1 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {importLoading
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Importando…</>
                  : <><Upload className="w-4 h-4" /> Importar</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
