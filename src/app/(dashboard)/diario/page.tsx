"use client";
import { useState, useEffect } from "react";
import { BookOpen, Plus, Trash2, Check, X, Flame, Clock, Smile } from "lucide-react";
import { cn } from "@/lib/utils";

interface DiarioEntry {
  date: string;
  hours: number;
  mood: number;
  notes: string;
  subjectIds: string[];
}

interface Stats {
  totalHours: number;
  totalDays: number;
  avgMood: number;
  streak: number;
}

interface Subject { id: string; name: string; }

const MOOD_LABELS = ["", "😞 Péssimo", "😕 Ruim", "😐 Ok", "🙂 Bom", "😄 Ótimo"];
const MOOD_COLORS = ["", "text-red-400", "text-orange-400", "text-yellow-400", "text-emerald-400", "text-green-400"];

function fmtDate(iso: string) {
  const d = new Date(iso + "T12:00:00Z");
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
}

function intensityBg(hours: number, max: number) {
  if (hours === 0) return "bg-white/[0.04] border-white/[0.06]";
  const pct = hours / Math.max(max, 0.1);
  if (pct >= 0.75) return "bg-indigo-500/60 border-indigo-400/50";
  if (pct >= 0.40) return "bg-indigo-500/35 border-indigo-400/30";
  return "bg-indigo-500/15 border-indigo-400/20";
}

// Build 90-day heatmap grid
function buildGrid(entries: DiarioEntry[]): { date: string; hours: number }[] {
  const map: Record<string, number> = {};
  for (const e of entries) map[e.date] = e.hours;
  const grid: { date: string; hours: number }[] = [];
  for (let i = 89; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const str = d.toISOString().slice(0, 10);
    grid.push({ date: str, hours: map[str] ?? 0 });
  }
  return grid;
}

const today = new Date().toISOString().slice(0, 10);

