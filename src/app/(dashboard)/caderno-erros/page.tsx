"use client";
import { useState, useEffect, useCallback } from "react";
import { TourGuide } from "@/components/tour/tour-guide";
import { CADERNO_ERROS_STEPS } from "@/components/tour/tour-steps";
import Link from "next/link";
import {
  BookMarked, ChevronDown, ChevronUp, CheckCircle2, Circle,
  RefreshCw, AlertTriangle, Search, Filter, Brain, ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";

interface QuestionError {
  id: number;
  statement: string;
  answer: string;
  level: string;
  banca: string | null;
  year: number | null;
  optionA: string | null;
  optionB: string | null;
  optionC: string | null;
  optionD: string | null;
  optionE: string | null;
  explanation: string | null;
  wrongCount: number;
  aprendido: boolean;
  lastWrong: string;
}

interface SubjectGroup {
  id: string | null;
  name: string;
  total: number;
  aprendidos: number;
  questions: QuestionError[];
}

interface CadernoData {
  subjects: SubjectGroup[];
  total: number;
  aprendidos: number;
}

const LEVEL_STYLE: Record<string, string> = {
  facil:   "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
  medio:   "bg-yellow-500/10 border-yellow-500/20 text-yellow-400",
  dificil: "bg-red-500/10 border-red-500/20 text-red-400",
};
const LEVEL_LABEL: Record<string, string> = { facil: "Fácil", medio: "Médio", dificil: "Difícil" };

function fmtDate(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export default function CadernoErrosPage() {
  const [data, setData]           = useState<CadernoData | null>(null);
  const [apiError, setApiError]   = useState(false);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded]   = useState<string | null>(null);
  const [search, setSearch]       = useState("");
  const [filter, setFilter]       = useState<"all" | "pendente" | "aprendido">("pendente");
  const [toggling, setToggling]     = useState<number | null>(null);
  const [autoFcCount, setAutoFcCount] = useState<number>(0);
  const [expandedQ, setExpandedQ]  = useState<number | null>(null);

  const load = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    else setLoading(true);
    setApiError(false);
    try {
      const [res, autoRes] = await Promise.all([
        fetch("/api/workspace/caderno"),
        fetch("/api/workspace/flashcards/auto-erro"),
      ]);
      if (res.ok) {
        setData(await res.json());
      } else {
        console.error("[caderno] API retornou:", res.status);
        setApiError(true);
      }
      if (autoRes.ok) {
        const autoData = await autoRes.json() as { total: number };
        setAutoFcCount(autoData.total ?? 0);
      }
    } catch (e) {
      console.error("[caderno] Erro de rede:", e);
      setApiError(true);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggleAprendido(subjectId: string | null, questionId: number, current: boolean) {
    setToggling(questionId);
    const res = await fetch("/api/workspace/caderno", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId, aprendido: !current }),
    });
    if (res.ok) {
      setData(prev => {
        if (!prev) return prev;
        const sid = subjectId ?? "__sem_materia__";
        return {
          ...prev,
          aprendidos: prev.aprendidos + (!current ? 1 : -1),
          subjects: prev.subjects.map(s =>
            (s.id ?? "__sem_materia__") === sid
              ? {
                  ...s,
                  aprendidos: s.aprendidos + (!current ? 1 : -1),
                  questions: s.questions.map(q =>
                    q.id === questionId ? { ...q, aprendido: !current } : q
                  ),
                }
              : s
          ),
        };
      });
    }
    setToggling(null);
  }

  if (loading) {
    return (
      <div className="min-h-screen text-white p-6 max-w-3xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-white/5 rounded-xl w-56" />
          <div className="grid grid-cols-3 gap-3">
            {[0,1,2].map(i => <div key={i} className="h-20 bg-white/5 rounded-xl" />)}
          </div>
          {[0,1,2].map(i => <div key={i} className="h-16 bg-white/5 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (apiError) {
    return (
      <div className="min-h-screen text-white p-6 max-w-3xl mx-auto flex flex-col items-center justify-center">
        <AlertTriangle className="w-10 h-10 text-red-400 mb-3" />
        <p className="text-gray-300 font-semibold mb-1">Erro ao carregar o caderno</p>
        <p className="text-gray-500 text-sm mb-4">Não foi possível conectar ao servidor.</p>
        <button
          onClick={() => load()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-sm font-medium transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Tentar novamente
        </button>
      </div>
    );
  }

  const d = data ?? { subjects: [], total: 0, aprendidos: 0 };

  const filteredSubjects = (d?.subjects ?? []).map(s => {
    const qs = s.questions.filter(q => {
      const matchFilter =
        filter === "all" ||
        (filter === "pendente" && !q.aprendido) ||
        (filter === "aprendido" && q.aprendido);
      const matchSearch = !search || q.statement.toLowerCase().includes(search.toLowerCase());
      return matchFilter && matchSearch;
    });
    return { ...s, questions: qs, filteredTotal: qs.length };
  }).filter(s => s.filteredTotal > 0);

  const pendentes = (d?.total ?? 0) - (d?.aprendidos ?? 0);

  return (
    <div className="min-h-screen text-white p-6 max-w-3xl mx-auto">
      <TourGuide tourId="caderno-erros" steps={CADERNO_ERROS_STEPS} autoStart buttonLabel="Tour: Caderno" />
      {/* Header */}
      <div id="tour-caderno-header" className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookMarked className="w-6 h-6 text-rose-400" />
            Caderno de Erros
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Todas as questões que você errou, organizadas por matéria
          </p>
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="p-2 text-gray-600 hover:text-gray-300 transition-colors"
        >
          <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
        </button>
      </div>

      {d?.total === 0 ? (
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-10 text-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
          <p className="text-gray-300 font-semibold mb-1">Caderno vazio!</p>
          <p className="text-gray-500 text-sm">Você ainda não errou nenhuma questão ou acabou de começar.</p>
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 text-center">
              <p className="text-2xl font-black text-rose-400">{d?.total ?? 0}</p>
              <p className="text-xs text-gray-500 mt-0.5">Total de erros</p>
            </div>
            <div className="rounded-xl bg-amber-500/[0.06] border border-amber-500/20 p-4 text-center">
              <p className="text-2xl font-black text-amber-400">{pendentes}</p>
              <p className="text-xs text-gray-500 mt-0.5">Pendentes</p>
            </div>
            <div className="rounded-xl bg-emerald-500/[0.06] border border-emerald-500/20 p-4 text-center">
              <p className="text-2xl font-black text-emerald-400">{d?.aprendidos ?? 0}</p>
              <p className="text-xs text-gray-500 mt-0.5">Aprendidos</p>
            </div>
          </div>

          {/* Progress bar */}
          {(d?.total ?? 0) > 0 && (
            <div className="mb-5">
              <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                <span>Progresso de aprendizado</span>
                <span>{Math.round(((d?.aprendidos ?? 0) / (d?.total ?? 1)) * 100)}%</span>
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                  style={{ width: `${Math.round(((d?.aprendidos ?? 0) / (d?.total ?? 1)) * 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Link para flashcards automáticos */}
          {autoFcCount > 0 && (
            <Link
              href="/flashcards"
              className="flex items-center justify-between w-full rounded-xl border border-violet-500/20 bg-violet-500/[0.05] hover:bg-violet-500/[0.1] transition-colors p-4 mb-5 group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-violet-600/20 flex items-center justify-center">
                  <Brain className="w-4 h-4 text-violet-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-violet-200">Flashcards de Erros Automáticos</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {autoFcCount} flashcard{autoFcCount !== 1 ? "s" : ""} gerado{autoFcCount !== 1 ? "s" : ""} pela IA a partir dos seus erros
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors flex-shrink-0" />
            </Link>
          )}

          {/* Search + filter */}
          <div id="tour-caderno-filtros" className="flex gap-2 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar questão..."
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/40"
              />
            </div>
            <div className="flex rounded-xl overflow-hidden border border-white/[0.08]">
              {[
                { id: "pendente" as const, label: "Pendentes" },
                { id: "all" as const, label: "Todos" },
                { id: "aprendido" as const, label: "Aprendidos" },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={cn(
                    "px-3 py-2 text-xs font-medium transition-colors",
                    filter === f.id ? "bg-indigo-600 text-white" : "text-gray-500 hover:text-gray-300"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Subject groups */}
          <div id="tour-caderno-questao" />
          {filteredSubjects.length === 0 ? (
            <div className="text-center py-8 text-gray-600 text-sm">
              <Filter className="w-8 h-8 mx-auto mb-2 opacity-40" />
              Nenhuma questão para este filtro.
            </div>
          ) : (
            <div className="space-y-2">
              {filteredSubjects.map(subj => {
                const isExp = expanded === (subj.id ?? "__sem__");
                const pend = subj.questions.filter(q => !q.aprendido && (filter !== "aprendido")).length;
                return (
                  <div key={subj.id ?? "__sem__"}
                    className="rounded-xl bg-white/[0.02] border border-white/[0.04] overflow-hidden">
                    <button
                      onClick={() => setExpanded(isExp ? null : (subj.id ?? "__sem__"))}
                      className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/[0.02] transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white">{subj.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-gray-600">{subj.filteredTotal} questões</span>
                          {pend > 0 && (
                            <span className="text-xs text-amber-500">· {pend} pendente{pend !== 1 ? "s" : ""}</span>
                          )}
                        </div>
                      </div>
                      {/* Mini progress */}
                      <div className="flex-shrink-0 flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-emerald-500 transition-all"
                            style={{ width: `${Math.round((subj.aprendidos / subj.total) * 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-600 w-8 text-right">
                          {Math.round((subj.aprendidos / subj.total) * 100)}%
                        </span>
                      </div>
                      {isExp
                        ? <ChevronUp className="w-4 h-4 text-gray-600 flex-shrink-0" />
                        : <ChevronDown className="w-4 h-4 text-gray-600 flex-shrink-0" />}
                    </button>

                    {isExp && (
                      <div className="border-t border-white/[0.04] divide-y divide-white/[0.03]">
                        {subj.questions.map(q => {
                          const isQExp = expandedQ === q.id;
                          const opts = (["A","B","C","D","E"] as const)
                            .map(l => ({ l, v: q[`option${l}` as keyof QuestionError] as string | null }))
                            .filter(o => o.v);
                          return (
                            <div key={q.id} className={cn(
                              "transition-colors",
                              q.aprendido && !isQExp && "opacity-50"
                            )}>
                              {/* Linha de preview — clica para expandir */}
                              <button
                                onClick={() => setExpandedQ(isQExp ? null : q.id)}
                                className="w-full flex items-start gap-3 p-4 text-left hover:bg-white/[0.02] transition-colors"
                              >
                                <div className="mt-0.5 flex-shrink-0">
                                  {q.aprendido
                                    ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                    : <AlertTriangle className="w-4 h-4 text-amber-500/70 mt-0.5" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className={cn(
                                    "text-xs text-gray-300 leading-relaxed text-left",
                                    q.aprendido && "text-gray-500"
                                  )}>
                                    {q.statement.slice(0, 120)}{q.statement.length > 120 ? "…" : ""}
                                  </p>
                                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                    {q.level && (
                                      <span className={cn("text-[9px] px-1.5 py-0.5 rounded border", LEVEL_STYLE[q.level] ?? "text-gray-500")}>
                                        {LEVEL_LABEL[q.level] ?? q.level}
                                      </span>
                                    )}
                                    {q.banca && <span className="text-[9px] text-gray-600">{q.banca}</span>}
                                    {q.year  && <span className="text-[9px] text-gray-600">{q.year}</span>}
                                    <span className="text-[9px] text-rose-500">{q.wrongCount}× errou</span>
                                    {q.lastWrong && (
                                      <span className="text-[9px] text-gray-700">último erro: {fmtDate(q.lastWrong)}</span>
                                    )}
                                  </div>
                                </div>
                                {isQExp
                                  ? <ChevronUp   className="w-4 h-4 text-gray-600 flex-shrink-0 mt-0.5" />
                                  : <ChevronDown className="w-4 h-4 text-gray-600 flex-shrink-0 mt-0.5" />}
                              </button>

                              {/* Questão expandida */}
                              {isQExp && (
                                <div className="px-4 pb-4 space-y-3">
                                  {/* Enunciado completo */}
                                  <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
                                    <p className="text-xs text-gray-200 leading-relaxed">{q.statement}</p>
                                  </div>

                                  {/* Alternativas */}
                                  {opts.length > 0 && (
                                    <div className="space-y-2">
                                      {opts.map(o => {
                                        const isCorrect = o.l === q.answer;
                                        return (
                                          <div
                                            key={o.l}
                                            className={cn(
                                              "flex items-start gap-3 px-4 py-3 rounded-xl border text-xs",
                                              isCorrect
                                                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-200"
                                                : "bg-white/[0.02] border-white/[0.05] text-gray-400"
                                            )}
                                          >
                                            <span className={cn(
                                              "font-bold w-4 flex-shrink-0",
                                              isCorrect ? "text-emerald-400" : "text-gray-600"
                                            )}>{o.l})</span>
                                            <span className="flex-1">{o.v}</span>
                                            {isCorrect && (
                                              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}

                                  {/* Explicação */}
                                  {q.explanation && (
                                    <div className="rounded-xl bg-indigo-500/[0.06] border border-indigo-500/20 p-4">
                                      <p className="text-[10px] text-indigo-400 font-semibold uppercase tracking-wide mb-1.5">
                                        💡 Explicação
                                      </p>
                                      <p className="text-xs text-gray-300 leading-relaxed">{q.explanation}</p>
                                    </div>
                                  )}

                                  {/* Ação: marcar como aprendido */}
                                  <button
                                    onClick={() => toggleAprendido(subj.id, q.id, q.aprendido)}
                                    disabled={toggling === q.id}
                                    className={cn(
                                      "w-full py-2.5 rounded-xl border text-xs font-semibold transition-all flex items-center justify-center gap-2",
                                      q.aprendido
                                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-white/[0.03] hover:border-white/10 hover:text-gray-400"
                                        : "bg-emerald-600 hover:bg-emerald-700 border-transparent text-white"
                                    )}
                                  >
                                    {toggling === q.id ? (
                                      <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                    ) : q.aprendido ? (
                                      <><CheckCircle2 className="w-3.5 h-3.5" /> Marcado como aprendido — desfazer</>
                                    ) : (
                                      <><CheckCircle2 className="w-3.5 h-3.5" /> Já aprendi esta questão</>
                                    )}
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
