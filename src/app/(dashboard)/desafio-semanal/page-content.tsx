"use client";
import { useState, useEffect, useCallback } from "react";
import { Swords, ChevronRight, CheckCircle2, XCircle, Trophy, RefreshCw, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuestionData {
  id: number;
  statement: string;
  optionA: string; optionB: string;
  optionC: string | null; optionD: string | null; optionE: string | null;
  answer: string;
  explanation: string | null;
  banca: string | null; year: number | null; level: string;
  userAnswer: string | null;
  revealed: boolean;
}

interface ChallengeData {
  weekKey: string;
  questions: QuestionData[];
  answeredCount: number;
  total: number;
  completed: boolean;
  score: number;
  nextUnanswered: number | null;
  startedAt: string;
  completedAt: string | null;
}

const OPTS = ["A", "B", "C", "D", "E"] as const;

function weekLabel(key: string) {
  const d = new Date(key + "T12:00:00");
  const end = new Date(d.getTime() + 6 * 86400000);
  return `${d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} – ${end.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}`;
}

export function DesafioSemanalInner() {
  const [data, setData]         = useState<ChallengeData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [current, setCurrent]   = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [localAnswer, setLocalAnswer] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/workspace/desafio-semanal");
    if (res.ok) {
      const d: ChallengeData = await res.json();
      setData(d);
      // Navigate to first unanswered
      if (d.nextUnanswered !== null) setCurrent(d.nextUnanswered);
      else setCurrent(0);
    }
    setLoading(false);
    setLocalAnswer(null);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function submitAnswer(opt: string) {
    if (!data || submitting) return;
    const q = data.questions[current];
    if (!q || q.userAnswer !== null) return;
    setSubmitting(true);
    setLocalAnswer(opt);

    const res = await fetch("/api/workspace/desafio-semanal", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId: q.id, answer: opt }),
    });
    if (res.ok) {
      const upd = await res.json();
      setData(prev => {
        if (!prev) return prev;
        const qs = prev.questions.map(qq =>
          qq.id === q.id ? { ...qq, userAnswer: opt, revealed: true } : qq
        );
        return { ...prev, questions: qs, answeredCount: upd.answeredCount, completed: upd.completed, score: upd.score };
      });
      // Se errou, salva no caderno de erros via SM-2
      if (opt !== q.answer) {
        fetch("/api/questoes/progresso", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ questionId: q.id, correct: false, quality: 0 }),
        }).catch(() => {});
      }
    }
    setSubmitting(false);
  }

  function next() {
    if (!data) return;
    const next = data.questions.findIndex((q, i) => i > current && q.userAnswer === null);
    if (next !== -1) { setCurrent(next); setLocalAnswer(null); }
    else { setCurrent(c => Math.min(c + 1, data.questions.length - 1)); setLocalAnswer(null); }
  }

  if (loading) {
    return (
      <div className="min-h-screen text-white p-6 max-w-2xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-white/5 rounded-xl w-56" />
          <div className="h-10 bg-white/5 rounded-xl" />
          <div className="h-40 bg-white/5 rounded-2xl" />
        </div>
      </div>
    );
  }

  const d = data!;
  const q = d.questions[current];
  const opts = q ? OPTS.map(l => ({ l, v: q[`option${l}` as keyof QuestionData] as string | null })).filter(o => o.v) : [];
  const answered = q?.userAnswer !== null || localAnswer !== null;
  const sel = localAnswer ?? q?.userAnswer;

  // Result view
  if (d.completed && !answered) {
    const correct = d.questions.filter(q => q.userAnswer === q.answer).length;
    return (
      <div className="min-h-screen text-white p-6 max-w-2xl mx-auto">
        <div className="text-center py-10">
          <div className="text-5xl mb-4">
            {d.score >= 80 ? "🏆" : d.score >= 60 ? "⚔️" : "💪"}
          </div>
          <h2 className="text-2xl font-black mb-1">{correct}/{d.total} corretas</h2>
          <p className={cn(
            "text-5xl font-black mb-4",
            d.score >= 80 ? "text-emerald-400" : d.score >= 60 ? "text-yellow-400" : "text-rose-400"
          )}>
            {d.score}%
          </p>
          <p className="text-sm text-gray-400 mb-2">Semana {weekLabel(d.weekKey)}</p>
          <p className="text-gray-500 text-xs mb-8">
            {d.score >= 80 ? "Excelente! Você domina questões difíceis! 🎉" :
             d.score >= 60 ? "Bom resultado! Continue praticando questões difíceis." :
             "Questões difíceis são um desafio — estude mais esta semana!"}
          </p>

          <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4 text-left mb-6">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-3">Seu gabarito</p>
            <div className="space-y-2">
              {d.questions.map((qq, i) => {
                const ok = qq.userAnswer === qq.answer;
                return (
                  <div key={qq.id} className="flex items-center gap-3 text-xs">
                    <span className="w-5 text-gray-600 font-mono">{i + 1}.</span>
                    {ok
                      ? <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      : <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />}
                    <span className="flex-1 text-gray-400 truncate">{qq.statement.slice(0, 60)}...</span>
                    <span className={ok ? "text-emerald-400" : "text-red-400"}>{qq.userAnswer ?? "—"}</span>
                    {!ok && <span className="text-emerald-400">({qq.answer})</span>}
                  </div>
                );
              })}
            </div>
          </div>

          <button
            onClick={() => setCurrent(0)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/10 text-gray-400 hover:text-white text-sm font-medium transition-colors mx-auto"
          >
            <RefreshCw className="w-4 h-4" /> Revisar questões
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Swords className="w-6 h-6 text-purple-400" />
          Desafio Semanal
        </h1>
        <p className="text-gray-500 text-sm mt-0.5">
          10 questões difíceis fixas para a semana · {weekLabel(d.weekKey)}
        </p>
      </div>

      {/* Progress bar */}
      <div className="mb-5">
        <div className="flex justify-between text-xs text-gray-500 mb-1.5">
          <span>{d.answeredCount}/{d.total} respondidas</span>
          {d.completed && <span className="text-purple-400 font-semibold">Completo! {d.score}%</span>}
        </div>
        <div className="flex gap-1">
          {d.questions.map((qq, i) => (
            <button
              key={qq.id}
              onClick={() => { setCurrent(i); setLocalAnswer(null); }}
              className={cn(
                "flex-1 h-2 rounded-full transition-all",
                i === current ? "ring-2 ring-purple-400 ring-offset-1 ring-offset-[#0a0d14]" : "",
                qq.userAnswer === null ? "bg-white/10" :
                qq.userAnswer === qq.answer ? "bg-emerald-500" : "bg-red-500"
              )}
            />
          ))}
        </div>
      </div>

      {/* Question nav chips */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {d.questions.map((qq, i) => (
          <button
            key={qq.id}
            onClick={() => { setCurrent(i); setLocalAnswer(null); }}
            className={cn(
              "w-8 h-8 rounded-lg text-xs font-bold border transition-all",
              i === current ? "bg-purple-600 border-purple-500 text-white" :
              qq.userAnswer === null ? "bg-white/[0.03] border-white/[0.08] text-gray-500 hover:border-white/20" :
              qq.userAnswer === qq.answer ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400" :
              "bg-red-500/15 border-red-500/30 text-red-400"
            )}
          >
            {i + 1}
          </button>
        ))}
      </div>

      {q && (
        <>
          {/* Question card */}
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-5 mb-4">
            <div className="flex flex-wrap gap-2 mb-2">
              <span className="text-[10px] px-1.5 py-0.5 rounded border bg-red-500/10 border-red-500/20 text-red-400">Difícil</span>
            </div>
            <p className="text-sm text-gray-200 leading-relaxed">{q.statement}</p>
          </div>

          {/* Options */}
          <div className="space-y-2 mb-4">
            {opts.map(o => {
              const isCorrect  = o.l === q.answer;
              const isSelected = sel === o.l;
              const showResult = answered;
              return (
                <button
                  key={o.l}
                  onClick={() => !answered && submitAnswer(o.l)}
                  disabled={answered || submitting}
                  className={cn(
                    "w-full flex items-start gap-3 px-4 py-3 rounded-xl border text-left text-sm transition-all",
                    !showResult && "hover:border-white/20 hover:bg-white/[0.04]",
                    showResult && isCorrect && "bg-emerald-500/10 border-emerald-500/30",
                    showResult && isSelected && !isCorrect && "bg-red-500/10 border-red-500/30",
                    (!showResult || (!isCorrect && !isSelected)) && "bg-white/[0.02] border-white/[0.06]"
                  )}
                >
                  <span className={cn(
                    "font-bold text-xs w-5 flex-shrink-0 mt-0.5",
                    showResult && isCorrect ? "text-emerald-400" :
                    showResult && isSelected && !isCorrect ? "text-red-400" :
                    "text-gray-500"
                  )}>{o.l})</span>
                  <span className={cn(
                    "flex-1",
                    showResult && isCorrect ? "text-emerald-300" :
                    showResult && isSelected && !isCorrect ? "text-red-300" :
                    "text-gray-300"
                  )}>{o.v}</span>
                  {showResult && isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
                  {showResult && isSelected && !isCorrect && <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* Explanation */}
          {answered && q.explanation && (
            <div className="rounded-xl bg-purple-500/[0.06] border border-purple-500/15 p-4 mb-4">
              <p className="text-xs font-semibold text-purple-400 mb-1.5">Justificativa</p>
              <p className="text-xs text-gray-400 leading-relaxed">{q.explanation}</p>
            </div>
          )}

          {/* Locked indicator */}
          {!answered && q.userAnswer === null && d.questions.slice(0, current).some(qq => qq.userAnswer === null) && (
            <div className="flex items-center gap-2 text-xs text-amber-500/70 mb-4">
              <Lock className="w-3.5 h-3.5" />
              Responda as questões anteriores antes de pular
            </div>
          )}

          {answered && (
            <button
              onClick={next}
              className="w-full py-3 bg-purple-600 hover:bg-purple-700 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
            >
              {current < d.questions.length - 1 ? (
                <><ChevronRight className="w-4 h-4" /> Próxima</>
              ) : d.completed ? (
                <><Trophy className="w-4 h-4" /> Ver resultado final</>
              ) : (
                <><ChevronRight className="w-4 h-4" /> Continuar</>
              )}
            </button>
          )}
        </>
      )}
    </div>
  );
}
