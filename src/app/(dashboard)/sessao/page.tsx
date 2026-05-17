"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { Timer, Play, Pause, Square, Plus, BookOpen, Clock, BarChart2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Subject { id: string; name: string; }
interface Sessao {
  id: string; subjectId: string | null; subjectName: string | null;
  duracaoMin: number; questoesRespondidas: number; nota: string; createdAt: string;
}
interface SessaoStats {
  totalMin: number; totalSessoes: number; mediaDuracao: number; minUltSemana: number;
}
interface TopSubject { name: string; total: number; min: number; }

function fmtMin(min: number) {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function fmtTimer(secs: number) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

export default function SessaoPage() {
  const [subjects, setSubjects]     = useState<Subject[]>([]);
  const [sessoes, setSessoes]       = useState<Sessao[]>([]);
  const [stats, setStats]           = useState<SessaoStats | null>(null);
  const [topSubjects, setTopSubjects] = useState<TopSubject[]>([]);
  const [loading, setLoading]       = useState(true);

  // Timer
  const [running, setRunning]       = useState(false);
  const [elapsed, setElapsed]       = useState(0);
  const timerRef                    = useRef<NodeJS.Timeout | null>(null);

  // Session form
  const [selSubject, setSelSubject] = useState("");
  const [questoes, setQuestoes]     = useState(0);
  const [nota, setNota]             = useState("");
  const [saving, setSaving]         = useState(false);
  const [saved, setSaved]           = useState(false);

  // Manual log form
  const [showManual, setShowManual] = useState(false);
  const [manMin, setManMin]         = useState(60);
  const [manSubject, setManSubject] = useState("");
  const [manQuestoes, setManQuestoes] = useState(0);
  const [manNota, setManNota]       = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [sessaoRes, subRes] = await Promise.all([
      fetch("/api/workspace/sessao"),
      fetch("/api/workspace/materias"),
    ]);
    if (sessaoRes.ok) {
      const d = await sessaoRes.json();
      setSessoes(d.sessoes ?? []);
      setStats(d.stats ?? null);
      setTopSubjects(d.topSubjects ?? []);
    }
    if (subRes.ok) {
      const d = await subRes.json();
      setSubjects(d.subjects ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Timer control
  function startTimer() {
    setRunning(true);
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
  }
  function pauseTimer() {
    setRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);
  }
  function resetTimer() {
    pauseTimer();
    setElapsed(0);
    setSaved(false);
  }
  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  async function saveSession(durationMin: number, subjectId: string, q: number, n: string) {
    setSaving(true);
    const res = await fetch("/api/workspace/sessao", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subjectId: subjectId || undefined, duracaoMin: durationMin, questoesRespondidas: q, nota: n }),
    });
    if (res.ok) {
      const d = await res.json();
      setSessoes(prev => [d.sessao, ...prev].slice(0, 30));
      setSaved(true);
      setQuestoes(0); setNota("");
      await load();
    }
    setSaving(false);
  }

  async function finishSession() {
    const minutes = Math.max(1, Math.round(elapsed / 60));
    await saveSession(minutes, selSubject, questoes, nota);
    resetTimer();
  }

  async function saveManual(e: React.FormEvent) {
    e.preventDefault();
    await saveSession(manMin, manSubject, manQuestoes, manNota);
    setManMin(60); setManSubject(""); setManQuestoes(0); setManNota("");
    setShowManual(false);
  }

  return (
    <div className="min-h-screen text-white p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Timer className="w-6 h-6 text-teal-400" />
          Sessão de Estudo
        </h1>
        <p className="text-gray-500 text-sm mt-0.5">
          Cronômetro de estudo e registro de horas
        </p>
      </div>

      {/* Timer card */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6 mb-5">
        {/* Clock display */}
        <div className="text-center mb-5">
          <p className={cn(
            "text-6xl font-black font-mono tracking-tight mb-1",
            running ? "text-teal-400" : elapsed > 0 ? "text-white" : "text-gray-600"
          )}>
            {fmtTimer(elapsed)}
          </p>
          <p className="text-xs text-gray-600">
            {running ? "Cronômetro em andamento..." : elapsed > 0 ? "Pausado" : "Pronto para iniciar"}
          </p>
        </div>

        {/* Controls */}
        <div className="flex gap-2 justify-center mb-5">
          {!running ? (
            <button
              onClick={startTimer}
              className="flex items-center gap-2 px-6 py-2.5 bg-teal-600 hover:bg-teal-700 rounded-xl text-sm font-semibold transition-colors"
            >
              <Play className="w-4 h-4" /> {elapsed > 0 ? "Retomar" : "Iniciar"}
            </button>
          ) : (
            <button
              onClick={pauseTimer}
              className="flex items-center gap-2 px-6 py-2.5 bg-amber-600 hover:bg-amber-700 rounded-xl text-sm font-semibold transition-colors"
            >
              <Pause className="w-4 h-4" /> Pausar
            </button>
          )}
          {elapsed > 0 && (
            <button
              onClick={resetTimer}
              className="p-2.5 rounded-xl border border-white/10 text-gray-500 hover:text-white transition-colors"
            >
              <Square className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Session form */}
        {elapsed >= 60 && (
          <div className="border-t border-white/[0.06] pt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Matéria</label>
                <select
                  value={selSubject}
                  onChange={e => setSelSubject(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                >
                  <option value="">Sem matéria</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Questões feitas</label>
                <input
                  type="number"
                  value={questoes}
                  onChange={e => setQuestoes(Math.max(0, parseInt(e.target.value) || 0))}
                  min={0}
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Anotação rápida (opcional)</label>
              <input
                value={nota}
                onChange={e => setNota(e.target.value)}
                placeholder="O que estudei hoje..."
                maxLength={300}
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none"
              />
            </div>
            <button
              onClick={finishSession}
              disabled={saving}
              className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
            >
              {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Plus className="w-4 h-4" />}
              {saving ? "Salvando..." : `Salvar sessão (${fmtMin(Math.max(1, Math.round(elapsed / 60)))})`}
            </button>
            {saved && (
              <p className="text-xs text-teal-400 text-center">✓ Sessão salva!</p>
            )}
          </div>
        )}
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {[
            { label: "Total estudado", value: fmtMin(stats.totalMin), color: "text-teal-400" },
            { label: "Sessões", value: String(stats.totalSessoes), color: "text-indigo-400" },
            { label: "Média/sessão", value: fmtMin(stats.mediaDuracao), color: "text-blue-400" },
            { label: "Esta semana", value: fmtMin(stats.minUltSemana), color: "text-emerald-400" },
          ].map(k => (
            <div key={k.label} className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-3 text-center">
              <p className={cn("text-xl font-black", k.color)}>{k.value}</p>
              <p className="text-[10px] text-gray-600 mt-0.5">{k.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Top subjects */}
      {topSubjects.length > 0 && (
        <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-4 mb-5">
          <p className="text-xs text-gray-600 font-medium uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <BarChart2 className="w-3 h-3" /> Matérias mais estudadas
          </p>
          <div className="space-y-2">
            {topSubjects.map(s => (
              <div key={s.name} className="flex items-center gap-3">
                <span className="text-xs text-gray-400 flex-1 truncate">{s.name}</span>
                <span className="text-xs text-gray-600">{s.total} sessões</span>
                <span className="text-xs font-bold text-teal-400 w-10 text-right">{fmtMin(s.min)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Manual log + history */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-gray-600 font-medium uppercase tracking-wider flex items-center gap-1.5">
          <Clock className="w-3 h-3" /> Histórico
        </p>
        <button
          onClick={() => setShowManual(p => !p)}
          className="flex items-center gap-1.5 text-xs text-teal-400 hover:text-teal-300 transition-colors"
        >
          <Plus className="w-3 h-3" /> Lançar manualmente
        </button>
      </div>

      {showManual && (
        <form onSubmit={saveManual} className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4 mb-4 space-y-3">
          <p className="text-xs text-gray-500 font-medium">Lançamento manual de sessão</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-gray-600 mb-1 block">Duração (minutos)</label>
              <input type="number" value={manMin} onChange={e => setManMin(Math.max(1, parseInt(e.target.value)||1))} min={1}
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none" />
            </div>
            <div>
              <label className="text-[10px] text-gray-600 mb-1 block">Questões feitas</label>
              <input type="number" value={manQuestoes} onChange={e => setManQuestoes(Math.max(0,parseInt(e.target.value)||0))} min={0}
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none" />
            </div>
            <div>
              <label className="text-[10px] text-gray-600 mb-1 block">Matéria</label>
              <select value={manSubject} onChange={e => setManSubject(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none">
                <option value="">Sem matéria</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-gray-600 mb-1 block">Nota</label>
              <input value={manNota} onChange={e => setManNota(e.target.value)} placeholder="Opcional" maxLength={200}
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-2 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none" />
            </div>
          </div>
          <button type="submit" disabled={saving}
            className="w-full py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 rounded-lg text-xs font-semibold transition-colors">
            {saving ? "Salvando..." : "Lançar sessão"}
          </button>
        </form>
      )}

      {loading ? (
        <div className="space-y-2">
          {[0,1,2].map(i => <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />)}
        </div>
      ) : sessoes.length === 0 ? (
        <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-8 text-center">
          <BookOpen className="w-8 h-8 text-gray-600 mx-auto mb-2" />
          <p className="text-xs text-gray-600">Nenhuma sessão registrada. Comece o cronômetro!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sessoes.map(s => (
            <div key={s.id} className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-600/15 border border-teal-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-teal-400">{fmtMin(s.duracaoMin)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {s.subjectName ?? "Sessão livre"}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-gray-600">{fmtDate(s.createdAt)}</span>
                  {s.questoesRespondidas > 0 && (
                    <span className="text-[10px] text-indigo-400">{s.questoesRespondidas} questões</span>
                  )}
                </div>
                {s.nota && <p className="text-[10px] text-gray-600 truncate mt-0.5">{s.nota}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
