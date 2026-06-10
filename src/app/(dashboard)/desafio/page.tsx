"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Zap, Trophy, Clock, CheckCircle, XCircle,
  RotateCcw, Lock, Play, Target,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Question {
  id: number;
  statement: string;
  optionA: string | null;
  optionB: string | null;
  optionC: string | null;
  optionD: string | null;
  optionE: string | null;
  answer: string;
  explanation: string | null;
  level: string | null;
  banca: string | null;
  year: number | null;
}

interface CompletedRecord {
  date: string;
  score: number;
  total: number;
  timeSecs: number;
  xpEarned: number;
}

interface ChallengeData {
  questions: Question[];
  todayKey: string;
  completedToday: CompletedRecord | null;
  timeLimit: number;
  xpBonus: number;
}

const QUALITY_OPTS = [
  { id: "dificil", label: "Difícil", style: "border-amber-500/50 bg-amber-500/10 text-amber-400" },
  { id: "ok",      label: "Boa!",    style: "border-blue-500/50 bg-blue-500/10 text-blue-400" },
  { id: "facil",   label: "Fácil",   style: "border-green-500/50 bg-green-500/10 text-green-400" },
];

function formatTime(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function DesafioPage() {
  const [data, setData]           = useState<ChallengeData | null>(null);
  const [loading, setLoading]     = useState(true);
  const [started, setStarted]     = useState(false);
  const [current, setCurrent]     = useState(0);
  const [selected, setSelected]   = useState<string | null>(null);
  const [quality, setQuality]     = useState<string | null>(null);
  const [done, setDone]           = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult]       = useState<{ score: number; total: number; timeSecs: number; xpEarned: number } | null>(null);
  const [xpFlash, setXpFlash]     = useState(false);

  // Timer
  const [timeLeft, setTimeLeft]   = useState(0);
  const timerRef                  = useRef<ReturnType<typeof setInterval> | null>(null);
  const navigatingRef             = useRef(false); // previne double-call em next()

  // Track answers — envia `resposta` (alternativa escolhida); score computado server-side
  const answers = useRef<{ questionId: number; resposta: string }[]>([]);
  const score   = useRef(0); // local apenas para display (server recalcula)
  const startTime = useRef<number>(0);

  useEffect(() => {
    const load = async () => {
      for (let i = 0; i < 3; i++) {
        try {
          if (i > 0) await new Promise(r => setTimeout(r, i * 800));
          // Timeout de 20s — /api/desafio/hoje tem ~10 queries sequenciais ao banco
          const ctrl = new AbortController();
          const tid = setTimeout(() => ctrl.abort(), 20_000);
          const r = await fetch("/api/desafio/hoje", { signal: ctrl.signal });
          clearTimeout(tid);
          if (!r.ok) continue;
          const d = await r.json();
          if (d) { setData(d); break; }
        } catch { /* retry ou timeout — tenta próxima iteração */ }
      }
      setLoading(false);
    };
    void load();
  }, []);

  const submitChallenge = useCallback(async () => {
    if (!data || submitting) return;
    setSubmitting(true);
    const elapsed = Math.round((Date.now() - startTime.current) / 1000);
    const res = await fetch("/api/desafio/submeter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        total: data.questions.length,
        timeSecs: elapsed,
        answers: answers.current, // [{ questionId, resposta }] — score calculado server-side
      }),
    }).catch(() => null);
    if (res?.ok) {
      const d = await res.json();
      setResult(d);
      setXpFlash(true);
      setTimeout(() => setXpFlash(false), 2000);
    }
    setSubmitting(false);
  }, [data, submitting]);

  // Timer tick
  useEffect(() => {
    if (!started || done) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          setDone(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [started, done]);

  // Auto-submit when done
  useEffect(() => {
    if (done && data && !result) {
      void submitChallenge();
    }
  }, [done, data, result, submitChallenge]);

  function startChallenge() {
    if (!data) return;
    setTimeLeft(data.timeLimit);
    startTime.current = Date.now();
    answers.current = [];
    score.current = 0;
    setStarted(true);
    setCurrent(0);
    setSelected(null);
    setQuality(null);
    setDone(false);
    setResult(null);
  }

  function handleSelect(key: string) {
    if (selected || !data) return;
    setSelected(key);
    const q = data.questions[current];
    const isCorrect = key === q.answer; // local display only (q.answer pode ser undefined)
    if (isCorrect) score.current += 1;
    answers.current.push({ questionId: q.id, resposta: key });

    if (!isCorrect) {
      // Auto-save como erro no caderno de erros
      fetch("/api/questoes/progresso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: q.id, resposta: key, quality: "errei" }),
      }).catch(() => {});
      // Mostra botão Próxima imediatamente (aluno lê a explicação e avança quando quiser)
      setQuality("__auto__");
    }
  }

  function handleQuality(qual: string) {
    setQuality(qual);
    const q = data!.questions[current];
    const isCorrect = selected === q.answer;
    fetch("/api/questoes/progresso", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId: q.id, resposta: selected ?? "", quality: qual }),
    }).catch(() => {});
    // Não avança automaticamente — botão "Próxima" deixa o usuário avançar no ritmo dele
  }

  function next() {
    if (!data || navigatingRef.current) return;
    navigatingRef.current = true;
    if (current >= data.questions.length - 1) {
      clearInterval(timerRef.current!);
      setDone(true);
      navigatingRef.current = false;
    } else {
      setCurrent(c => c + 1);
      setSelected(null);
      setQuality(null);
      // Mantém o bloqueio por 400ms para evitar duplo-avanço por cliques rápidos
      setTimeout(() => { navigatingRef.current = false; }, 400);
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen text-white">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-400">Preparando o desafio...</p>
        </div>
      </div>
    );
  }

  if (!data || data.questions.length < 5) {
    return (
      <div className="min-h-screen text-white p-6 flex flex-col items-center justify-center max-w-lg mx-auto text-center">
        <Target className="w-16 h-16 text-gray-700 mb-4" />
        <h2 className="text-xl font-bold mb-2">Questões insuficientes</h2>
        <p className="text-gray-500 text-sm mb-6">
          Adicione matérias ao seu perfil para desbloquear o Desafio Diário.
        </p>
        <Link href="/perfil" className="px-5 py-3 bg-indigo-600 rounded-xl text-sm font-medium">
          Configurar perfil
        </Link>
      </div>
    );
  }

  // Already completed today — show result
  if (data.completedToday && !result) {
    const r = data.completedToday;
    const pct = Math.round((r.score / r.total) * 100);
    return (
      <div className="min-h-screen text-white p-6 max-w-lg mx-auto flex flex-col items-center justify-center">
        <Lock className="w-12 h-12 text-gray-600 mb-3" />
        <h2 className="text-xl font-bold mb-1">Desafio de hoje concluído</h2>
        <p className="text-gray-500 text-sm mb-6">Volte amanhã para um novo desafio</p>
        <div className="w-full rounded-2xl bg-white/[0.04] border border-white/[0.08] p-6 mb-6">
          <div className="grid grid-cols-3 gap-4 text-center mb-4">
            <div>
              <p className={cn("text-2xl font-black",
                pct >= 70 ? "text-green-400" : pct >= 50 ? "text-amber-400" : "text-red-400"
              )}>{pct}%</p>
              <p className="text-xs text-gray-500">Acerto</p>
            </div>
            <div>
              <p className="text-2xl font-black text-white">{r.score}/{r.total}</p>
              <p className="text-xs text-gray-500">Corretas</p>
            </div>
            <div>
              <p className="text-2xl font-black text-indigo-400">+{r.xpEarned}</p>
              <p className="text-xs text-gray-500">XP ganho</p>
            </div>
          </div>
          <div className="text-center text-xs text-gray-600">
            Tempo: {formatTime(r.timeSecs)}
          </div>
        </div>
        <Link href="/workspace" className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-sm font-medium transition-colors">
          Continuar estudando
        </Link>
      </div>
    );
  }

  // Results screen
  if ((done || result) && result) {
    const pct = Math.round((result.score / result.total) * 100);
    const elapsed = result.timeSecs;
    return (
      <div className="min-h-screen text-white p-6 max-w-lg mx-auto flex flex-col items-center justify-center">
        {xpFlash && (
          <div className="fixed top-6 right-6 z-50 flex items-center gap-1.5 px-4 py-2 rounded-full bg-yellow-500 text-black font-black text-sm shadow-xl animate-bounce">
            <Zap className="w-4 h-4" />
            +{result.xpEarned} XP
          </div>
        )}
        <Trophy className="w-16 h-16 text-yellow-400 mb-4" />
        <h2 className="text-2xl font-bold mb-1">Desafio Concluído!</h2>
        <p className="text-gray-400 text-sm mb-6">Resultado de hoje</p>

        <div className="w-full rounded-2xl bg-white/[0.04] border border-white/[0.08] p-6 mb-4">
          {/* Accuracy ring */}
          <div className="flex justify-center mb-5">
            <div className="relative w-24 h-24">
              <svg width="96" height="96" style={{ transform: "rotate(-90deg)" }}>
                <circle cx="48" cy="48" r="42" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="8" />
                <circle cx="48" cy="48" r="42" fill="none"
                  stroke={pct >= 70 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#ef4444"}
                  strokeWidth="8"
                  strokeDasharray={`${(pct / 100) * 2 * Math.PI * 42} ${2 * Math.PI * 42}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={cn("text-xl font-black",
                  pct >= 70 ? "text-green-400" : pct >= 50 ? "text-amber-400" : "text-red-400"
                )}>{pct}%</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center mb-4">
            <div className="rounded-xl bg-white/5 p-3">
              <p className="text-xl font-black text-white">{result.score}/{result.total}</p>
              <p className="text-[10px] text-gray-500">Corretas</p>
            </div>
            <div className="rounded-xl bg-white/5 p-3">
              <p className="text-xl font-black text-blue-400">{formatTime(elapsed)}</p>
              <p className="text-[10px] text-gray-500">Tempo</p>
            </div>
            <div className="rounded-xl bg-indigo-500/10 border border-indigo-500/20 p-3">
              <p className="text-xl font-black text-indigo-400">+{result.xpEarned}</p>
              <p className="text-[10px] text-gray-500">XP ganho</p>
            </div>
          </div>

          {pct >= 70 ? (
            <div className="text-center text-sm text-green-400 font-medium">
              🎉 Excelente! Acima de 70%
            </div>
          ) : pct >= 50 ? (
            <div className="text-center text-sm text-amber-400 font-medium">
              Bom desempenho! Continue praticando
            </div>
          ) : (
            <div className="text-center text-sm text-red-400 font-medium">
              Continue estudando — você vai melhorar!
            </div>
          )}
        </div>

        <div className="w-full space-y-2">
          <Link href="/workspace"
            className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-sm font-medium transition-colors">
            <RotateCcw className="w-4 h-4" />
            Continuar estudando
          </Link>
          <Link href="/ranking"
            className="w-full flex items-center justify-center gap-2 py-3 border border-white/10 hover:bg-white/5 rounded-xl text-sm text-gray-400 transition-colors">
            <Trophy className="w-4 h-4" />
            Ver ranking
          </Link>
        </div>
      </div>
    );
  }

  // Challenge in progress
  if (!started) {
    return (
      <div className="min-h-screen text-white p-6 max-w-lg mx-auto flex flex-col items-center justify-center">
        <div className="w-20 h-20 rounded-2xl bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center mb-6">
          <Zap className="w-10 h-10 text-yellow-400" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Desafio Diário</h1>
        <p className="text-gray-400 text-sm text-center mb-8">
          10 questões · 10 minutos · Bônus de XP garantido
        </p>

        <div className="w-full rounded-2xl bg-white/[0.04] border border-white/[0.08] p-6 mb-8 space-y-3">
          <Rule icon="🎯" text={`${data.questions.length} questões selecionadas para hoje`} />
          <Rule icon="⏱️" text={`${data.timeLimit / 60} minutos para responder tudo`} />
          <Rule icon="⚡" text={`+${data.xpBonus} XP bônus ao concluir + 2 XP por acerto`} />
          <Rule icon="🔁" text="Reseta à meia-noite — uma chance por dia" />
        </div>

        <button
          onClick={startChallenge}
          className="w-full flex items-center justify-center gap-3 py-4 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black font-black text-lg rounded-2xl transition-all shadow-lg shadow-yellow-500/20"
        >
          <Play className="w-5 h-5" />
          Iniciar Desafio
        </button>
      </div>
    );
  }

  // Quiz screen
  const q = data.questions[current];
  const opts = [
    { key: "A", text: q.optionA },
    { key: "B", text: q.optionB },
    { key: "C", text: q.optionC },
    { key: "D", text: q.optionD },
    { key: "E", text: q.optionE },
  ].filter(o => o.text);

  const pctTime = (timeLeft / data.timeLimit) * 100;
  const isLowTime = timeLeft < 60;

  return (
    <div className="min-h-screen text-white p-6 max-w-3xl mx-auto">
      {/* Timer bar */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1">
        <div
          className="h-full transition-all duration-1000"
          style={{
            width: `${pctTime}%`,
            background: isLowTime ? "#ef4444" : pctTime > 50 ? "#10b981" : "#f59e0b",
          }}
        />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-400" />
          <span className="font-bold text-yellow-400">Desafio Diário</span>
        </div>
        <div className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-full font-mono text-sm font-bold",
          isLowTime
            ? "bg-red-500/20 border border-red-500/30 text-red-400 animate-pulse"
            : "bg-white/5 border border-white/10 text-gray-300"
        )}>
          <Clock className="w-4 h-4" />
          {formatTime(timeLeft)}
        </div>
      </div>

      {/* Progress */}
      <div className="mb-5">
        <div className="flex justify-between text-xs text-gray-500 mb-1.5">
          <span>Questão {current + 1} de {data.questions.length}</span>
          <span className="text-green-400">{score.current} corretas</span>
        </div>
        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-yellow-500 transition-all"
            style={{ width: `${((current + 1) / data.questions.length) * 100}%` }}
          />
        </div>
        {/* Mini answer indicators */}
        <div className="flex gap-1 mt-1.5">
          {data.questions.map((_, i) => {
            const ans = answers.current[i];
            return (
              <div key={i} className={cn(
                "flex-1 h-1 rounded-full",
                i > current ? "bg-white/10"
                  : ans !== undefined ? "bg-blue-400"
                  : "bg-yellow-500"
              )} />
            );
          })}
        </div>
      </div>

      {/* Question card */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6">
        <div className="flex items-center gap-2 mb-4">
          {q.level && (
            <span className={cn("text-xs font-medium",
              q.level === "facil" ? "text-green-400" : q.level === "medio" ? "text-amber-400" : "text-red-400"
            )}>
              {q.level === "facil" ? "Fácil" : q.level === "medio" ? "Médio" : "Difícil"}
            </span>
          )}
        </div>

        <p className="text-gray-200 leading-relaxed mb-6 text-sm">{q.statement}</p>

        <div className="space-y-2.5">
          {opts.map(({ key, text }) => {
            const isSel = selected === key;
            const isCorr = key === q.answer;
            let style = "border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-gray-300";
            if (selected) {
              if (isCorr)      style = "border-green-500/50 bg-green-500/10 text-green-300";
              else if (isSel)  style = "border-red-500/50 bg-red-500/10 text-red-300";
              else             style = "border-white/5 bg-white/[0.01] text-gray-600";
            }
            return (
              <button key={key} onClick={() => handleSelect(key)} disabled={!!selected}
                className={cn(
                  "w-full text-left flex items-start gap-3 p-3.5 rounded-xl border transition-all text-sm",
                  style, !selected && "cursor-pointer"
                )}>
                <span className={cn(
                  "w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5",
                  selected && isCorr  ? "bg-green-500 border-green-500 text-white" :
                  selected && isSel   ? "bg-red-500 border-red-500 text-white" :
                  "border-current"
                )}>{key}</span>
                <span className="flex-1">{text}</span>
                {selected && isCorr && <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />}
                {selected && isSel && !isCorr && <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />}
              </button>
            );
          })}
        </div>

        {selected && (
          <div className="mt-5 space-y-3">
            {q.explanation && (
              <div className={cn(
                "p-4 rounded-xl border",
                selected === q.answer
                  ? "bg-emerald-950/50 border-emerald-500/40"
                  : "bg-red-950/50 border-red-500/40"
              )}>
                <p className="text-gray-200 text-sm leading-relaxed">{q.explanation}</p>
              </div>
            )}
            {!quality && selected === q.answer && (
              <div>
                <p className="text-xs text-gray-500 mb-2">Como foi?</p>
                <div className="grid grid-cols-3 gap-2">
                  {QUALITY_OPTS.map(o => (
                    <button key={o.id} onClick={() => handleQuality(o.id)}
                      className={cn("py-2 rounded-lg border text-xs font-medium transition-colors", o.style)}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {quality && (
              <button onClick={next}
                className="w-full py-3 bg-yellow-500 hover:bg-yellow-400 text-black rounded-xl text-sm font-bold transition-colors">
                {current < data.questions.length - 1 ? "Próxima →" : "Ver resultado"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Rule({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xl w-8 text-center flex-shrink-0">{icon}</span>
      <span className="text-sm text-gray-400">{text}</span>
    </div>
  );
}
