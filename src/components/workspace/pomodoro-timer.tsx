"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { Play, Pause, RotateCcw, Coffee, Flame, Clock, Trophy, ChevronDown, Settings, X } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Config presets ────────────────────────────────────────────────────────────
const DEFAULT_DURATIONS = { work: 25, shortBreak: 5, longBreak: 15 };
const MODE_META = [
  { id: "work",        label: "Foco",        icon: "🎯", color: "#6366f1" },
  { id: "shortBreak",  label: "Pausa curta", icon: "☕", color: "#10b981" },
  { id: "longBreak",   label: "Pausa longa", icon: "🌿", color: "#f59e0b" },
] as const;

type ModeId = typeof MODE_META[number]["id"];

// ── Simple beep using AudioContext ────────────────────────────────────────────
function playBeep(freq = 880, dur = 0.3) {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.start();
    osc.stop(ctx.currentTime + dur);
    // Play 3 beeps
    setTimeout(() => playBeep(freq, dur), 400);
    // Only recurse once more (avoid infinite loop)
  } catch { /* AudioContext may be unavailable */ }
}

function formatTime(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

// ── Session history row ───────────────────────────────────────────────────────
interface SessionRow { startedAt: string; durMin: number; label?: string; savedAt?: string; }

interface WeekStats { totalHrs: number; countToday: number; sessions: SessionRow[]; }

// ── Circular countdown SVG ────────────────────────────────────────────────────
function CountdownRing({
  progress, color, size = 220,
}: { progress: number; color: string; size?: number }) {
  const stroke = 10;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = progress * circ;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.5s linear" }} />
    </svg>
  );
}

const LS = {
  get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* ok */ } },
  del: (k: string) => { try { localStorage.removeItem(k); } catch { /* ok */ } },
};

