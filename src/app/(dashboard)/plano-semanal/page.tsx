"use client";
import { useState, useEffect } from "react";
import { CalendarDays, Sparkles, RefreshCw, Clock, ChevronDown, ChevronUp, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface DaySubject {
  nome: string;
  horas: number;
  prioridade: "alta" | "media" | "baixa";
  dica: string;
}

interface DaySchedule {
  dia: string;
  materias: DaySubject[];
  totalHoras: number;
  folga?: boolean;
}

interface Cronograma {
  semana: DaySchedule[];
  resumo: string;
  metaSemanal: string;
  horasTotais: number;
  geradoEm: string;
}

const PRIORITY_STYLE: Record<string, string> = {
  alta:  "bg-red-500/10 border-red-500/20 text-red-400",
  media: "bg-yellow-500/10 border-yellow-500/20 text-yellow-400",
  baixa: "bg-green-500/10 border-green-500/20 text-green-400",
};
const PRIORITY_LABEL: Record<string, string> = {
  alta: "Alta", media: "Média", baixa: "Baixa",
};

const DIAS_SEMANA = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

function DayCard({ day, defaultOpen }: { day: DaySchedule; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  if (day.folga || day.materias.length === 0) {
    return (
      <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
          <span className="text-lg">😴</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-400">{day.dia}</p>
          <p className="text-xs text-gray-600">Dia de descanso — recupere as energias!</p>
        </div>
      </div>
    );
  }

  const doneCount = Object.values(checked).filter(Boolean).length;
  const allDone = doneCount === day.materias.length && day.materias.length > 0;

  return (
    <div className={cn(
      "rounded-xl border overflow-hidden transition-all",
      allDone ? "bg-emerald-500/[0.04] border-emerald-500/15" : "bg-white/[0.03] border-white/[0.06]"
    )}>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/[0.02] transition-colors"
      >
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold",
          allDone ? "bg-emerald-500/15 text-emerald-400" : "bg-indigo-600/15 text-indigo-400"
        )}>
          {allDone ? <CheckCircle className="w-5 h-5" /> : day.dia.slice(0, 3)}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">{day.dia}</p>
          <p className="text-xs text-gray-500">
            {day.materias.length} matéria{day.materias.length !== 1 ? "s" : ""} · {day.totalHoras}h de estudo
            {doneCount > 0 && !allDone && ` · ${doneCount}/${day.materias.length} concluídas`}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex items-center gap-1 text-xs text-gray-600">
            <Clock className="w-3 h-3" />{day.totalHoras}h
          </div>
          {open ? <ChevronUp className="w-4 h-4 text-gray-600" /> : <ChevronDown className="w-4 h-4 text-gray-600" />}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/[0.04]">
          {day.materias.map((m, i) => {
            const done = checked[m.nome] ?? false;
            return (
              <div
                key={i}
                className={cn(
                  "rounded-xl border p-3 transition-all",
                  done ? "bg-emerald-500/[0.04] border-emerald-500/15 opacity-60" : "bg-white/[0.02] border-white/[0.04]"
                )}
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => setChecked(prev => ({ ...prev, [m.nome]: !done }))}
                    className={cn(
                      "w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 mt-0.5 transition-all",
                      done ? "bg-emerald-500 border-emerald-500" : "border-white/20 hover:border-indigo-400"
                    )}
                  >
                    {done && <CheckCircle className="w-3 h-3 text-white" />}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className={cn("text-sm font-semibold", done ? "line-through text-gray-600" : "text-white")}>
                        {m.nome}
                      </p>
                      <span className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded-full border font-medium",
                        PRIORITY_STYLE[m.prioridade]
                      )}>
                        {PRIORITY_LABEL[m.prioridade]}
                      </span>
                      <span className="text-[10px] text-gray-600 flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" />{m.horas}h
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">{m.dica}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function PlanoSemanalPage() {
  const [cronograma, setCronograma] = useState<Cronograma | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Config
  const [horasPorDia, setHorasPorDia] = useState(3);
  const [diasDisp, setDiasDisp] = useState<string[]>(["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"]);
  const [showConfig, setShowConfig] = useState(false);

  useEffect(() => {
    // Try to load cached plan from localStorage
    const cached = localStorage.getItem("plano-semanal");
    if (cached) {
      try {
        const p: Cronograma = JSON.parse(cached);
        // Only use if generated this week
        const genDate = new Date(p.geradoEm);
        const now = new Date();
        const daysSince = (now.getTime() - genDate.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSince < 7) {
          setCronograma(p);
          return;
        }
      } catch { /* ignore */ }
    }
  }, []);

  async function generate() {
    setGenerating(true);
    const res = await fetch("/api/workspace/estrategia", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ horasPorDia, diasDisp }),
    });
    if (res.ok) {
      const d: Cronograma = await res.json();
      setCronograma(d);
      localStorage.setItem("plano-semanal", JSON.stringify(d));
    }
    setGenerating(false);
    setShowConfig(false);
    setLoading(false);
  }

  function toggleDia(dia: string) {
    setDiasDisp(prev =>
      prev.includes(dia) ? prev.filter(d => d !== dia) : [...prev, dia]
    );
  }

  const today = new Date().toLocaleDateString("pt-BR", { weekday: "long" });
  const todayPt = today.charAt(0).toUpperCase() + today.slice(1).replace("-feira", "");

  // Reorder days starting from today
  const todayIdx = DIAS_SEMANA.findIndex(d =>
    todayPt.toLowerCase().startsWith(d.toLowerCase().slice(0, 4))
  );
  const orderedDays = cronograma
    ? [...cronograma.semana].sort((a, b) => {
        const ai = DIAS_SEMANA.indexOf(a.dia);
        const bi = DIAS_SEMANA.indexOf(b.dia);
        const ai2 = ai < todayIdx ? ai + 7 : ai;
        const bi2 = bi < todayIdx ? bi + 7 : bi;
        return ai2 - bi2;
      })
    : [];

  return (
    <div className="min-h-screen text-white p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-indigo-400" />
            Plano Semanal IA
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Cronograma personalizado gerado com base no seu perfil e matérias
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowConfig(v => !v)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:border-white/20 text-xs font-medium transition-colors"
          >
            ⚙️ Config
          </button>
          <button
            onClick={generate}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 rounded-xl text-sm font-semibold transition-colors"
          >
            {generating ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {cronograma ? "Regerar" : "Gerar plano"}
          </button>
        </div>
      </div>

      {/* Config panel */}
      {showConfig && (
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5 mb-6">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Configurar disponibilidade</h3>

          <div className="mb-4">
            <label className="text-xs text-gray-500 mb-2 block">
              Horas por dia: <span className="text-white font-bold">{horasPorDia}h</span>
            </label>
            <input
              type="range" min={1} max={8} value={horasPorDia}
              onChange={e => setHorasPorDia(Number(e.target.value))}
              className="w-full accent-indigo-500"
            />
            <div className="flex justify-between text-[10px] text-gray-600 mt-0.5">
              <span>1h</span><span>8h</span>
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-2 block">Dias disponíveis</label>
            <div className="flex flex-wrap gap-2">
              {DIAS_SEMANA.map(dia => (
                <button
                  key={dia}
                  onClick={() => toggleDia(dia)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                    diasDisp.includes(dia)
                      ? "bg-indigo-600/20 border-indigo-500/30 text-indigo-300"
                      : "border-white/[0.06] text-gray-600 hover:border-white/15"
                  )}
                >
                  {dia}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!cronograma && !generating && (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8 text-indigo-400" />
          </div>
          <h2 className="text-lg font-bold text-gray-300 mb-2">Nenhum plano gerado ainda</h2>
          <p className="text-gray-600 text-sm max-w-sm mx-auto mb-6">
            Gere seu cronograma personalizado com base nas suas matérias, cargo-alvo e disponibilidade semanal.
          </p>
          <button
            onClick={generate}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 mx-auto"
          >
            <Sparkles className="w-4 h-4" />
            Gerar meu plano da semana
          </button>
        </div>
      )}

      {/* Generating */}
      {generating && (
        <div className="text-center py-16">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Gerando plano personalizado com IA...</p>
          <p className="text-gray-600 text-xs mt-1">Isso pode levar alguns segundos</p>
        </div>
      )}

      {/* Plan */}
      {cronograma && !generating && (
        <>
          {/* Summary card */}
          <div className="rounded-2xl bg-indigo-600/[0.06] border border-indigo-500/15 p-5 mb-5">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <p className="text-sm font-semibold text-indigo-300 mb-1">{cronograma.metaSemanal}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{cronograma.resumo}</p>
              </div>
              <div className="text-center flex-shrink-0">
                <p className="text-2xl font-black text-indigo-400">{cronograma.horasTotais}h</p>
                <p className="text-[10px] text-gray-600">na semana</p>
              </div>
            </div>
            <p className="text-[10px] text-gray-700">
              Gerado em {new Date(cronograma.geradoEm).toLocaleDateString("pt-BR", {
                day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
              })}
            </p>
          </div>

          {/* Day cards */}
          <div className="space-y-3">
            {orderedDays.map((day, i) => (
              <DayCard key={day.dia} day={day} defaultOpen={i === 0} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
