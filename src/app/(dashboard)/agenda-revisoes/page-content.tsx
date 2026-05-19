"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  CalendarDays, RotateCcw, ChevronRight,
  BookOpen, AlertTriangle, Play,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AgendaDay { date: string; count: number }
interface SubjectBreak { subjectId: string; subjectName: string; count: number }
interface AgendaData {
  agenda: AgendaDay[];
  overdueCount: number;
  totalNext7: number;
  selectedDate: string | null;
  subjectBreakdown: SubjectBreak[];
}

const DAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTH_SHORT = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];

function fmtDate(iso: string) {
  const d = new Date(iso + "T12:00:00Z");
  return `${d.getUTCDate()} ${MONTH_SHORT[d.getUTCMonth()]}`;
}

function dayName(iso: string) {
  const d = new Date(iso + "T12:00:00Z");
  return DAY_NAMES[d.getUTCDay()];
}

function isToday(iso: string) {
  return iso === new Date().toISOString().slice(0, 10);
}

function intensityColor(count: number, max: number) {
  if (count === 0) return "bg-white/[0.04] border-white/[0.06]";
  const pct = count / Math.max(max, 1);
  if (pct >= 0.75) return "bg-indigo-500/60 border-indigo-400/50";
  if (pct >= 0.40) return "bg-indigo-500/35 border-indigo-400/30";
  return "bg-indigo-500/15 border-indigo-400/20";
}

