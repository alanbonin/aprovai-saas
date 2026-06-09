"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Clock, Play, ChevronRight, ChevronLeft, Trophy, RotateCcw,
  AlertTriangle, CheckCircle2, XCircle, Flag
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSessionState, useTimerSession } from "@/lib/use-session-state";

const SESSION_KEY = "simulado:exame";

interface Question {
  id: number;
  subjectId: string;
  banca: string | null;
  year: number | null;
  level: string;
  statement: string;
  optionA: string; optionB: string;
  optionC: string | null; optionD: string | null; optionE: string | null;
  answer: string;
  explanation: string | null;
}

const OPTS = ["A", "B", "C", "D", "E"] as const;

// Preset durations (minutes) and question counts
const PRESETS = [
  { label: "Curto",     total: 20,  minutes: 30,  icon: "⚡" },
  { label: "Médio",     total: 30,  minutes: 55,  icon: "🎯" },
  { label: "Padrão",    total: 50,  minutes: 100, icon: "📝" },
  { label: "Intensivo", total: 100, minutes: 240, icon: "🔥" },
];

type Phase = "config" | "running" | "result" | "review";

function formatTime(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function SimuladoExameInner() {
  const timer = useTimerSession(SESSION_KEY);

  // Estado persistido em sessionStorage
  const [preset, setPreset]       = useSessionState<number>(`${SESSION_KEY}:preset`, 1);
  const [phase, setPhase]         = useSessionState<Phase>(`${SESSION_KEY}:phase`, "config");
  const [questions, setQuestions] = useSessionState<Question[]>(`${SESSION_KEY}:questions`, []);
  const [current, setCurrent]     = useSessionState<number>(`${SESSION_KEY}:current`, 0);
  const [answers, setAnswers]     = useSessionState<Record<number, string>>(`${SESSION_KEY}:answers`, {});
  const [flaggedArr, setFlaggedArr] = useSessionState<number[]>(`${SESSION_KEY}:flagged`, []);
  const flagged = new Set(flaggedArr);
  const setFlagged = (fn: Set<number> | ((p: Set<number>) => Set<number>)) => {
    const next = typeof fn === "function" ? fn(flagged) : fn;
    setFlaggedArr(Array.from(next));
  };
  const [finished, setFinished]   = useSessionState<boolean>(`${SESSION_KEY}:finished`, false);

  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [timeLeft, setTimeLeft]   = useState(() => phase === "running" ? timer.getTimeLeft() : 0);
  const timerRef                  = useRef<NodeJS.Timeout | null>(null);

  // Refs para capturar estado atual sem recriar o finish callback
  const questionsRef = useRef<Question[]>([]);
  const answersRef   = useRef<Record<number, string>>({});
  const presetRef    = useRef(1);
  const timeLeftRef  = useRef(0);
  useEffect(() => { questionsRef.current = questions; }, [questions]);
  useEffect(() => { answersRef.current   = answers;   }, [answers]);
  useEffect(() => { presetRef.current    = preset;    }, [preset]);
  useEffect(() => { timeLeftRef.current  = timeLeft;  }, [timeLeft]);

  const finish = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timer.clearTimer();
    setFinished(true);
    setPhase("result");

    // Salva no histórico (fire-and-forget)
    const qs  = questionsRef.current;
    const ans = answersRef.current;
    const cfg = PRESETS[presetRef.current];
    const timeTaken = cfg.minutes * 60 - timeLeftRef.current;
    // Envia `resposta` (alternativa escolhida) — gabarito verificado server-side
    const fullAns = qs.map((q, i) => ({ questionId: q.id, resposta: ans[i] ?? "" }));

    void fetch("/api/simulado/salvar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        total: qs.length,
        timeSecs: timeTaken,
        answers: fullAns,
      }),
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (phase !== "running") return;
    // Ao montar (ou ao voltar para a página), sincroniza o tempo real restante
    const realLeft = timer.getTimeLeft();
    if (realLeft <= 0) { finish(); return; }
    setTimeLeft(realLeft);

    timerRef.current = setInterval(() => {
      const left = timer.getTimeLeft();
      setTimeLeft(left);
      if (left <= 0) { finish(); }
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, finish]);

  async function startExam() {
    setLoading(true);
    setError("");
    const cfg = PRESETS[preset];
    const res = await fetch("/api/simulado/gerar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ total: cfg.total }),
    });
    if (res.ok) {
      const d = await res.json();
      const qs = d.questions ?? [];
      if (qs.length === 0) {
        setError("Nenhuma questão disponível. Configure suas matérias em Perfil primeiro.");
        setLoading(false);
        return;
      }
      const totalSecs = cfg.minutes * 60;
      setQuestions(qs);
      setAnswers({});
      setFlagged(new Set());
      setCurrent(0);
      setFinished(false);
      timer.startTimer(totalSecs);
      setTimeLeft(totalSecs);
      setPhase("running");
    } else {
      const d = await res.json();
      setError(d.error ?? "Erro ao gerar simulado");
    }
    setLoading(false);
  }

  function selectAnswer(opt: string) {
    setAnswers(prev => ({ ...prev, [current]: opt }));
  }

  function toggleFlag(idx: number) {
    setFlagged(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  const cfg    = PRESETS[preset];
  const q      = questions[current];
  const sel    = answers[current];
  const pctAnswered = questions.length > 0
    ? Math.round((Object.keys(answers).length / questions.length) * 100) : 0;
  const timeWarning = timeLeft < 300; // < 5 min

  // Result calculations
  const correctCount = questions.filter((qq, i) => answers[i] === qq.answer).length;
  const accuracy = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;
  const timeTaken = cfg.minutes * 60 - timeLeft;

  // ─── CONFIG ───────────────────────────────────────────────────────────────
  if (phase === "config") {
    return (
      <div className="min-h-screen text-white p-6 max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Clock className="w-6 h-6 text-red-400" />
            Modo Exame Oficial
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Simulação com tempo real — sem voltar, sem consultar gabarito durante a prova
          </p>
        </div>

        {error && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 mb-4 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Warning */}
        <div className="rounded-xl bg-amber-500/[0.06] border border-amber-500/20 p-4 mb-5 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-300">Atenção!</p>
            <p className="text-xs text-amber-500/80 mt-0.5">
              Neste modo você não pode ver o gabarito durante a prova. O tempo é contado regressivamente.
              Ao terminar o tempo, a prova é encerrada automaticamente.
            </p>
          </div>
        </div>

        {/* Preset selector */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {PRESETS.map((p, i) => (
            <button
              key={p.label}
              onClick={() => setPreset(i)}
              className={cn(
                "rounded-2xl p-5 border text-left transition-all",
                preset === i
                  ? "bg-red-600/15 border-red-500/40"
                  : "bg-white/[0.02] border-white/[0.06] hover:border-white/20"
              )}
            >
              <div className="text-2xl mb-2">{p.icon}</div>
              <p className={cn("text-sm font-bold", preset === i ? "text-red-300" : "text-white")}>{p.label}</p>
              <p className="text-xs text-gray-500 mt-1">{p.total} questões · {p.minutes} minutos</p>
              <p className="text-[10px] text-gray-600 mt-0.5">
                ~{Math.round(p.minutes / p.total * 60)}s por questão
              </p>
            </button>
          ))}
        </div>

        <button
          onClick={startExam}
          disabled={loading}
          className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:opacity-60 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Play className="w-4 h-4" />
          )}
          {loading ? "Preparando exame..." : `Iniciar exame: ${cfg.total}q · ${cfg.minutes}min`}
        </button>
      </div>
    );
  }

  // ─── RESULT ───────────────────────────────────────────────────────────────
  if (phase === "result") {
    const unanswered = questions.length - Object.keys(answers).length;
    return (
      <div className="min-h-screen text-white p-6 max-w-2xl mx-auto">
        <div className="text-center py-8">
          <div className="text-5xl mb-4">
            {accuracy >= 80 ? "🏆" : accuracy >= 60 ? "📈" : "💪"}
          </div>
          <h2 className="text-2xl font-black mb-1">{correctCount}/{questions.length} corretas</h2>
          <p className={cn(
            "text-5xl font-black mb-2",
            accuracy >= 80 ? "text-emerald-400" : accuracy >= 60 ? "text-yellow-400" : "text-rose-400"
          )}>
            {accuracy}%
          </p>
          {finished && timeLeft === 0 && (
            <p className="text-xs text-amber-400 mb-2">⏰ Tempo esgotado</p>
          )}
          <p className="text-gray-500 text-sm mb-6">
            Tempo utilizado: {formatTime(timeTaken)}
            {unanswered > 0 && ` · ${unanswered} sem resposta`}
          </p>

          {/* Per-question review */}
          <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5 mb-6 text-left">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-3">Gabarito</p>
            <div className="grid grid-cols-5 gap-1.5">
              {questions.map((qq, i) => {
                const gave = answers[i];
                const ok   = gave === qq.answer;
                return (
                  <div
                    key={qq.id}
                    className={cn(
                      "rounded-lg p-2 text-center text-xs font-bold border",
                      !gave ? "bg-white/[0.03] border-white/[0.06] text-gray-600" :
                      ok    ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400" :
                              "bg-red-500/15 border-red-500/30 text-red-400"
                    )}
                  >
                    <div className="text-[9px] text-gray-600 mb-0.5">{i + 1}</div>
                    {gave ?? "—"}
                    {gave && gave !== qq.answer && (
                      <div className="text-emerald-400/70 text-[8px]">{qq.answer}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-2 w-full max-w-xs mx-auto">
            <button
              onClick={() => setPhase("review")}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-sm font-semibold transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              Estudar questões desta prova
            </button>
            <button
              onClick={() => {
                // Refaz com as mesmas questões — só reseta respostas e timer
                setAnswers({});
                setFlaggedArr([]);
                setCurrent(0);
                setFinished(false);
                const cfg = PRESETS[preset];
                const tl = timer.startTimer(cfg.minutes * 60);
                setTimeLeft(tl);
                setPhase("running");
              }}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 rounded-xl text-sm font-semibold transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Refazer a mesma prova
            </button>
            <button
              onClick={() => { timer.clearTimer(); setQuestions([]); setAnswers({}); setFlaggedArr([]); setCurrent(0); setFinished(false); setPhase("config"); }}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-white/10 text-gray-400 hover:text-white text-sm font-medium transition-colors"
            >
              <Clock className="w-4 h-4" />
              Novo exame
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── REVIEW ───────────────────────────────────────────────────────────────
  if (phase === "review") {
    return (
      <div className="min-h-screen text-white p-4 max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-indigo-400" /> Gabarito Comentado
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {correctCount}/{questions.length} corretas · {accuracy}%
            </p>
          </div>
          <button
            onClick={() => setPhase("result")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-gray-400 hover:text-white text-xs transition-colors"
          >
            ← Voltar
          </button>
        </div>

        {/* Mini mapa de navegação */}
        <div className="flex flex-wrap gap-1 mb-5">
          {questions.map((qq, i) => {
            const gave = answers[i];
            const ok = gave === qq.answer;
            return (
              <button
                key={i}
                onClick={() => document.getElementById(`review-q-${i}`)?.scrollIntoView({ behavior: "smooth" })}
                className={cn(
                  "w-7 h-7 rounded-lg text-[10px] font-bold border flex items-center justify-center",
                  !gave ? "bg-white/5 border-white/10 text-gray-600" :
                  ok    ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400" :
                          "bg-red-500/20 border-red-500/40 text-red-400"
                )}
              >
                {i + 1}
              </button>
            );
          })}
        </div>

        <div className="space-y-4">
          {questions.map((qq, i) => {
            const gave = answers[i];
            const ok = gave === qq.answer;
            const opts = OPTS.map(l => ({ l, v: qq[`option${l}` as keyof Question] as string | null })).filter(o => o.v);
            return (
              <div
                id={`review-q-${i}`}
                key={qq.id}
                className={cn(
                  "rounded-2xl border p-5",
                  !gave ? "border-white/10 bg-white/[0.02]" :
                  ok    ? "border-emerald-500/20 bg-emerald-500/[0.04]" :
                          "border-red-500/20 bg-red-500/[0.04]"
                )}
              >
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <span className={cn(
                    "text-xs font-bold flex items-center gap-1",
                    !gave ? "text-gray-500" : ok ? "text-emerald-400" : "text-red-400"
                  )}>
                    {!gave ? "— Sem resposta" : ok ? <><CheckCircle2 className="w-3.5 h-3.5" /> Correta</> : <><XCircle className="w-3.5 h-3.5" /> Errada</>}
                  </span>
                  <span className="text-[10px] text-gray-600 font-semibold">Q{i + 1}</span>
                </div>

                <p className="text-sm text-gray-200 leading-relaxed mb-3">{qq.statement}</p>

                <div className="space-y-1.5 mb-3">
                  {opts.map(({ l, v }) => {
                    const isCorrect = l === qq.answer;
                    const isSelected = gave === l;
                    let cls = "border-white/5 text-gray-600";
                    if (isCorrect) cls = "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
                    else if (isSelected) cls = "border-red-500/40 bg-red-500/10 text-red-300";
                    return (
                      <div key={l} className={cn("flex items-start gap-2 p-2.5 rounded-lg border text-xs", cls)}>
                        <span className="w-5 h-5 rounded flex items-center justify-center font-bold flex-shrink-0 bg-white/10 text-[10px]">{l}</span>
                        <span>{v}</span>
                        {isCorrect && <CheckCircle2 className="w-3.5 h-3.5 ml-auto flex-shrink-0 text-emerald-400" />}
                        {isSelected && !isCorrect && <XCircle className="w-3.5 h-3.5 ml-auto flex-shrink-0 text-red-400" />}
                      </div>
                    );
                  })}
                </div>

                {qq.explanation && (
                  <div className="rounded-lg bg-white/5 border border-white/10 p-3">
                    <p className="text-[10px] font-semibold text-gray-500 mb-1">Explicação</p>
                    <p className="text-xs text-gray-300 leading-relaxed">{qq.explanation}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex gap-3 justify-center pb-8">
          <button
            onClick={() => setPhase("result")}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/10 text-gray-400 hover:text-white text-sm transition-colors"
          >
            ← Voltar ao resultado
          </button>
        </div>
      </div>
    );
  }

  // ─── RUNNING ──────────────────────────────────────────────────────────────
  if (!q) return null;
  const opts = OPTS.map(l => ({ l, v: q[`option${l}` as keyof Question] as string | null })).filter(o => o.v);

  return (
    <div className="min-h-screen text-white p-4 max-w-2xl mx-auto">
      {/* Header bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-gray-300">
            {current + 1}<span className="text-gray-600">/{questions.length}</span>
          </span>
          <div className="flex flex-wrap gap-1 max-w-xs">
            {questions.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={cn(
                  "w-2.5 h-2.5 rounded-sm transition-all flex-shrink-0",
                  i === current ? "bg-red-500 scale-110" :
                  answers[i] ? "bg-indigo-600/60" :
                  flagged.has(i) ? "bg-amber-500/60" :
                  "bg-white/10 hover:bg-white/20"
                )}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Timer */}
          <div className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-mono text-sm font-bold",
            timeWarning
              ? "bg-red-500/15 border-red-500/30 text-red-400 animate-pulse"
              : "bg-white/[0.05] border-white/[0.08] text-white"
          )}>
            <Clock className="w-3.5 h-3.5" />
            {formatTime(timeLeft)}
          </div>

          {/* Entregar prova antecipado */}
          <button
            onClick={() => {
              const respondidas = Object.keys(answers).length;
              const faltando = questions.length - respondidas;
              const msg = faltando > 0
                ? `Você respondeu ${respondidas} de ${questions.length} questões. As ${faltando} restantes ficarão em branco.\n\nDeseja entregar a prova assim mesmo?`
                : `Você respondeu todas as ${questions.length} questões. Deseja entregar a prova?`;
              if (confirm(msg)) finish();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-500/40 bg-red-500/10 text-red-400 text-xs font-semibold hover:bg-red-500/20 transition-colors"
          >
            <Trophy className="w-3.5 h-3.5" />
            Entregar
          </button>
        </div>
      </div>

      {/* Progress */}
      <div className="mb-4">
        <div className="h-1 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full bg-red-600 rounded-full transition-all"
            style={{ width: `${((current + 1) / questions.length) * 100}%` }} />
        </div>
        <div className="flex justify-between text-[10px] text-gray-600 mt-1">
          <span>{Object.keys(answers).length} respondidas · {flagged.size > 0 && <span className="text-amber-500/80">{flagged.size} com dúvida</span>}</span>
          <span>{pctAnswered}% concluído</span>
        </div>
        {/* Legenda das cores dos pontos */}
        <div className="flex items-center gap-3 mt-1.5">
          <span className="flex items-center gap-1 text-[9px] text-gray-600">
            <span className="w-2.5 h-2.5 rounded-sm bg-indigo-600/60 inline-block" />
            Respondida
          </span>
          <span className="flex items-center gap-1 text-[9px] text-gray-600">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-500/60 inline-block" />
            Com dúvida
          </span>
          <span className="flex items-center gap-1 text-[9px] text-gray-600">
            <span className="w-2.5 h-2.5 rounded-sm bg-white/10 inline-block" />
            Não respondida
          </span>
        </div>
      </div>

      {/* Statement */}
      <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-5 mb-4">
        {false && (
          <p className="text-[10px] text-gray-600 mb-2 font-medium">
            {q.banca}{q.year ? ` · ${q.year}` : ""}
          </p>
        )}
        <p className="text-sm text-gray-200 leading-relaxed">{q.statement}</p>
      </div>

      {/* Options — no feedback during exam */}
      <div className="space-y-2 mb-4">
        {opts.map(o => (
          <button
            key={o.l}
            onClick={() => selectAnswer(o.l)}
            className={cn(
              "w-full flex items-start gap-3 px-4 py-3 rounded-xl border text-left text-sm transition-all",
              sel === o.l
                ? "bg-indigo-600/20 border-indigo-500/40 text-indigo-200"
                : "bg-white/[0.02] border-white/[0.06] text-gray-300 hover:border-white/20 hover:bg-white/[0.04]"
            )}
          >
            <span className={cn(
              "font-bold text-xs w-5 flex-shrink-0 mt-0.5",
              sel === o.l ? "text-indigo-400" : "text-gray-500"
            )}>{o.l})</span>
            <span className="flex-1">{o.v}</span>
            {sel === o.l && <CheckCircle2 className="w-4 h-4 text-indigo-400 flex-shrink-0" />}
          </button>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setCurrent(c => Math.max(0, c - 1))}
          disabled={current === 0}
          className="p-2.5 rounded-xl border border-white/[0.08] text-gray-500 hover:text-white hover:border-white/20 disabled:opacity-30 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <button
          onClick={() => toggleFlag(current)}
          title={flagged.has(current) ? "Remover marcação de dúvida" : "Marcar esta questão para revisar depois"}
          className={cn(
            "flex-1 py-2.5 rounded-xl border text-xs font-semibold transition-all flex items-center justify-center gap-1.5",
            flagged.has(current)
              ? "bg-amber-500/15 border-amber-500/30 text-amber-300"
              : "bg-white/[0.02] border-white/[0.06] text-gray-500 hover:text-amber-400 hover:border-amber-500/30"
          )}
        >
          <Flag className="w-3.5 h-3.5" />
          {flagged.has(current) ? "⚑ Com dúvida" : "Tenho dúvida"}
        </button>

        {current < questions.length - 1 ? (
          <button
            onClick={() => setCurrent(c => c + 1)}
            className="p-2.5 rounded-xl border border-white/[0.08] text-gray-500 hover:text-white hover:border-white/20 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={finish}
            className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
          >
            <Trophy className="w-4 h-4" />
            Finalizar prova
          </button>
        )}
      </div>
    </div>
  );
}
