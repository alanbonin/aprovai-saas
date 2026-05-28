"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle, XCircle, ChevronRight, RotateCcw, Filter,
  Star, Zap, BookOpen, Trophy, Flag, X, Lightbulb,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSessionState } from "@/lib/use-session-state";

const QS_KEY = "questoes:session";

interface Question {
  id: number;
  banca: string | null;
  year: number | null;
  level: string;
  statement: string;
  optionA: string | null;
  optionB: string | null;
  optionC: string | null;
  optionD: string | null;
  optionE: string | null;
  answer: string;
  explanation: string | null;
  subjectId: string | null;
}

interface Subject {
  id: string;
  name: string;
  ids?: string[]; // múltiplos IDs para o mesmo nome (cross-categoria)
}

const BANCAS = ["CESPE", "FGV", "VUNESP", "FCC", "IBFC", "CESGRANRIO", "AOCP"];
const LEVELS = [
  { id: "facil", label: "Fácil" },
  { id: "medio", label: "Médio" },
  { id: "dificil", label: "Difícil" },
];

const QUALITY_OPTS = [
  { id: "errei",   label: "Errei",   color: "border-red-500/60 bg-red-500/10 text-red-400 hover:bg-red-500/20" },
  { id: "dificil", label: "Difícil", color: "border-amber-500/60 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20" },
  { id: "ok",      label: "OK",      color: "border-blue-500/60 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20" },
  { id: "facil",   label: "Fácil",   color: "border-green-500/60 bg-green-500/10 text-green-400 hover:bg-green-500/20" },
];

