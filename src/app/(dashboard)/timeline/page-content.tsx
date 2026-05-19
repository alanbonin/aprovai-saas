"use client";
import { useState, useEffect } from "react";
import { Activity, Rocket, Target, BarChart2, Flame, Zap, BookOpen, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface TimelineEvent {
  id: string;
  type: string;
  date: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  value?: number;
}

interface Stats {
  totalQuestoes: number;
  totalSimulados: number;
  currentStreak: number;
  xp: number;
}

const COLOR_MAP: Record<string, string> = {
  indigo:  "bg-indigo-500/15 border-indigo-500/30 text-indigo-400",
  blue:    "bg-blue-500/15 border-blue-500/30 text-blue-400",
  emerald: "bg-emerald-500/15 border-emerald-500/30 text-emerald-400",
  amber:   "bg-amber-500/15 border-amber-500/30 text-amber-400",
  orange:  "bg-orange-500/15 border-orange-500/30 text-orange-400",
  yellow:  "bg-yellow-500/15 border-yellow-500/30 text-yellow-400",
  purple:  "bg-purple-500/15 border-purple-500/30 text-purple-400",
  gray:    "bg-white/5 border-white/10 text-gray-400",
};

const LINE_COLOR_MAP: Record<string, string> = {
  indigo: "bg-indigo-500/40", blue: "bg-blue-500/40",
  emerald: "bg-emerald-500/40", amber: "bg-amber-500/40",
  orange: "bg-orange-500/40", yellow: "bg-yellow-500/40",
  purple: "bg-purple-500/40", gray: "bg-white/10",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function groupByMonth(events: TimelineEvent[]): { label: string; events: TimelineEvent[] }[] {
  const groups: Record<string, TimelineEvent[]> = {};
  for (const e of events) {
    const d = new Date(e.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(e);
  }
  return Object.entries(groups)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, evs]) => {
      const d = new Date(key + "-01");
      const label = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
      return { label: label.charAt(0).toUpperCase() + label.slice(1), events: evs };
    });
}

const TYPE_ICON: Record<string, React.ElementType> = {
  inicio: Rocket, questao_milestone: Target, simulado: BarChart2,
  streak_milestone: Flame, xp_milestone: Zap, diario: BookOpen,
};

export function TimelineInner() {
  const [events, setEvents]   = useState<TimelineEvent[]>([]);
  const [stats, setStats]     = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/workspace/timeline?limit=80")
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) { setEvents(d.events ?? []); setStats(d.stats ?? null); }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const groups = groupByMonth(events);

  return (
    <div className="min-h-screen text-white p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Activity className="w-6 h-6 text-indigo-400" />
          Linha do Tempo
        </h1>
        <p className="text-gray-500 text-sm mt-0.5">
          Sua jornada de estudos — marcos, simulados e conquistas
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-3 mb-8">
          {[
            { label: "Questões", value: stats.totalQuestoes.toLocaleString("pt-BR"), icon: Target, color: "text-blue-400" },
            { label: "Simulados", value: stats.totalSimulados, icon: BarChart2, color: "text-purple-400" },
            { label: "Sequência", value: `${stats.currentStreak}d`, icon: Flame, color: "text-orange-400" },
            { label: "XP total", value: stats.xp.toLocaleString("pt-BR"), icon: Zap, color: "text-yellow-400" },
          ].map(s => (
            <div key={s.label} className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 text-center">
              <s.icon className={cn("w-4 h-4 mx-auto mb-1", s.color)} />
              <p className={cn("text-base font-black", s.color)}>{s.value}</p>
              <p className="text-[10px] text-gray-600">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {events.length === 0 && (
        <div className="text-center py-14">
          <Activity className="w-12 h-12 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">Nenhum evento ainda</p>
          <p className="text-gray-600 text-sm mt-1">
            Comece a responder questões para construir sua linha do tempo.
          </p>
        </div>
      )}

      {/* Timeline */}
      <div className="space-y-8">
        {groups.map(({ label, events: groupEvents }) => (
          <div key={label}>
            {/* Month header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px flex-1 bg-white/[0.06]" />
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2">
                {label}
              </span>
              <div className="h-px flex-1 bg-white/[0.06]" />
            </div>

            {/* Events */}
            <div className="space-y-3">
              {groupEvents.map((event, i) => {
                const colorCls = COLOR_MAP[event.color] ?? COLOR_MAP.gray;
                const lineCls  = LINE_COLOR_MAP[event.color] ?? "bg-white/10";
                const TypeIcon = TYPE_ICON[event.type] ?? Clock;
                const isLast   = i === groupEvents.length - 1;

                return (
                  <div key={event.id} className="flex gap-4">
                    {/* Left: icon + line */}
                    <div className="flex flex-col items-center flex-shrink-0">
                      <div className={cn(
                        "w-9 h-9 rounded-xl border flex items-center justify-center text-base flex-shrink-0",
                        colorCls
                      )}>
                        {event.icon}
                      </div>
                      {!isLast && (
                        <div className={cn("w-0.5 flex-1 mt-1 min-h-3", lineCls)} />
                      )}
                    </div>

                    {/* Right: content */}
                    <div className="flex-1 min-w-0 pb-1">
                      <div className="flex items-start justify-between gap-2 mb-0.5">
                        <p className="text-sm font-semibold text-white leading-tight">{event.title}</p>
                        <span className="text-[10px] text-gray-600 flex-shrink-0 mt-0.5 font-mono">
                          {new Date(event.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 leading-relaxed">{event.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
