"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Play, Pause, RotateCcw, CheckCircle, Coffee,
  Clock, Flame, BookOpen, Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Session {
  startedAt: string;
  durMin: number;
  label?: string;
  savedAt: string;
}

interface PomodoroData {
  sessions: Session[];
  totalMin: number;
  totalHrs: number;
  countToday: number;
}

type Mode = "work" | "short_break" | "long_break";

const MODE_CONFIG: Record<Mode, { label: string; min: number; color: string; icon: React.ReactNode; bg: string }> = {
  work:        { label: "Foco",        min: 25, color: "#6366f1", icon: <BookOpen className="w-5 h-5" />, bg: "rgba(99,102,241,0.08)" },
  short_break: { label: "Pausa curta", min: 5,  color: "#10b981", icon: <Coffee className="w-5 h-5" />, bg: "rgba(16,185,129,0.08)" },
  long_break:  { label: "Pausa longa", min: 15, color: "#f59e0b", icon: <Coffee className="w-5 h-5" />, bg: "rgba(245,158,11,0.08)" },
};

function formatTime(totalSecs: number) {
  const m = Math.floor(totalSecs / 60);
  const s = totalSecs % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function sessionLabel(s: Session) {
  const d = new Date(s.startedAt);
  const time = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `${time} · ${s.durMin}min${s.label ? ` · ${s.label}` : ""}`;
}

export default function PomodoroPage() {
  const [data, setData]         = useState<PomodoroData | null>(null);
  const [mode, setMode]         = useState<Mode>("work");
  const [customMin, setCustomMin] = useState<Record<Mode, number>>({
    work: 25, short_break: 5, long_break: 15,
  });
  const [running, setRunning]   = useState(false);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [sessionLabel2, setSessionLabel2] = useState("");
  const [completed, setCompleted] = useState(0); // pomodoros this session
  const [xpFlash, setXpFlash]  = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const intervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);       // timestamp real de início (ms)
  const modeRef      = useRef<Mode>("work");

  // Load sessions
  useEffect(() => {
    fetch("/api/workspace/pomodoro")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d); })
      .catch(() => {});
  }, []);

  // Update timeLeft when mode or custom changes (only if not running)
  useEffect(() => {
    if (!running) setTimeLeft(customMin[mode] * 60);
  }, [mode, customMin, running]);

  const finishSession = useCallback(async (isWork: boolean) => {
    if (!isWork) return;
    setCompleted(c => c + 1);
    setXpFlash(true);
    setTimeout(() => setXpFlash(false), 2000);
    setSaveError(null);

    // Usa o tempo real decorrido desde startTimeRef (evita imprecisão do setInterval)
    const elapsedMs = startTimeRef.current > 0 ? Date.now() - startTimeRef.current : 0;
    const durMin = elapsedMs > 0 ? +(elapsedMs / 60_000).toFixed(2) : customMin[modeRef.current];
    const startedAt = new Date(Date.now() - elapsedMs).toISOString();

    try {
      const res = await fetch("/api/workspace/pomodoro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startedAt, durMin, label: sessionLabel2 || undefined }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        setSaveError(body.error ?? `Erro ${res.status} ao salvar sessão`);
        return;
      }
      // Atualiza histórico
      fetch("/api/workspace/pomodoro")
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d) setData(d); })
        .catch(() => {});
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Erro de rede ao salvar sessão");
    }
  }, [sessionLabel2, customMin]);

  const stopTimer = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRunning(false);
  }, []);

  const startTimer = useCallback(() => {
    const totalSecs = customMin[modeRef.current] * 60;
    setTimeLeft(totalSecs);
    startTimeRef.current = Date.now();
    setRunning(true);

    intervalRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(intervalRef.current!);
          setRunning(false);
          void finishSession(modeRef.current === "work");
          // Auto-suggest break after work
          if (modeRef.current === "work") {
            setMode("short_break");
            modeRef.current = "short_break";
          } else {
            setMode("work");
            modeRef.current = "work";
          }
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }, [customMin, finishSession]);

  function handleStart() {
    modeRef.current = mode;
    startTimer();
  }

  function handlePause() {
    stopTimer();
  }

  function handleReset() {
    stopTimer();
    setTimeLeft(customMin[mode] * 60);
  }

  function switchMode(m: Mode) {
    stopTimer();
    setMode(m);
    modeRef.current = m;
    setTimeLeft(customMin[m] * 60);
  }

  const cfg = MODE_CONFIG[mode];
  const totalSecs = customMin[mode] * 60;
  const pct = totalSecs > 0 ? ((totalSecs - timeLeft) / totalSecs) * 100 : 0;
  const r = 88;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;

  return (
    <div className="min-h-screen text-white p-6 max-w-2xl mx-auto">
      {/* XP Flash */}
      {xpFlash && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-600 text-white font-bold text-sm shadow-xl animate-bounce pointer-events-none">
          +5 XP · Pomodoro concluído! 🍅
        </div>
      )}

      {/* Save Error */}
      {saveError && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl bg-red-900/90 border border-red-500/40 text-red-200 text-sm shadow-xl max-w-sm">
          <span className="text-base">⚠️</span>
          <span className="flex-1">{saveError}</span>
          <button onClick={() => setSaveError(null)} className="ml-2 text-red-400 hover:text-red-200 font-bold">✕</button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          🍅 Pomodoro
        </h1>
        <button
          onClick={() => setShowConfig(c => !c)}
          className="text-xs text-gray-500 hover:text-gray-300 border border-white/10 rounded-lg px-3 py-1.5 transition-colors"
        >
          {showConfig ? "Fechar config" : "⚙️ Configurar"}
        </button>
      </div>

      {/* Config panel */}
      {showConfig && (
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 mb-5 space-y-3">
          {(Object.keys(MODE_CONFIG) as Mode[]).map(m => (
            <div key={m} className="flex items-center gap-3">
              <span className="text-sm text-gray-400 w-28">{MODE_CONFIG[m].label}</span>
              <input
                type="range" min={1} max={m === "work" ? 90 : 30}
                value={customMin[m]}
                onChange={e => {
                  const v = parseInt(e.target.value);
                  setCustomMin(prev => ({ ...prev, [m]: v }));
                  if (mode === m && !running) setTimeLeft(v * 60);
                }}
                className="flex-1 accent-indigo-500"
              />
              <span className="text-sm font-mono text-white w-12 text-right">{customMin[m]}min</span>
            </div>
          ))}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Rótulo da sessão (opcional)</label>
            <input
              type="text"
              value={sessionLabel2}
              onChange={e => setSessionLabel2(e.target.value)}
              placeholder="Ex: Direito Constitucional"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      )}

      {/* Mode tabs */}
      <div className="flex gap-2 mb-8">
        {(Object.entries(MODE_CONFIG) as [Mode, typeof MODE_CONFIG[Mode]][]).map(([m, c]) => (
          <button
            key={m}
            onClick={() => switchMode(m)}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium border transition-all",
              mode === m
                ? "text-white border-transparent"
                : "text-gray-500 border-white/10 hover:text-gray-300"
            )}
            style={mode === m ? { background: c.bg, borderColor: `${c.color}40`, color: c.color } : {}}
          >
            {c.icon}
            <span>{c.label}</span>
          </button>
        ))}
      </div>

      {/* Timer ring */}
      <div className="flex justify-center mb-8">
        <div className="relative" style={{ width: 220, height: 220 }}>
          <svg width={220} height={220} style={{ transform: "rotate(-90deg)" }}>
            <circle cx={110} cy={110} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={10} />
            <circle cx={110} cy={110} r={r} fill="none"
              stroke={cfg.color}
              strokeWidth={10}
              strokeDasharray={`${dash} ${circ}`}
              strokeLinecap="round"
              style={{ transition: "stroke-dasharray 0.8s linear", filter: `drop-shadow(0 0 8px ${cfg.color}60)` }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-5xl font-black font-mono tracking-tight text-white">
              {formatTime(timeLeft)}
            </span>
            <span className="text-sm font-medium mt-1" style={{ color: cfg.color }}>
              {cfg.label}
            </span>
            {completed > 0 && (
              <div className="flex gap-1 mt-2">
                {Array.from({ length: Math.min(completed, 8) }).map((_, i) => (
                  <span key={i} className="text-xs">🍅</span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 mb-8">
        <button
          onClick={handleReset}
          className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
        <button
          onClick={running ? handlePause : handleStart}
          className="w-20 h-20 rounded-full flex items-center justify-center font-bold text-white transition-all shadow-xl"
          style={{
            background: `linear-gradient(135deg, ${cfg.color}, ${cfg.color}cc)`,
            boxShadow: `0 8px 24px ${cfg.color}40`,
          }}
        >
          {running
            ? <Pause className="w-8 h-8" />
            : <Play className="w-8 h-8 ml-1" />
          }
        </button>
        <button
          onClick={() => {
            startTimeRef.current = startTimeRef.current || (Date.now() - customMin[mode] * 60_000);
            void finishSession(mode === "work");
          }}
          className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-green-400 transition-colors"
          title="Registrar sessão manualmente"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 text-center">
          <p className="text-2xl font-black text-indigo-400">{completed}</p>
          <p className="text-xs text-gray-500 mt-0.5">Hoje (sessão)</p>
        </div>
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 text-center">
          <p className="text-2xl font-black text-green-400">{data?.countToday ?? 0}</p>
          <p className="text-xs text-gray-500 mt-0.5">Registradas hoje</p>
        </div>
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 text-center">
          <p className="text-2xl font-black text-amber-400">{data?.totalHrs.toFixed(1) ?? "0.0"}h</p>
          <p className="text-xs text-gray-500 mt-0.5">Semana</p>
        </div>
      </div>

      {/* Recent sessions */}
      {data && data.sessions.length > 0 && (
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-400">Sessões desta semana</span>
            <span className="ml-auto text-xs text-gray-600">{data.sessions.length} sessões</span>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {data.sessions.slice(0, 15).map((s, i) => (
              <div key={i} className="flex items-center gap-3 py-2 border-b border-white/[0.04] last:border-0">
                <span className="text-lg flex-shrink-0">🍅</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400 truncate">{sessionLabel(s)}</p>
                  {s.label && <p className="text-[10px] text-gray-600 truncate">{s.label}</p>}
                </div>
                <div className="flex items-center gap-1 text-green-400 flex-shrink-0">
                  <CheckCircle className="w-3 h-3" />
                  <span className="text-[10px] font-medium">{s.durMin}min</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tip */}
      <div className="mt-6 text-center">
        <p className="text-xs text-gray-700">
          <Flame className="w-3 h-3 inline mr-1 text-orange-400" />
          Após 4 pomodoros, faça uma pausa longa de {customMin.long_break} minutos
        </p>
      </div>
    </div>
  );
}
