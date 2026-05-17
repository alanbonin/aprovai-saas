"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { Zap, CheckCircle2, XCircle, Clock, RotateCcw, Star, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

interface Question {
  id: number;
  statement: string;
  optionA: string; optionB: string;
  optionC: string | null; optionD: string | null; optionE: string | null;
  answer: string;
  explanation: string | null;
  banca: string | null;
  level: string;
}

const OPTS = ["A", "B", "C", "D", "E"] as const;
const QUIZ_SIZE = 5;
const SECS_PER_Q = 30;

// XP scoring: correct + speed bonus
function calcXp(correct: boolean, timeUsed: number) {
  if (!correct) return 0;
  const speedBonus = Math.max(0, Math.floor((SECS_PER_Q - timeUsed) / 5)); // 0-6 bonus
  return 10 + speedBonus;
}

type Phase = "idle" | "running" | "result";

export default function QuizPage() {
  const [phase, setPhase]       = useState<Phase>("idle");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent]   = useState(0);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  // Per-question state
  const [selected, setSelected] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(SECS_PER_Q);
  const [timeUsed, setTimeUsed] = useState(0);

  // Accumulated results
  const [results, setResults]   = useState<{ correct: boolean; xp: number; time: number }[]>([]);
  const timerRef                = useRef<NodeJS.Timeout | null>(null);

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  function startTimer() {
    stopTimer();
    setTimeLeft(SECS_PER_Q);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          stopTimer();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }

  // Auto-submit when timer hits 0
  useEffect(() => {
    if (timeLeft === 0 && phase === "running" && selected === null) {
      handleAnswer(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, phase, selected]);

  useEffect(() => () => stopTimer(), [stopTimer]);

  async function startQuiz() {
    setLoading(true);
    setError("");
    const res = await fetch("/api/simulado/gerar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ total: QUIZ_SIZE }),
    });
    if (res.ok) {
      const d = await res.json();
      const qs = d.questions ?? [];
      if (qs.length === 0) {
        setError("Nenhuma questão disponível. Configure suas matérias em Perfil.");
        setLoading(false);
        return;
      }
      setQuestions(qs.slice(0, QUIZ_SIZE));
      setResults([]);
      setCurrent(0);
      setSelected(null);
      setTimeUsed(0);
      setPhase("running");
      startTimer();
    } else {
      const d = await res.json();
      setError(d.error ?? "Erro ao iniciar quiz");
    }
    setLoading(false);
  }

  function handleAnswer(opt: string | null) {
    stopTimer();
    const used = SECS_PER_Q - timeLeft;
    setTimeUsed(used);
    const q = questions[current];
    const isCorrect = opt !== null && opt === q.answer;
    const xp = calcXp(isCorrect, used);
    setSelected(opt ?? "");
    setResults(prev => [...prev, { correct: isCorrect, xp, time: used }]);
  }

  function nextQuestion() {
    if (current + 1 >= questions.length) {
      setPhase("result");
      return;
    }
    setCurrent(c => c + 1);
    setSelected(null);
    setTimeUsed(0);
    startTimer();
  }

  const q          = questions[current];
  const totalXp    = results.reduce((s, r) => s + r.xp, 0);
  const totalCorrect = results.filter(r => r.correct).length;
  const accuracy   = results.length > 0 ? Math.round((totalCorrect / results.length) * 100) : 0;

  // ─── IDLE ─────────────────────────────────────────────────────────────────
  if (phase === "idle") {
    return (
      <div className="min-h-screen text-white p-6 max-w-xl mx-auto flex flex-col items-center justify-center">
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-2xl bg-amber-500/15 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
            <Zap className="w-10 h-10 text-amber-400" />
          </div>
          <h1 className="text-2xl font-bold mb-1">Quiz Rápido</h1>
          <p className="text-gray-500 text-sm">
            {QUIZ_SIZE} questões · {SECS_PER_Q}s cada · XP bônus por velocidade
          </p>
        </div>

        {error && (
          <div className="w-full rounded-xl bg-red-500/10 border border-red-500/20 p-3 mb-4 text-sm text-red-400 text-center">
            {error}
          </div>
        )}

        {/* Rules */}
        <div className="w-full rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5 mb-6 space-y-3">
          {[
            { icon: "⚡", label: `${QUIZ_SIZE} questões aleatórias das suas matérias` },
            { icon: "⏱️", label: `${SECS_PER_Q} segundos por questão` },
            { icon: "⭐", label: "10 XP base + bônus de velocidade por acerto" },
            { icon: "📊", label: "Gabarito comentado ao final" },
          ].map((r, i) => (
            <div key={i} className="flex items-center gap-3 text-sm text-gray-400">
              <span className="text-base">{r.icon}</span>
              {r.label}
            </div>
          ))}
        </div>

        <button
          onClick={startQuiz}
          disabled={loading}
          className="w-full py-3.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Zap className="w-4 h-4" />
          )}
          {loading ? "Preparando..." : "Iniciar quiz!"}
        </button>
      </div>
    );
  }

  // ─── RESULT ───────────────────────────────────────────────────────────────
  if (phase === "result") {
    return (
      <div className="min-h-screen text-white p-6 max-w-xl mx-auto">
        <div className="text-center py-8">
          <div className="text-5xl mb-3">
            {accuracy >= 80 ? "🏆" : accuracy >= 60 ? "⚡" : "💪"}
          </div>
          <h2 className="text-xl font-black mb-1">{totalCorrect}/{questions.length} corretas</h2>
          <p className={cn(
            "text-4xl font-black mb-2",
            accuracy >= 80 ? "text-emerald-400" : accuracy >= 60 ? "text-yellow-400" : "text-rose-400"
          )}>
            {accuracy}%
          </p>
          <div className="flex items-center justify-center gap-1.5 mb-6">
            <Star className="w-4 h-4 text-amber-400" />
            <span className="text-amber-400 font-bold text-lg">+{totalXp} XP</span>
          </div>

          {/* Per-question summary */}
          <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4 mb-6 space-y-2 text-left">
            {questions.map((q2, i) => {
              const r = results[i];
              return (
                <div key={q2.id} className={cn(
                  "flex items-start gap-3 p-3 rounded-xl border",
                  r?.correct ? "bg-emerald-500/[0.05] border-emerald-500/15" : "bg-red-500/[0.05] border-red-500/15"
                )}>
                  {r?.correct
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    : <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-400 line-clamp-2">{q2.statement.slice(0, 100)}...</p>
                    {q2.explanation && (
                      <p className="text-[10px] text-gray-600 mt-1 line-clamp-1">💡 {q2.explanation.slice(0, 80)}</p>
                    )}
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="text-xs font-bold text-amber-400">+{r?.xp ?? 0} XP</p>
                    <p className="text-[10px] text-gray-600">{r?.time ?? 0}s</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex gap-3 justify-center">
            <button
              onClick={startQuiz}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 rounded-xl text-sm font-semibold transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Novo quiz
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── RUNNING ──────────────────────────────────────────────────────────────
  if (!q) return null;
  const opts     = OPTS.map(l => ({ l, v: q[`option${l}` as keyof Question] as string | null })).filter(o => o.v);
  const answered = selected !== null;
  const pct      = (timeLeft / SECS_PER_Q) * 100;
  const timerColor = pct > 50 ? "bg-emerald-500" : pct > 25 ? "bg-yellow-500" : "bg-red-500";

  return (
    <div className="min-h-screen text-white p-4 max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {Array.from({ length: QUIZ_SIZE }).map((_, i) => (
            <div key={i} className={cn(
              "w-2 h-2 rounded-full",
              i < results.length
                ? results[i].correct ? "bg-emerald-400" : "bg-red-400"
                : i === current
                ? "bg-amber-400"
                : "bg-white/20"
            )} />
          ))}
        </div>
        <div className="flex items-center gap-1.5 font-mono text-sm font-bold">
          <Clock className={cn(
            "w-4 h-4",
            pct <= 25 ? "text-red-400" : pct <= 50 ? "text-yellow-400" : "text-emerald-400"
          )} />
          <span className={pct <= 25 ? "text-red-400" : "text-white"}>{timeLeft}s</span>
        </div>
      </div>

      {/* Timer bar */}
      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mb-5">
        <div
          className={cn("h-full rounded-full transition-all duration-1000", timerColor)}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Questão */}
      <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-5 mb-4">
        <div className="flex items-center gap-2 mb-2">
          {q.banca && <span className="text-[10px] text-gray-600">{q.banca}</span>}
          <span className="text-[10px] font-mono text-amber-500">Q{current + 1}/{QUIZ_SIZE}</span>
        </div>
        <p className="text-sm text-gray-200 leading-relaxed">{q.statement}</p>
      </div>

      {/* Options */}
      <div className="space-y-2 mb-4">
        {opts.map(o => {
          const isCorrect  = o.l === q.answer;
          const isSelected = selected === o.l;
          const isTimeout  = answered && selected === "" && isCorrect;
          return (
            <button
              key={o.l}
              onClick={() => !answered && handleAnswer(o.l)}
              disabled={answered}
              className={cn(
                "w-full flex items-start gap-3 px-4 py-3 rounded-xl border text-left text-sm transition-all",
                !answered && "hover:border-white/20 hover:bg-white/[0.04]",
                answered && isCorrect && "bg-emerald-500/10 border-emerald-500/30",
                answered && isSelected && !isCorrect && "bg-red-500/10 border-red-500/30",
                answered && isTimeout && "bg-emerald-500/10 border-emerald-500/30",
                (!answered || (!isCorrect && !isSelected && !isTimeout)) && "bg-white/[0.02] border-white/[0.06]"
              )}
            >
              <span className={cn(
                "font-bold text-xs w-5 flex-shrink-0 mt-0.5",
                answered && isCorrect ? "text-emerald-400" :
                answered && isSelected && !isCorrect ? "text-red-400" :
                "text-gray-500"
              )}>{o.l})</span>
              <span className={cn(
                "flex-1",
                answered && isCorrect ? "text-emerald-300" :
                answered && isSelected && !isCorrect ? "text-red-300" :
                "text-gray-300"
              )}>{o.v}</span>
              {answered && isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
              {answered && isSelected && !isCorrect && <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />}
            </button>
          );
        })}
      </div>

      {/* Answer feedback */}
      {answered && (
        <div className="space-y-2">
          {/* XP earned */}
          <div className={cn(
            "flex items-center justify-between px-4 py-2.5 rounded-xl border text-sm",
            results[current]?.correct
              ? "bg-emerald-500/10 border-emerald-500/20"
              : "bg-red-500/10 border-red-500/20"
          )}>
            <span className={results[current]?.correct ? "text-emerald-400" : "text-red-400"}>
              {results[current]?.correct
                ? `✓ Correto em ${timeUsed}s!`
                : selected === "" ? "⏰ Tempo esgotado!" : "✗ Incorreto"}
            </span>
            {results[current]?.xp > 0 && (
              <span className="text-amber-400 font-bold">+{results[current].xp} XP</span>
            )}
          </div>

          {/* Explanation */}
          {q.explanation && (
            <div className="rounded-xl bg-indigo-500/[0.06] border border-indigo-500/15 p-3">
              <p className="text-[10px] text-indigo-400 font-semibold mb-1">Justificativa</p>
              <p className="text-xs text-gray-400 leading-relaxed">{q.explanation}</p>
            </div>
          )}

          <button
            onClick={nextQuestion}
            className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
          >
            {current + 1 < questions.length ? (
              <><Zap className="w-4 h-4" /> Próxima</>
            ) : (
              <><Trophy className="w-4 h-4" /> Ver resultado</>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