export function AgendaRevisoesInner() {
  const [data, setData]       = useState<AgendaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    fetch("/api/revisao/agenda")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function selectDay(date: string) {
    if (selected === date) { setSelected(null); return; }
    setSelected(date);
    setDetailLoading(true);
    const res = await fetch(`/api/revisao/agenda?date=${date}`);
    if (res.ok) {
      const d: AgendaData = await res.json();
      setData(prev => prev ? { ...prev, subjectBreakdown: d.subjectBreakdown, selectedDate: d.selectedDate } : prev);
    }
    setDetailLoading(false);
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen text-white">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-400">Carregando agenda...</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const maxCount = Math.max(...data.agenda.map(d => d.count), 1);
  const today = new Date().toISOString().slice(0, 10);
  const todayCount = (data.agenda.find(d => d.date === today)?.count ?? 0) + data.overdueCount;

  // Build practice URL for selected day
  function practiceUrl(date: string | null): string {
    if (!date) return "/revisao";
    if (date === today) return "/revisao";
    // For future days, link to /questoes with SM-2 filter (best approximation)
    return "/revisao";
  }

  return (
    <div className="min-h-screen text-white p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-indigo-400" />
            Agenda de Revisões
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Próximas revisões pelo sistema SM-2
          </p>
        </div>
        <Link
          href="/revisao"
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-sm font-semibold transition-colors"
        >
          <Play className="w-4 h-4" />
          Revisar agora
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className={cn(
          "rounded-xl border p-4 text-center",
          data.overdueCount > 0
            ? "bg-red-500/[0.06] border-red-500/20"
            : "bg-white/[0.03] border-white/[0.06]"
        )}>
          {data.overdueCount > 0 && (
            <AlertTriangle className="w-4 h-4 text-red-400 mx-auto mb-1" />
          )}
          <p className={cn("text-2xl font-black", data.overdueCount > 0 ? "text-red-400" : "text-gray-400")}>
            {data.overdueCount}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">Atrasadas</p>
        </div>
        <div className="rounded-xl bg-indigo-500/[0.06] border border-indigo-500/20 p-4 text-center">
          <p className="text-2xl font-black text-indigo-400">{todayCount}</p>
          <p className="text-xs text-gray-500 mt-0.5">Para hoje</p>
        </div>
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 text-center">
          <p className="text-2xl font-black text-white">{data.totalNext7}</p>
          <p className="text-xs text-gray-500 mt-0.5">Próximos 7d</p>
        </div>
      </div>

      {/* Overdue alert */}
      {data.overdueCount > 0 && (
        <div className="rounded-xl bg-red-500/[0.06] border border-red-500/20 p-4 mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-300">
                {data.overdueCount} questão{data.overdueCount !== 1 ? "ões" : ""} atrasada{data.overdueCount !== 1 ? "s" : ""}
              </p>
              <p className="text-xs text-gray-500">Pendentes de revisão — acumular pode prejudicar a memorização</p>
            </div>
          </div>
          <Link href="/revisao"
            className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-xs font-semibold text-white transition-colors flex-shrink-0">
            <RotateCcw className="w-3.5 h-3.5" />
            Revisar
          </Link>
        </div>
      )}

      {/* Calendar strip */}
      <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-5 mb-6">
        <h3 className="text-sm font-semibold text-gray-400 mb-4">Próximos 14 dias</h3>
        <div className="grid grid-cols-7 gap-2">
          {data.agenda.map(day => {
            const isSelected = selected === day.date;
            const today2 = isToday(day.date);
            return (
              <button
                key={day.date}
                onClick={() => selectDay(day.date)}
                className={cn(
                  "flex flex-col items-center gap-1 p-2 rounded-xl border transition-all",
                  isSelected
                    ? "border-indigo-500/50 bg-indigo-500/15"
                    : intensityColor(day.count, maxCount),
                  today2 && !isSelected && "ring-1 ring-indigo-400/40",
                  "hover:border-indigo-400/40 hover:bg-indigo-500/10"
                )}
              >
                <span className={cn(
                  "text-[10px] font-medium",
                  today2 ? "text-indigo-400" : "text-gray-500"
                )}>
                  {dayName(day.date)}
                </span>
                <span className={cn(
                  "text-xs font-bold",
                  today2 ? "text-indigo-300" : day.count > 0 ? "text-white" : "text-gray-600"
                )}>
                  {fmtDate(day.date).split(" ")[0]}
                </span>
                <span className={cn(
                  "text-[11px] font-black",
                  day.count === 0 ? "text-gray-700"
                    : day.count >= maxCount * 0.75 ? "text-indigo-300"
                    : "text-indigo-400"
                )}>
                  {day.count > 0 ? day.count : "·"}
                </span>
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-3 mt-3 justify-end">
          <div className="flex items-center gap-1.5 text-[10px] text-gray-600">
            <div className="w-3 h-3 rounded bg-white/[0.04] border border-white/[0.06]" />
            Sem revisões
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-gray-600">
            <div className="w-3 h-3 rounded bg-indigo-500/15 border border-indigo-400/20" />
            Poucas
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-gray-600">
            <div className="w-3 h-3 rounded bg-indigo-500/60 border border-indigo-400/50" />
            Muitas
          </div>
        </div>
      </div>

      {/* Day detail */}
      {selected && (
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">
                {isToday(selected) ? "Hoje" : dayName(selected)} · {fmtDate(selected)}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {(data.agenda.find(d => d.date === selected)?.count ?? 0) + (isToday(selected) ? data.overdueCount : 0)} questões para revisar
              </p>
            </div>
            <Link
              href={practiceUrl(selected)}
              className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-xs font-semibold transition-colors"
            >
              <Play className="w-3.5 h-3.5" />
              Praticar
            </Link>
          </div>

          {detailLoading ? (
            <div className="flex justify-center py-6">
              <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : data.subjectBreakdown.length > 0 ? (
            <div className="space-y-2">
              {data.subjectBreakdown.map(s => {
                const dayTotal = (data.agenda.find(d => d.date === selected)?.count ?? 0) +
                  (isToday(selected) ? data.overdueCount : 0);
                const pct = dayTotal > 0 ? Math.round((s.count / dayTotal) * 100) : 0;
                return (
                  <div key={s.subjectId} className="flex items-center gap-3">
                    <BookOpen className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-xs mb-0.5">
                        <span className="text-gray-300 truncate">{s.subjectName}</span>
                        <span className="text-gray-500 ml-2 flex-shrink-0">{s.count}</span>
                      </div>
                      <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full rounded-full bg-indigo-500 transition-all"
                          style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <Link
                      href={`/questoes?subjectId=${s.subjectId}&erros=0`}
                      className="text-gray-600 hover:text-indigo-400 transition-colors flex-shrink-0"
                      title="Praticar esta matéria"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-sm text-gray-600 py-4">
              Nenhuma revisão agendada para este dia
            </p>
          )}
        </div>
      )}

      {/* Empty state */}
      {data.totalNext7 === 0 && data.overdueCount === 0 && (
        <div className="text-center py-12">
          <CalendarDays className="w-12 h-12 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">Agenda limpa!</p>
          <p className="text-gray-600 text-sm mt-1">
            Continue respondendo questões para construir seu calendário de revisões.
          </p>
          <Link href="/questoes"
            className="inline-flex items-center gap-2 mt-4 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-sm font-medium transition-colors">
            <BookOpen className="w-4 h-4" />
            Responder questões
          </Link>
        </div>
      )}
    </div>
  );
}
