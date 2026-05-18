"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Trash2, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface PendingQuestion {
  id: number;
  statement: string;
  banca: string | null;
  year: number | null;
  source: string | null;
  createdAt: string;
  subjectId: string | null;
}

interface Props {
  questions: PendingQuestion[];
  subjectMap: Record<string, string>;
}

export function ModeracaoClient({ questions: initial, subjectMap }: Props) {
  const [questions, setQuestions] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [loadingId, setLoadingId] = useState<number | null>(null);

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
        }
      } catch {
        setError("Erro de rede. Tente novamente.");
      } finally {
        setLoadingId(null);
      }
    });
  }

  if (questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-500">
        <CheckCircle2 className="w-12 h-12 mb-4 text-[#0ab5bd]" />
        <p className="text-lg font-medium">Nenhuma questão pendente</p>
        <p className="text-sm mt-1">Todas as questões foram moderadas.</p>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              <th className="px-4 py-3 text-left text-gray-400 font-medium w-16">ID</th>
              <th className="px-4 py-3 text-left text-gray-400 font-medium">Matéria</th>
              <th className="px-4 py-3 text-left text-gray-400 font-medium">Banca</th>
              <th className="px-4 py-3 text-left text-gray-400 font-medium">Enunciado</th>
              <th className="px-4 py-3 text-left text-gray-400 font-medium">Fonte</th>
              <th className="px-4 py-3 text-left text-gray-400 font-medium">Criada em</th>
              <th className="px-4 py-3 text-center text-gray-400 font-medium w-32">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {questions.map((q) => {
              const isLoading = loadingId === q.id && pending;
              return (
                <tr
                  key={q.id}
                  className={cn(
                    "transition-colors",
                    isLoading ? "opacity-50" : "hover:bg-white/[0.03]"
                  )}
                >
                  <td className="px-4 py-3 text-gray-500 font-mono">#{q.id}</td>
                  <td className="px-4 py-3 text-gray-300">
                    {q.subjectId ? (subjectMap[q.subjectId] ?? q.subjectId) : (
                      <span className="text-gray-600 italic">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    {q.banca ? (
                      <span className="px-2 py-0.5 rounded text-xs bg-white/10 text-gray-300">
                        {q.banca}
                      </span>
                    ) : (
                      <span className="text-gray-600 italic">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-300 max-w-xs">
                    <span title={q.statement}>
                      {q.statement.slice(0, 80)}{q.statement.length > 80 ? "…" : ""}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {q.source ?? <span className="italic">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                    {new Date(q.createdAt).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleAction(q.id, true)}
                        disabled={isLoading}
                        title="Aprovar questão"
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                          "bg-[#0ab5bd]/10 text-[#0ab5bd] border border-[#0ab5bd]/30",
                          "hover:bg-[#0ab5bd]/20 hover:border-[#0ab5bd]/50",
                          "disabled:opacity-50 disabled:cursor-not-allowed"
                        )}
                      >
                        {isLoading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                        Aprovar
                      </button>
                      <button
                        onClick={() => handleAction(q.id, false)}
                        disabled={isLoading}
                        title="Rejeitar questão (manter como não aprovada)"
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                          "bg-red-500/10 text-red-400 border border-red-500/30",
                          "hover:bg-red-500/20 hover:border-red-500/50",
                          "disabled:opacity-50 disabled:cursor-not-allowed"
                        )}
                      >
                        {isLoading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                        Rejeitar
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-gray-600">
        Mostrando {questions.length} questão{questions.length !== 1 ? "ões" : ""} pendentes (limite: 100)
      </p>
    </div>
  );
}