export function PomodoroTimer({ subjects }: { subjects?: { id: string; name: string }[] }) {
  // Restaura estado persistido do localStorage
  const [modeId, setModeId] = useState<ModeId>(() => (LS.get("pomo:mode") as ModeId) || "work");
  const [cycles, setCycles] = useState(() => parseInt(LS.get("pomo:cycles") ?? "0", 10));
  const [label,       setLabel]     = useState(() => LS.get("pomo:label") ?? "");
  const [showLabel,   setShowLabel] = useState(false);
  const [showConfig,  setShowConfig] = useState(false);
  const [weekStats,   setWeekStats] = useState<WeekStats | null>(null);
  const [saving,      setSaving]    = useState(false);

  // Durações configuráveis
  const [durations, setDurations] = useState<Record<ModeId, number>>(() => {
    try {
      const saved = LS.get("pomo:durations");
      return saved ? { ...DEFAULT_DURATIONS, ...JSON.parse(saved) } : DEFAULT_DURATIONS;
    } catch { return DEFAULT_DURATIONS; }
  });
  const [draftDurations, setDraftDurations] = useState(durations);

  const MODES = MODE_META.map(m => ({ ...m, minutes: durations[m.id] }));
  const currentMode = MODES.find(m => m.id === modeId)!;
  const totalSecs = currentMode.minutes * 60;

  // Calcula tempo restante a partir do endAt salvo
  const calcLeft = (): number => {
    const endAt = parseInt(LS.get("pomo:endAt") ?? "0", 10);
    if (!endAt) return totalSecs;
    const left = Math.round((endAt - Date.now()) / 1000);
    return left > 0 ? left : 0;
  };

  const [secondsLeft, setSecondsLeft] = useState(calcLeft);
  const [running, setRunning] = useState(() => {
    const endAt = parseInt(LS.get("pomo:endAt") ?? "0", 10);
    return endAt > Date.now();
  });

  const intervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<string | null>(LS.get("pomo:startedAt"));
  const handledEnd   = useRef(false);

  const loadStats = useCallback(() => {
    fetch("/api/workspace/pomodoro")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setWeekStats(d); })
      .catch(() => {});
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  // ── Persiste mode e cycles ──────────────────────────────────────────────────
  useEffect(() => { LS.set("pomo:mode", modeId); }, [modeId]);
  useEffect(() => { LS.set("pomo:cycles", String(cycles)); }, [cycles]);
  useEffect(() => { LS.set("pomo:label", label); }, [label]);

  // ── Ao terminar — auto-transição para pausa/foco ────────────────────────────
  const handleEnd = useCallback((finishedMode: ModeId, finishedCycles: number) => {
    if (handledEnd.current) return;
    handledEnd.current = true;

    playBeep(880, 0.2);
    // Notificação do sistema se permitido
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      new Notification(finishedMode === "work" ? "🍅 Foco concluído! Hora de pausar." : "☕ Pausa encerrada! Bora focar.");
    }

    let nextMode: ModeId;
    let newCycles = finishedCycles;
    if (finishedMode === "work") {
      newCycles = finishedCycles + 1;
      nextMode = newCycles % 4 === 0 ? "longBreak" : "shortBreak";
      setCycles(newCycles);
      LS.set("pomo:cycles", String(newCycles));
      const durMin = Math.round(MODES.find(m => m.id === "work")!.minutes);
      // Salva sessão de foco
      const startedAt = startedAtRef.current ?? new Date(Date.now() - durMin * 60_000).toISOString();
      fetch("/api/workspace/pomodoro", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startedAt, durMin, label: label || undefined }),
      }).then(() => loadStats()).catch(() => {});
    } else {
      nextMode = "work";
    }

    // Auto-inicia próximo modo
    const nextMins = MODES.find(m => m.id === nextMode)!.minutes;
    const nextTotal = nextMins * 60;
    const newEndAt = Date.now() + nextTotal * 1000;
    LS.set("pomo:endAt", String(newEndAt));
    LS.set("pomo:mode", nextMode);
    LS.del("pomo:startedAt");
    startedAtRef.current = new Date().toISOString();
    LS.set("pomo:startedAt", startedAtRef.current);
    setModeId(nextMode);
    setSecondsLeft(nextTotal);
    setRunning(true);
    setTimeout(() => { handledEnd.current = false; }, 1000);
  }, [label, loadStats]);

  // ── Tick ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        const endAt = parseInt(LS.get("pomo:endAt") ?? "0", 10);
        const left = endAt ? Math.max(0, Math.round((endAt - Date.now()) / 1000)) : 0;
        setSecondsLeft(left);
        if (left <= 0) {
          clearInterval(intervalRef.current!);
          setRunning(false);
          LS.del("pomo:endAt");
          handleEnd(modeId, cycles);
        }
      }, 500);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, modeId, cycles, handleEnd]);

  // ── Pede permissão de notificação ao iniciar ────────────────────────────────
  useEffect(() => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  // ── Salvar configurações ────────────────────────────────────────────────────
  function saveConfig() {
    setDurations(draftDurations);
    LS.set("pomo:durations", JSON.stringify(draftDurations));
    setShowConfig(false);
    // Reset timer com nova duração
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRunning(false);
    setSecondsLeft(draftDurations[modeId] * 60);
    LS.del("pomo:endAt");
    startedAtRef.current = null;
    LS.del("pomo:startedAt");
  }

  // ── Change mode manualmente ─────────────────────────────────────────────────
  function switchMode(id: ModeId) {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRunning(false);
    setModeId(id);
    setSecondsLeft(durations[id] * 60);
    LS.del("pomo:endAt");
    startedAtRef.current = null;
    LS.del("pomo:startedAt");
  }

  // ── Save session manual ─────────────────────────────────────────────────────
  async function saveSession(durMin: number) {
    setSaving(true);
    try {
      await fetch("/api/workspace/pomodoro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startedAt: startedAtRef.current ?? new Date(Date.now() - durMin * 60_000).toISOString(),
          durMin, label: label || undefined,
        }),
      });
      loadStats();
    } catch { /* silently fail */ }
    setSaving(false);
  }

  // ── Start / Pause ───────────────────────────────────────────────────────────
  function toggleRun() {
    if (!running) {
      // Inicia: define endAt absoluto
      const left = secondsLeft > 0 ? secondsLeft : currentMode.minutes * 60;
      const newEndAt = Date.now() + left * 1000;
      LS.set("pomo:endAt", String(newEndAt));
      if (!startedAtRef.current) {
        startedAtRef.current = new Date().toISOString();
        LS.set("pomo:startedAt", startedAtRef.current);
      }
    } else {
      // Pausa: remove endAt mas guarda tempo restante
      LS.del("pomo:endAt");
    }
    setRunning(r => !r);
  }

  // ── Reset ───────────────────────────────────────────────────────────────────
  function reset() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRunning(false);
    setSecondsLeft(currentMode.minutes * 60);
    LS.del("pomo:endAt");
    startedAtRef.current = null;
    LS.del("pomo:startedAt");
  }

  // ── Manual save (abandonar sessão) ─────────────────────────────────────────
  function manualSave() {
    if (modeId !== "work") return;
    const elapsed = currentMode.minutes * 60 - secondsLeft;
    if (elapsed < 60) return;
    const durMin = Math.round(elapsed / 60);
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRunning(false);
    LS.del("pomo:endAt");
    saveSession(durMin);
    setCycles(c => c + 1);
    setSecondsLeft(currentMode.minutes * 60);
    startedAtRef.current = null;
    LS.del("pomo:startedAt");
  }

  const progress = 1 - secondsLeft / (currentMode.minutes * 60);
  const totalHrs = weekStats?.totalHrs ?? 0;
  const countToday = weekStats?.countToday ?? 0;

  return (
    <div className="flex flex-col relative" style={{ background: "var(--bg-base)", minHeight: showConfig ? "400px" : undefined }}>

      {/* ── Config panel — overlay sobre o timer ─────────────────────────── */}
      {showConfig && (
        <div className="absolute inset-0 z-20 flex flex-col justify-center p-4"
          style={{ background: "var(--bg-base)" }}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>⚙️ Configurar durações</span>
            <button onClick={() => { setShowConfig(false); setDraftDurations(durations); }}
              className="w-7 h-7 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-3">
            {MODE_META.map(m => (
              <div key={m.id} className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/10">
                <span className="text-sm text-gray-300 flex items-center gap-2"><span>{m.icon}</span>{m.label}</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setDraftDurations(d => ({ ...d, [m.id]: Math.max(1, d[m.id] - 5) }))}
                    className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center font-bold text-base">−</button>
                  <input
                    type="number" min={1} max={120}
                    value={draftDurations[m.id]}
                    onChange={e => setDraftDurations(d => ({ ...d, [m.id]: Math.max(1, Math.min(120, parseInt(e.target.value) || 1)) }))}
                    className="w-14 text-center bg-white/[0.06] border border-white/10 rounded-lg py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                  <span className="text-xs text-gray-500">min</span>
                  <button onClick={() => setDraftDurations(d => ({ ...d, [m.id]: Math.min(120, d[m.id] + 5) }))}
                    className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center font-bold text-base">+</button>
                </div>
              </div>
            ))}
          </div>
          <button onClick={saveConfig}
            className="mt-5 w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
            style={{ background: "#6366f1" }}>
            Salvar e aplicar
          </button>
          <p className="text-center text-[10px] text-gray-600 mt-2">Máximo 120 min por modo</p>
        </div>
      )}

      {/* ── Mode selector ────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 px-3 pt-2 pb-0">
        <div className="flex gap-1.5 flex-1 justify-center flex-wrap">
          {MODES.map(m => (
            <button key={m.id} onClick={() => switchMode(m.id)}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all whitespace-nowrap",
                modeId === m.id
                  ? "text-white shadow-lg"
                  : "text-gray-500 bg-white/[0.04] hover:text-gray-300",
              )}
              style={modeId === m.id ? { background: currentMode.color + "33", color: currentMode.color, border: `1px solid ${currentMode.color}55` } : {}}
            >
              <span>{m.icon}</span>
              <span>{m.label}</span>
              <span className="opacity-60">{m.minutes}min</span>
            </button>
          ))}
        </div>
        <button
          onClick={() => { setShowConfig(v => !v); setDraftDurations(durations); }}
          title="Configurar durações"
          className={cn(
            "w-6 h-6 flex items-center justify-center rounded-full transition-all flex-shrink-0",
            showConfig ? "bg-indigo-500/30 text-indigo-400" : "bg-white/[0.05] text-gray-500 hover:text-gray-300 hover:bg-white/10"
          )}>
          <Settings className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ── Label / matéria ──────────────────────────────────────────────── */}
      <div className="px-4 pt-2">
        {showLabel ? (
          <div className="flex gap-2 items-center">
            {subjects && subjects.length > 0 ? (
              <select value={label} onChange={e => setLabel(e.target.value)}
                className="flex-1 bg-white/[0.05] border border-white/[0.1] rounded-lg px-3 py-1.5 text-sm text-white">
                <option value="">— Sem rótulo —</option>
                {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
            ) : (
              <input value={label} onChange={e => setLabel(e.target.value)}
                placeholder="Ex: Direito Constitucional..."
                className="flex-1 bg-white/[0.05] border border-white/[0.1] rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500" />
            )}
            <button onClick={() => setShowLabel(false)}
              className="text-xs text-gray-500 hover:text-gray-300">✕</button>
          </div>
        ) : (
          <button onClick={() => setShowLabel(true)}
            className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-400 transition-colors mx-auto">
            <ChevronDown className="w-3 h-3" />
            {label ? <span className="text-indigo-400">{label}</span> : "Adicionar rótulo de matéria"}
          </button>
        )}
      </div>

      {/* ── Timer ring ───────────────────────────────────────────────────── */}
      <div className="flex flex-col items-center py-1">
        <div className="relative">
          <CountdownRing progress={progress} color={currentMode.color} size={140} />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
            <div className="text-4xl font-black tabular-nums tracking-tight"
              style={{ color: secondsLeft === 0 ? currentMode.color : undefined }}>
              {formatTime(secondsLeft)}
            </div>
            <div className="text-xs text-gray-500 font-medium">{currentMode.label}</div>
            {saving && <div className="text-[10px] text-indigo-400 animate-pulse">salvando…</div>}
          </div>
        </div>

        {/* ── Controls ──────────────────────────────────────────────────── */}
        <div className="flex items-center gap-4 mt-2">
          <button onClick={reset}
            className="w-9 h-9 rounded-full bg-white/[0.05] flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/[0.1] transition-all">
            <RotateCcw className="w-4 h-4" />
          </button>

          <button onClick={toggleRun}
            className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-white shadow-xl transition-all active:scale-95"
            style={{ background: `linear-gradient(135deg, ${currentMode.color}, ${currentMode.color}cc)`, boxShadow: `0 8px 24px ${currentMode.color}55` }}>
            {running
              ? <Pause className="w-6 h-6" />
              : <Play  className="w-6 h-6 translate-x-0.5" />}
          </button>

          {modeId === "work" && running && (
            <button onClick={manualSave} title="Salvar sessão e resetar"
              className="w-9 h-9 rounded-full bg-white/[0.05] flex items-center justify-center text-gray-400 hover:text-emerald-400 hover:bg-emerald-400/10 transition-all">
              <Trophy className="w-4 h-4" />
            </button>
          )}
          {!(modeId === "work" && running) && (
            <div className="w-9 h-9" />
          )}
        </div>

        {/* ── Cycles indicator ─────────────────────────────────────────── */}
        <div className="flex items-center gap-1.5 mt-2">
          {Array.from({ length: Math.max(4, cycles + 1) }).map((_, i) => (
            <div key={i}
              className={cn("w-2 h-2 rounded-full transition-all", i < cycles ? "opacity-100" : "opacity-20")}
              style={{ background: currentMode.color }} />
          ))}
          <span className="text-xs text-gray-500 ml-1">{cycles > 0 ? `${cycles} pomodoro${cycles > 1 ? "s" : ""}` : "Pronto para começar"}</span>
        </div>
      </div>

      {/* ── Stats this week ──────────────────────────────────────────────── */}
      <div className="mx-3 mb-3 grid grid-cols-3 gap-2">
        {[
          { icon: <Clock className="w-3.5 h-3.5" />,  label: "Esta semana", value: `${totalHrs.toFixed(1)}h`,    color: "#6366f1" },
          { icon: <Flame className="w-3.5 h-3.5" />,  label: "Hoje",        value: `${countToday} 🍅`,            color: "#f97316" },
          { icon: <Coffee className="w-3.5 h-3.5" />, label: "Sessões",     value: `${weekStats?.sessions.length ?? 0}`, color: "#10b981" },
        ].map(s => (
          <div key={s.label} className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-2 flex flex-col items-center gap-0.5">
            <div style={{ color: s.color }}>{s.icon}</div>
            <div className="text-base font-bold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-[9px] text-gray-600 text-center">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Recent sessions (scrollable, só se tiver) ────────────────────── */}
      {(weekStats?.sessions.length ?? 0) > 0 && (
        <div className="mx-3 mb-3 max-h-36 overflow-y-auto">
          <div className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mb-1.5">Sessões desta semana</div>
          <div className="flex flex-col gap-1">
            {(weekStats?.sessions ?? []).slice(0, 8).map((s, i) => {
              const d = new Date(s.startedAt);
              const dateStr = d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" });
              const timeStr = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
              return (
                <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                  <div className="text-sm">🍅</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-300 truncate">{s.label || "Sessão de foco"}</div>
                    <div className="text-[10px] text-gray-600">{dateStr} às {timeStr}</div>
                  </div>
                  <div className="text-xs font-semibold text-indigo-400 flex-shrink-0">{s.durMin}min</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
