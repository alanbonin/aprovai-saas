"use client";

import { useState, useTransition } from "react";
import {
  CheckCircle2, Trash2, Loader2, AlertCircle, ChevronDown, ChevronUp,
  CheckSquare, Square, LayoutList, CheckCheck, XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PendingQuestion } from "./page";

const LEVEL_LABEL: Record<string, string> = {
  facil: "Fácil", medio: "Médio", dificil: "Difícil",
};
const LEVEL_COLOR: Record<string, string> = {
  facil: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  medio: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  dificil: "text-red-400 bg-red-500/10 border-red-500/20",
};

const OPTIONS = ["A", "B", "C", "D", "E"] as const;

interface Props {
  questions: PendingQuestion[];
  subjectMap: Record<string, string>;
}

export function ModeracaoClient({ questions: initial, subjectMap }: Props) {
  const [questions, setQuestions] = useState(initial);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);
  const [, startTransition] = useTransition();

  function toggleExpand(id: number) {
    setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleSelect(id: number) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function selectAll() { setSelected(new Set(questions.map(q => q.id))); }
  function clearSelection() { setSelected(new Set()); }

  const allSelected = questions.length > 0 && selected.size === questions.length;
  const someSelected = selected.size > 0 && !allSelected;

  async function handleAction(id: number, aprovado: boolean) {
    setError(null);
    setLoadingId(id);
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/questoes/aprovar", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, aprovado }),
        });
        if (!res.ok) {
          const data = await res.json() as { error?: string };
          setError(data.error ?? "Erro ao atualizar questão");
        } else {
          setQuestions(prev => prev.filter(q => q.id !== id));
          setSelected(prev => { const n = new Set(prev); n.delete(id); return n; });
        }
      } catch { setError("Erro de rede. Tente novamente."); }
      finally { setLoadingId(null); }
    });
  }

  async function handleBatch(aprovado: boolean) {
    if (selected.size === 0) return;
    setError(null);
    setBatchLoading(true);
    try {
      const res = await fetch("/api/admin/questoes/aprovar", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...selected], aprovado }),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        setError(data.error ?? "Erro ao processar lote");
      } else {
        const ids = new Set(selected);
        setQuestions(prev => prev.filter(q => !ids.has(q.id)));
        setSelected(new Set());
      }
    } catch { setError("Erro de rede. Tente novamente."); }
    finally { setBatchLoading(false); }
  }

  if (questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-500">
        <CheckCircle2 className="w-12 h-12 mb-4 text-[#0ab5bd]" />
        <p className="text-lg font-medium text-gray-300">Nenhuma questão pendente</p>
        <p className="text-sm mt-1">Todas as questões foram moderadas.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Barra de seleção em lote */}
      <div className="flex items-center gap-3 p-3 rounded-xl border border-white/8 bg-white/[0.02] flex-wrap">
        <button
          onClick={allSelected ? clearSelection : selectAll}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
        >
          {allSelected
            ? <CheckSquare className="w-4 h-4 text-[#0ab5bd]" />
            : someSelected
            ? <LayoutList className="w-4 h-4 text-[#0ab5bd]" />
            : <Square className="w-4 h-4" />}
          {allSelected ? "Desmarcar todos" : `Selecionar todos (${questions.length})`}
        </button>

        {selected.size > 0 && (
          <>
            <span className="text-gray-700">|</span>
            <span className="text-xs text-gray-400">
              <span className="text-white font-medium">{selected.size}</span> selecionada{selected.size !== 1 ? "s" : ""}
            </span>
            <div className="ml-auto flex gap-2">
              <button
                onClick={() => handleBatch(true)}
                disabled={batchLoading}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium bg-[#0ab5bd]/15 text-[#0ab5bd] border border-[#0ab5bd]/30 hover:bg-[#0ab5bd]/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {batchLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCheck className="w-3.5 h-3.5" />}
                Aprovar selecionadas
              </button>
              <button
                onClick={() => handleBatch(false)}
                disabled={batchLoading}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/25 hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {batchLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                Rejeitar selecionadas
              </button>
            </div>
          </>
        )}

        {selected.size === 0 && (
          <span className="ml-auto text-xs text-gray-600">
            {questions.length} pendente{questions.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Erro */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-400/60 hover:text-red-300">✕</button>
        </div>
      )}

      {/* Lista */}
      <div className="space-y-2">
        {questions.map((q) => {
          const isLoading = loadingId === q.id;
          const isExpanded = expanded.has(q.id);
          const isSelected = selected.has(q.id);
          const subjectName = q.subjectId ? (subjectMap[q.subjectId] ?? q.subjectId) : null;
          const levelKey = (q.level ?? "medio").toLowerCase();
          const correctOption = (q.answer ?? "").toUpperCase();

          return (
            <div
              key={q.id}
              className={cn(
                "rounded-xl border transition-all",
                isSelected
                  ? "border-[#0ab5bd]/40 bg-[#0ab5bd]/[0.04]"
                  : "border-white/8 bg-white/[0.02] hover:border-white/12"
              )}
            >
              {/* Cabeçalho */}
              <div className="flex items-start gap-3 p-4">
                <button
                  onClick={() => toggleSelect(q.id)}
                  className="mt-0.5 flex-shrink-0 text-gray-500 hover:text-[#0ab5bd] transition-colors"
                >
                  {isSelected
                    ? <CheckSquare className="w-4 h-4 text-[#0ab5bd]" />
                    : <Square className="w-4 h-4" />}
                </button>

                <div className="flex-1 min-w-0">
                  {/* Tags */}
                  <div className="flex flex-wrap items-center gap-1.5 mb-2">
                    <span className="text-xs text-gray-600 font-mono">#{q.id}</span>
                    {subjectName && (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-white/5 border border-white/10 text-gray-300">
                        {subjectName}
                      </span>
                    )}
                    {q.banca && (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-blue-500/10 border border-blue-500/20 text-blue-300">
                        {q.banca}
                      </span>
                    )}
                    {q.year && (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-white/5 border border-white/8 text-gray-500">
                        {q.year}
                      </span>
                    )}
                    <span className={cn("px-2 py-0.5 rounded-full text-xs border", LEVEL_COLOR[levelKey] ?? LEVEL_COLOR.medio)}>
                      {LEVEL_LABEL[levelKey] ?? q.level}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-xs bg-white/5 border border-white/8 text-gray-600">
                      {q.source ?? "ia"}
                    </span>
                    <span className="text-xs text-gray-700 ml-auto whitespace-nowrap">
                      {new Date(q.createdAt).toLocaleDateString("pt-BR", {
                        day: "2-digit", month: "2-digit", year: "2-digit",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </span>
                  </div>

                  {/* Enunciado */}
                  <p className={cn("text-sm text-gray-200 leading-relaxed", !isExpanded && "line-clamp-2")}>
                    {q.statement}
                  </p>
                </div>

                <button
                  onClick={() => toggleExpand(q.id)}
                  className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-colors"
                >
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>

              {/* Detalhes expandidos */}
              {isExpanded && (
                <div className="border-t border-white/8 px-4 pb-4 pt-3 space-y-4">
                  {/* Alternativas */}
                  {[q.optionA, q.optionB, q.optionC, q.optionD, q.optionE].some(Boolean) && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Alternativas</p>
                      <div className="space-y-1.5">
                        {OPTIONS.map((letter, i) => {
                          const text = [q.optionA, q.optionB, q.optionC, q.optionD, q.optionE][i];
                          if (!text) return null;
                          const isCorrect = correctOption === letter;
                          return (
                            <div
                              key={letter}
                              className={cn(
                                "flex items-start gap-3 px-3 py-2 rounded-lg text-sm",
                                isCorrect
                                  ? "bg-emerald-500/10 border border-emerald-500/25"
                                  : "bg-white/[0.02] border border-white/5"
                              )}
                            >
                              <span className={cn(
                                "flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold mt-0.5",
                                isCorrect ? "bg-emerald-500 text-white" : "bg-white/10 text-gray-400"
                              )}>
                                {letter}
                              </span>
                              <span className={isCorrect ? "text-emerald-300" : "text-gray-300"}>
                                {text}
                              </span>
                              {isCorrect && (
                                <span className="ml-auto flex-shrink-0 text-xs text-emerald-400 font-medium">✓ Correta</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Justificativa */}
                  {q.explanation && (
                    <div className="rounded-lg bg-amber-500/5 border border-amber-500/15 p-3">
                      <p className="text-xs font-medium text-amber-400/80 uppercase tracking-wider mb-1.5">📖 Justificativa</p>
                      <p className="text-sm text-gray-300 leading-relaxed">{q.explanation}</p>
                    </div>
                  )}

                  {/* Dicas (banca + tópico) */}
                  {(() => {
                    if (!q.analysis) return null;
                    try {
                      const dicas = JSON.parse(q.analysis) as { banca?: string | null; questao?: string | null };
                      if (!dicas.banca && !dicas.questao) return null;
                      return (
                        <div className="grid gap-2 sm:grid-cols-2">
                          {dicas.banca && (
                            <div className="rounded-lg bg-blue-500/5 border border-blue-500/15 p-3">
                              <p className="text-xs font-medium text-blue-400/80 uppercase tracking-wider mb-1.5">🏛️ Dica da Banca</p>
                              <p className="text-sm text-gray-300 leading-relaxed">{dicas.banca}</p>
                            </div>
                          )}
                          {dicas.questao && (
                            <div className="rounded-lg bg-purple-500/5 border border-purple-500/15 p-3">
                              <p className="text-xs font-medium text-purple-400/80 uppercase tracking-wider mb-1.5">💡 Dica do Tópico</p>
                              <p className="text-sm text-gray-300 leading-relaxed">{dicas.questao}</p>
                            </div>
                          )}
                        </div>
                      );
                    } catch { return null; }
                  })()}
                </div>
              )}

              {/* Ações */}
              <div className="flex items-center gap-2 px-4 py-2.5 border-t border-white/5">
                <button
                  onClick={() => handleAction(q.id, true)}
                  disabled={isLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#0ab5bd]/10 text-[#0ab5bd] border border-[#0ab5bd]/25 hover:bg-[#0ab5bd]/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  Aprovar
                </button>
                <button
                  onClick={() => handleAction(q.id, false)}
                  disabled={isLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  Rejeitar
                </button>
                <button
                  onClick={() => toggleExpand(q.id)}
                  className="ml-auto text-xs text-gray-600 hover:text-gray-400 transition-colors"
                >
                  {isExpanded ? "Fechar ▲" : "Ver detalhes ▼"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-gray-700 pt-1">
        Exibindo {questions.length} questão{questions.length !== 1 ? "ões" : ""} pendentes (limite: 200)
      </p>
    </div>
  );
}