export default function DiarioPage() {
  const [entries, setEntries]   = useState<DiarioEntry[]>([]);
  const [stats, setStats]       = useState<Stats | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<{ date: string; hours: string; mood: number; notes: string; subjectIds: string[] }>({
    date: today, hours: "1", mood: 3, notes: "", subjectIds: [],
  });

  async function load() {
    setLoading(true);
    const res = await fetch("/api/workspace/diario?days=90");
    if (res.ok) {
      const d = await res.json();
      setEntries(d.entries ?? []);
      setStats(d.stats ?? null);
      setSubjects(d.subjects ?? []);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openForm(entry?: DiarioEntry) {
    if (entry) {
      setForm({
        date: entry.date,
        hours: String(entry.hours),
        mood: entry.mood,
        notes: entry.notes,
        subjectIds: entry.subjectIds,
      });
    } else {
      // Check if today already has an entry
      const todayEntry = entries.find(e => e.date === today);
      if (todayEntry) {
        setForm({
          date: todayEntry.date,
          hours: String(todayEntry.hours),
          mood: todayEntry.mood,
          notes: todayEntry.notes,
          subjectIds: todayEntry.subjectIds,
        });
      } else {
        setForm({ date: today, hours: "1", mood: 3, notes: "", subjectIds: [] });
      }
    }
    setShowForm(true);
  }

  async function save() {
    setSaving(true);
    const hours = parseFloat(form.hours) || 0;
    await fetch("/api/workspace/diario", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, hours }),
    });
    await load();
    setShowForm(false);
    setSaving(false);
  }

  async function remove(date: string) {
    setDeleting(date);
    await fetch(`/api/workspace/diario?date=${date}`, { method: "DELETE" });
    await load();
    setDeleting(null);
  }

  function toggleSubject(id: string) {
    setForm(prev => ({
      ...prev,
      subjectIds: prev.subjectIds.includes(id)
        ? prev.subjectIds.filter(s => s !== id)
        : [...prev.subjectIds, id],
    }));
  }

  const grid = buildGrid(entries);
  const maxHours = Math.max(...grid.map(g => g.hours), 0.1);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen text-white">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-400">Carregando diário...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-indigo-400" />
            Diário de Estudos
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">Registre suas sessões diárias e acompanhe o progresso</p>
        </div>
        <button
          onClick={() => openForm()}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-sm font-semibold transition-colors flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          Registrar hoje
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: "Horas totais", value: `${stats.totalHours}h`, icon: Clock, color: "text-indigo-400" },
            { label: "Dias estudados", value: stats.totalDays, icon: BookOpen, color: "text-blue-400" },
            { label: "Sequência atual", value: `${stats.streak}d`, icon: Flame, color: "text-orange-400" },
            { label: "Humor médio", value: MOOD_LABELS[Math.round(stats.avgMood)]?.split(" ")[0] ?? "—", icon: Smile, color: "text-yellow-400" },
          ].map(s => (
            <div key={s.label} className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 text-center">
              <s.icon className={cn("w-4 h-4 mx-auto mb-1", s.color)} />
              <p className={cn("text-xl font-black", s.color)}>{s.value}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Heatmap — 90 days */}
      <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-5 mb-6">
        <h3 className="text-sm font-semibold text-gray-400 mb-3">Últimos 90 dias</h3>
        <div className="grid gap-1" style={{ gridTemplateColumns: "repeat(18, minmax(0, 1fr))" }}>
          {grid.map(cell => (
            <div
              key={cell.date}
              title={`${fmtDate(cell.date)}: ${cell.hours}h`}
              className={cn(
                "aspect-square rounded-sm border cursor-default transition-all",
                cell.date === today ? "ring-1 ring-indigo-400/60" : "",
                intensityBg(cell.hours, maxHours)
              )}
            />
          ))}
        </div>
        <div className="flex items-center gap-3 mt-3 justify-end">
          {[
            { label: "Sem estudo", cls: "bg-white/[0.04] border-white/[0.06]" },
            { label: "Pouco", cls: "bg-indigo-500/15 border-indigo-400/20" },
            { label: "Muito", cls: "bg-indigo-500/60 border-indigo-400/50" },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-1.5 text-[10px] text-gray-600">
              <div className={cn("w-3 h-3 rounded-sm border", l.cls)} />
              {l.label}
            </div>
          ))}
        </div>
      </div>

      {/* Entries list */}
      <div className="space-y-3">
        {entries.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="w-12 h-12 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">Nenhuma entrada ainda</p>
            <p className="text-gray-600 text-sm mt-1">
              Comece registrando sua sessão de hoje.
            </p>
          </div>
        ) : entries.map(entry => {
          const subjectNames = subjects
            .filter(s => entry.subjectIds.includes(s.id))
            .map(s => s.name);
          return (
            <div
              key={entry.date}
              className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 flex gap-4 items-start group"
            >
              {/* Date badge */}
              <div className="flex-shrink-0 text-center w-12">
                <p className="text-[10px] text-gray-600 uppercase">
                  {new Date(entry.date + "T12:00:00Z").toLocaleDateString("pt-BR", { weekday: "short", timeZone: "UTC" })}
                </p>
                <p className="text-lg font-black text-white leading-tight">
                  {new Date(entry.date + "T12:00:00Z").getUTCDate()}
                </p>
                <p className="text-[10px] text-gray-600">
                  {new Date(entry.date + "T12:00:00Z").toLocaleDateString("pt-BR", { month: "short", timeZone: "UTC" })}
                </p>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap mb-1">
                  <span className="text-sm font-bold text-white flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
                    {entry.hours}h estudadas
                  </span>
                  <span className={cn("text-sm font-medium", MOOD_COLORS[entry.mood])}>
                    {MOOD_LABELS[entry.mood]}
                  </span>
                </div>
                {subjectNames.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-1.5">
                    {subjectNames.map(name => (
                      <span key={name} className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                        {name}
                      </span>
                    ))}
                  </div>
                )}
                {entry.notes && (
                  <p className="text-xs text-gray-500 line-clamp-2">{entry.notes}</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex-shrink-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => openForm(entry)}
                  className="p-1.5 rounded-lg text-gray-600 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                  title="Editar"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => remove(entry.date)}
                  disabled={deleting === entry.date}
                  className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                  title="Remover"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md bg-[#0f1420] rounded-2xl border border-white/10 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-white">Registrar sessão</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Date */}
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">Data</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                  max={today}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50"
                />
              </div>

              {/* Hours */}
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">
                  Horas estudadas: <span className="text-white font-bold">{form.hours}h</span>
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="12"
                  step="0.5"
                  value={form.hours}
                  onChange={e => setForm(p => ({ ...p, hours: e.target.value }))}
                  className="w-full accent-indigo-500"
                />
                <div className="flex justify-between text-[10px] text-gray-600 mt-0.5">
                  <span>30min</span><span>12h</span>
                </div>
              </div>

              {/* Mood */}
              <div>
                <label className="text-xs text-gray-500 mb-2 block">Como foi sua sessão?</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(m => (
                    <button
                      key={m}
                      onClick={() => setForm(p => ({ ...p, mood: m }))}
                      className={cn(
                        "flex-1 py-2 rounded-xl text-lg transition-all border",
                        form.mood === m
                          ? "border-indigo-500/50 bg-indigo-500/15 scale-105"
                          : "border-white/[0.06] hover:border-white/20"
                      )}
                      title={MOOD_LABELS[m]}
                    >
                      {MOOD_LABELS[m].split(" ")[0]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Subjects */}
              {subjects.length > 0 && (
                <div>
                  <label className="text-xs text-gray-500 mb-2 block">Matérias estudadas (opcional)</label>
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                    {subjects.map(s => {
                      const sel = form.subjectIds.includes(s.id);
                      return (
                        <button
                          key={s.id}
                          onClick={() => toggleSubject(s.id)}
                          className={cn(
                            "text-[11px] px-2.5 py-1 rounded-full border transition-all",
                            sel
                              ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-300"
                              : "bg-white/5 border-white/[0.08] text-gray-500 hover:border-white/20"
                          )}
                        >
                          {sel && <Check className="w-2.5 h-2.5 inline mr-1" />}
                          {s.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">Anotações (opcional)</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  placeholder="O que você estudou? Dificuldades? Próximos passos..."
                  rows={3}
                  maxLength={500}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 resize-none"
                />
                <p className="text-[10px] text-gray-600 mt-0.5 text-right">{form.notes.length}/500</p>
              </div>

              <button
                onClick={save}
                disabled={saving}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                {saving ? "Salvando..." : "Salvar entrada"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