export function QuestoesInner() {
  const searchParams = useSearchParams();

  // Estado persistido — sobrevive à navegação
  const [questions, setQuestions]   = useSessionState<Question[]>(`${QS_KEY}:questions`, []);
  const [current, setCurrent]       = useSessionState<number>(`${QS_KEY}:current`, 0);
  const [score, setScore]           = useSessionState<{ correct: number; total: number; xpGained: number }>(`${QS_KEY}:score`, { correct: 0, total: 0, xpGained: 0 });
  const [filterBanca, setFilterBanca]   = useSessionState<string>(`${QS_KEY}:banca`, "");
  const [filterLevel, setFilterLevel]   = useSessionState<string>(`${QS_KEY}:level`, "");
  const [filterSubject, setFilterSubject] = useSessionState<string>(`${QS_KEY}:subject`, searchParams.get("subjectId") ?? "");
  const [filterYear, setFilterYear]     = useSessionState<string>(`${QS_KEY}:year`, "");
  const [onlyFavs, setOnlyFavs]         = useSessionState<boolean>(`${QS_KEY}:favs`, searchParams.get("favoritos") === "1");
  const [onlyErros, setOnlyErros]       = useSessionState<boolean>(`${QS_KEY}:erros`, searchParams.get("erros") === "1");
  const [done, setDone]                 = useSessionState<boolean>(`${QS_KEY}:done`, false);

  // Estado local (não precisa persistir)
  const [subjects, setSubjects]     = useState<Subject[]>([]);
  const [favoritos, setFavoritos]   = useState<number[]>([]);
  const [selected, setSelected]     = useState<string | null>(null);
  const [quality, setQuality]       = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [loading, setLoading]       = useState(questions.length === 0); // não recarrega se tem questões
  const [xpFlash, setXpFlash]       = useState(0);
  const [showFilter, setShowFilter] = useState(
    searchParams.get("favoritos") === "1" || searchParams.get("erros") === "1"
  );

  // Definição de palavras
  const [defWord, setDefWord]       = useState<string | null>(null);
  const [defText, setDefText]       = useState<string | null>(null);
  const [defLoading, setDefLoading] = useState(false);
  const defRef = useRef<HTMLDivElement>(null);

  // Reporte de questão
  const [reportModal, setReportModal]     = useState<number | null>(null); // questionId
  const [reportMotivo, setReportMotivo]   = useState("gabarito_errado");
  const [reportDesc, setReportDesc]       = useState("");
  const [reportSending, setReportSending] = useState(false);
  const [reportSent, setReportSent]       = useState<number | null>(null);

  // Load subjects once
  useEffect(() => {
    fetch("/api/workspace/materias")
      .then(r => r.json())
      .then(d => setSubjects(d.subjects ?? []))
      .catch(() => {});
  }, []);

  // Load favoritos once
  useEffect(() => {
    fetch("/api/questoes/favoritos")
      .then(r => r.json())
      .then(d => setFavoritos(d.favoritos ?? []))
      .catch(() => {});
  }, []);

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    setDone(false);
    const params = new URLSearchParams();
    if (filterBanca)   params.set("banca", filterBanca);
    if (filterLevel)   params.set("level", filterLevel);
    if (filterSubject) {
      // Usa subjectIds (cross-categoria) se o subject tiver múltiplos IDs
      const sub = subjects.find(s => s.id === filterSubject);
      if (sub?.ids && sub.ids.length > 1) params.set("subjectIds", sub.ids.join(","));
      else params.set("subjectId", filterSubject);
    }
    if (filterYear)    params.set("year", filterYear);
    if (onlyFavs)      params.set("favoritos", "1");
    if (onlyErros)     params.set("erros", "1");
    params.set("limit", "20");
    const res = await fetch(`/api/questoes?${params}`);
    const data = await res.json();
    setQuestions(data.questions ?? []);
    setCurrent(0);
    setSelected(null);
    setQuality(null);
    setShowResult(false);
    setScore({ correct: 0, total: 0, xpGained: 0 });
    setLoading(false);
  }, [filterBanca, filterLevel, filterSubject, filterYear, onlyFavs, onlyErros]);

  useEffect(() => { loadQuestions(); }, [loadQuestions]);

  const q = questions[current];
  const options = q ? [
    { key: "A", text: q.optionA },
    { key: "B", text: q.optionB },
    { key: "C", text: q.optionC },
    { key: "D", text: q.optionD },
    { key: "E", text: q.optionE },
  ].filter(o => o.text) : [];

  function handleSelect(key: string) {
    if (selected) return;
    setSelected(key);
    setShowResult(true); // abre explicação automaticamente
    setDefWord(null);    // fecha qualquer definição aberta
    setDefText(null);
    const isCorrect = key === q.answer;
    setScore(s => ({
      correct: s.correct + (isCorrect ? 1 : 0),
      total: s.total + 1,
      xpGained: s.xpGained + (isCorrect ? 2 : 0),
    }));
    if (isCorrect) {
      setXpFlash(f => f + 1);
      setTimeout(() => setXpFlash(f => f - 1), 1500);
    }
  }

  async function fetchDefinicao(palavra: string) {
    const termo = palavra.replace(/[^a-zA-ZÀ-ÿ\-]/g, "").trim();
    if (!termo || termo.length < 3) return;
    // Toggle off se já aberto
    if (defWord === termo) { setDefWord(null); setDefText(null); return; }

    setDefWord(termo);
    setDefText(null);
    setDefLoading(true);
    try {
      const res = await fetch(
        `/api/questoes/definicao?termo=${encodeURIComponent(termo)}&contexto=${encodeURIComponent((q?.statement ?? "").slice(0, 200))}`
      );
      const data = await res.json() as { definicao?: string };
      setDefText(data.definicao ?? "Definição não encontrada.");
    } catch {
      setDefText("Erro ao buscar definição.");
    }
    setDefLoading(false);
    // scroll suave até o card de definição
    setTimeout(() => defRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 100);
  }

  async function handleQuality(q_id: string) {
    setQuality(q_id);
    // Save progress with SM-2 quality
    const isCorrect = selected === q.answer;
    await fetch("/api/questoes/progresso", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId: q.id, correct: isCorrect, quality: q_id }),
    }).catch(() => {});
    // Auto-advance after short delay
    setTimeout(next, 300);
  }

  function next() {
    if (current < questions.length - 1) {
      setCurrent(c => c + 1);
      setSelected(null);
      setQuality(null);
      setShowResult(false);
    } else {
      setDone(true);
    }
  }

  async function toggleFav(questionId: number) {
    const isFav = favoritos.includes(questionId);
    const action = isFav ? "remove" : "add";
    setFavoritos(prev => isFav ? prev.filter(id => id !== questionId) : [...prev, questionId]);
    await fetch("/api/questoes/favoritos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId, action }),
    }).catch(() => {});
  }

  async function submitReporte() {
    if (!reportModal) return;
    setReportSending(true);
    await fetch("/api/questoes/reportar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId: reportModal, motivo: reportMotivo, descricao: reportDesc || null }),
    }).catch(() => {});
    setReportSent(reportModal);
    setReportSending(false);
    setReportModal(null);
    setReportDesc("");
    setTimeout(() => setReportSent(null), 3000);
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen text-white">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-400">Carregando questões...</p>
        </div>
      </div>
    );
  }

  // Session done screen
  if (done && score.total > 0) {
    const pct = Math.round((score.correct / score.total) * 100);
    return (
      <div className="min-h-screen text-white p-6 max-w-lg mx-auto flex flex-col items-center justify-center">
        <Trophy className="w-16 h-16 text-yellow-400 mb-4" />
        <h2 className="text-2xl font-bold mb-1">Sessão concluída!</h2>
        <p className="text-gray-400 text-sm mb-6">Você respondeu todas as questões desta sessão</p>
        <div className="w-full grid grid-cols-3 gap-3 mb-6">
          <div className="rounded-xl bg-white/5 border border-white/10 p-4 text-center">
            <p className="text-2xl font-black text-white">{score.correct}/{score.total}</p>
            <p className="text-xs text-gray-500 mt-0.5">Corretas</p>
          </div>
          <div className="rounded-xl bg-white/5 border border-white/10 p-4 text-center">
            <p className={cn("text-2xl font-black", pct >= 70 ? "text-green-400" : pct >= 50 ? "text-amber-400" : "text-red-400")}>
              {pct}%
            </p>
            <p className="text-xs text-gray-500 mt-0.5">Aproveitamento</p>
          </div>
          <div className="rounded-xl bg-indigo-500/10 border border-indigo-500/20 p-4 text-center">
            <p className="text-2xl font-black text-indigo-400">+{score.xpGained}</p>
            <p className="text-xs text-gray-500 mt-0.5">XP ganho</p>
          </div>
        </div>
        <button
          onClick={loadQuestions}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-sm font-medium transition-colors"
        >
          <RotateCcw className="w-4 h-4 inline mr-2" />
          Nova sessão
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white p-6 max-w-3xl mx-auto">
      {/* Report sent toast */}
      {reportSent && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-500/20 border border-green-500/30 text-green-300 text-sm font-medium shadow-xl">
          <CheckCircle className="w-4 h-4" />
          Reporte enviado — obrigado!
        </div>
      )}

      {/* Report modal */}
      {reportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-[#0d1117] border border-white/10 rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Flag className="w-4 h-4 text-red-400" />
                Reportar questão
              </h3>
              <button onClick={() => setReportModal(null)} className="text-gray-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">Motivo</label>
                <select
                  value={reportMotivo}
                  onChange={e => setReportMotivo(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-indigo-500"
                >
                  <option value="gabarito_errado">Gabarito errado</option>
                  <option value="enunciado_desatualizado">Enunciado desatualizado</option>
                  <option value="alternativas_incorretas">Alternativas incorretas</option>
                  <option value="questao_duplicada">Questão duplicada</option>
                  <option value="outro">Outro</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">Descrição (opcional)</label>
                <textarea
                  value={reportDesc}
                  onChange={e => setReportDesc(e.target.value)}
                  placeholder="Descreva o problema..."
                  rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setReportModal(null)}
                  className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-400 text-sm hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={submitReporte}
                  disabled={reportSending}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {reportSending
                    ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <Flag className="w-4 h-4" />
                  }
                  Enviar reporte
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* XP flash */}
      {xpFlash > 0 && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-600 text-white text-sm font-bold shadow-lg animate-bounce pointer-events-none">
          <Zap className="w-4 h-4" />
          +2 XP
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Questões</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {score.total > 0
              ? `${score.correct}/${score.total} corretas · +${score.xpGained} XP`
              : "Pratique questões de concurso"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilter(!showFilter)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition-colors",
              showFilter ? "bg-indigo-600 border-indigo-500 text-white" : "border-white/10 text-gray-400 hover:text-white"
            )}
          >
            <Filter className="w-4 h-4" />
            Filtros
          </button>
          <button
            onClick={loadQuestions}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border border-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Novas
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilter && (
        <div className="mb-5 p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-36">
              <label className="text-xs text-gray-500 mb-1 block">Matéria</label>
              <select
                value={filterSubject}
                onChange={e => setFilterSubject(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-indigo-500"
              >
                <option value="">Todas</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="flex-1 min-w-36">
              <label className="text-xs text-gray-500 mb-1 block">Banca</label>
              <select
                value={filterBanca}
                onChange={e => setFilterBanca(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-indigo-500"
              >
                <option value="">Todas</option>
                {BANCAS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div className="flex-1 min-w-36">
              <label className="text-xs text-gray-500 mb-1 block">Nível</label>
              <select
                value={filterLevel}
                onChange={e => setFilterLevel(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-indigo-500"
              >
                <option value="">Todos</option>
                {LEVELS.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
              </select>
            </div>
            <div className="flex-1 min-w-36">
              <label className="text-xs text-gray-500 mb-1 block">Ano</label>
              <select
                value={filterYear}
                onChange={e => setFilterYear(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-indigo-500"
              >
                <option value="">Todos</option>
                {Array.from({ length: 12 }, (_, i) => 2025 - i).map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyFavs}
                onChange={e => { setOnlyFavs(e.target.checked); if (e.target.checked) setOnlyErros(false); }}
                className="w-4 h-4 rounded accent-indigo-500"
              />
              <span className="text-sm text-gray-400 flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-yellow-400" />
                Somente favoritas
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyErros}
                onChange={e => { setOnlyErros(e.target.checked); if (e.target.checked) setOnlyFavs(false); }}
                className="w-4 h-4 rounded accent-red-500"
              />
              <span className="text-sm text-gray-400 flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5 text-red-400" />
                Somente erros
              </span>
            </label>
          </div>
        </div>
      )}

      {/* Progress bar */}
      {questions.length > 0 && !done && (
        <div className="mb-5">
          <div className="flex justify-between text-xs text-gray-500 mb-1.5">
            <span>Questão {current + 1} de {questions.length}</span>
            {q?.banca && (
              <span className="text-indigo-400">
                {q.banca}{q.year ? ` · ${q.year}` : ""}
              </span>
            )}
          </div>
          <div className="h-1.5 rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all"
              style={{ width: `${((current + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Empty state */}
      {!q && !done && (
        <div className="text-center py-20">
          <BookOpen className="w-12 h-12 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-400 text-lg">Nenhuma questão encontrada</p>
          <p className="text-gray-600 text-sm mt-1">Tente mudar os filtros ou aguarde novas questões</p>
        </div>
      )}

      {/* Question card */}
      {q && !done && (
        <div className="rounded-2xl bg-white/3 border border-white/5 p-6">
          {/* Subject + fav */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-gray-600 capitalize">
              {q.level === "facil" ? "Fácil" : q.level === "medio" ? "Médio" : q.level === "dificil" ? "Difícil" : q.level}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleFav(q.id)}
                className={cn(
                  "transition-colors",
                  favoritos.includes(q.id) ? "text-yellow-400" : "text-gray-700 hover:text-yellow-400"
                )}
                title={favoritos.includes(q.id) ? "Remover dos favoritos" : "Adicionar aos favoritos"}
              >
                <Star className={cn("w-4 h-4", favoritos.includes(q.id) && "fill-yellow-400")} />
              </button>
              <button
                onClick={() => { setReportModal(q.id); setReportMotivo("gabarito_errado"); setReportDesc(""); }}
                className="text-gray-700 hover:text-red-400 transition-colors"
                title="Reportar problema nesta questão"
              >
                <Flag className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Enunciado com palavras clicáveis para definição */}
          <div className="mb-5">
            <p className="text-gray-200 leading-relaxed text-sm select-none">
              {q.statement.split(/(\s+)/).map((parte, i) => {
                const limpa = parte.replace(/[^a-zA-ZÀ-ÿ\-]/g, "");
                const isAtiva = !!defWord && limpa.toLowerCase() === defWord.toLowerCase();
                const clicavel = !selected && limpa.length >= 3;
                return (
                  <span
                    key={i}
                    onClick={() => clicavel && fetchDefinicao(parte)}
                    className={cn(
                      "transition-colors rounded px-0.5 -mx-0.5",
                      clicavel && "cursor-pointer hover:bg-white/10 hover:text-white",
                      isAtiva && "bg-[#0ab5bd]/25 text-[#0ab5bd] font-medium"
                    )}
                  >
                    {parte}
                  </span>
                );
              })}
            </p>
            {/* Dica de definição (só antes de responder) */}
            {!selected && (
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full
                bg-[#0ab5bd]/10 border border-[#0ab5bd]/30
                shadow-[0_0_12px_rgba(10,181,189,0.15)]">
                <Lightbulb className="w-3.5 h-3.5 text-[#0ab5bd] flex-shrink-0 fill-[#0ab5bd]/30" />
                <span className="text-xs text-[#0ab5bd] font-medium tracking-wide">
                  Toque em qualquer palavra para ver a definição
                </span>
              </div>
            )}

            {/* Card de definição */}
            {defWord && (
              <div ref={defRef} className="mt-3 p-3.5 rounded-xl bg-[#0ab5bd]/10 border border-[#0ab5bd]/30 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#0ab5bd] uppercase tracking-wide">{defWord}</span>
                  <button onClick={() => { setDefWord(null); setDefText(null); }} className="text-gray-600 hover:text-gray-400">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                {defLoading
                  ? <div className="flex items-center gap-2 text-xs text-gray-500"><div className="w-3 h-3 border border-[#0ab5bd]/40 border-t-[#0ab5bd] rounded-full animate-spin" /> Buscando definição…</div>
                  : <p className="text-xs text-gray-300 leading-relaxed">{defText}</p>
                }
              </div>
            )}
          </div>

          {/* Options */}
          <div className="space-y-2.5">
            {options.map(({ key, text }) => {
              const isSelected = selected === key;
              const isCorrect  = key === q.answer;
              let style = "border-white/10 bg-white/3 hover:bg-white/5 text-gray-300";
              if (selected) {
                if (isCorrect)        style = "border-green-500/50 bg-green-500/10 text-green-300";
                else if (isSelected)  style = "border-red-500/50 bg-red-500/10 text-red-300";
                else                  style = "border-white/5 bg-white/2 text-gray-600";
              }

              return (
                <button
                  key={key}
                  onClick={() => handleSelect(key)}
                  disabled={!!selected}
                  className={cn(
                    "w-full text-left flex items-start gap-3 p-3.5 rounded-xl border transition-all text-sm",
                    style,
                    !selected && "cursor-pointer"
                  )}
                >
                  <span className={cn(
                    "w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5",
                    selected && isCorrect  ? "bg-green-500 border-green-500 text-white" :
                    selected && isSelected ? "bg-red-500 border-red-500 text-white" :
                    "border-current"
                  )}>{key}</span>
                  <span className="flex-1">{text}</span>
                  {selected && isCorrect  && <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />}
                  {selected && isSelected && !isCorrect && <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />}
                </button>
              );
            })}
          </div>

          {/* After answer */}
          {selected && (
            <div className="mt-5 space-y-3">
              {/* Explanation — abre automaticamente ao responder */}
              {q.explanation && (
                <div>
                  {/* Header clicável para ocultar/mostrar */}
                  <button
                    onClick={() => setShowResult(r => !r)}
                    className="flex items-center gap-2 text-xs text-amber-400/80 hover:text-amber-300 mb-2 transition-colors"
                  >
                    <Lightbulb className="w-3.5 h-3.5" />
                    <span className="font-medium">{showResult ? "Ocultar" : "Ver"} explicação</span>
                    <ChevronRight className={cn("w-3 h-3 transition-transform", showResult && "rotate-90")} />
                  </button>
                  {showResult && (
                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                      <p className="text-xs text-amber-100 leading-relaxed">{q.explanation}</p>
                    </div>
                  )}
                </div>
              )}

              {/* SM-2 quality rating */}
              {!quality && (
                <div>
                  <p className="text-xs text-gray-500 mb-2">Como foi essa questão para você?</p>
                  <div className="grid grid-cols-4 gap-2">
                    {QUALITY_OPTS.map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => handleQuality(opt.id)}
                        className={cn(
                          "py-2 rounded-lg border text-xs font-medium transition-colors",
                          opt.color
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Manual next (fallback if quality already chosen or auto-advance) */}
              {quality && (
                <button
                  onClick={next}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-sm font-medium transition-colors"
                >
                  {current < questions.length - 1 ? "Próxima questão →" : "Ver resultado"}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
