"use client";
import { useState, useEffect } from "react";
import { TourGuide } from "@/components/tour/tour-guide";
import { METAS_STEPS } from "@/components/tour/tour-steps";
import {
  Target, BookOpen, Clock, Zap, Save,
  CheckCircle, TrendingUp, BarChart2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Metas {
  questoesMeta: number;
  flashcardsMeta: number;
  simuladosMeta: number;
  horasEstudoMeta: number;
}

interface Progresso {
  questoes: number;
  flashcards: number;
  simulados: number;
  horasEstudo: number;
}

interface MetasData {
  metas: Metas;
  progresso: Progresso;
  semanaInicio: string;
}

interface GoalItem {
  key: keyof Metas;
  progressKey: keyof Progresso;
  label: string;
  unit: string;
  icon: React.ReactNode;
  color: string;
  step: number;
  min: number;
  max: number;
}

const GOALS: GoalItem[] = [
  {
    key: "questoesMeta", progressKey: "questoes",
    label: "Questões", unit: "questões/semana",
    icon: <BookOpen className="w-4 h-4" />, color: "#6366f1",
    step: 10, min: 10, max: 500,
  },
  {
    key: "horasEstudoMeta", progressKey: "horasEstudo",
    label: "Horas de estudo", unit: "horas/semana",
    icon: <Clock className="w-4 h-4" />, color: "#10b981",
    step: 1, min: 1, max: 40,
  },
  {
    key: "flashcardsMeta", progressKey: "flashcards",
    label: "Flashcards", unit: "cards/semana",
    icon: <Zap className="w-4 h-4" />, color: "#f59e0b",
    step: 5, min: 5, max: 200,
  },
  {
    key: "simuladosMeta", progressKey: "simulados",
    label: "Simulados", unit: "simulados/semana",
    icon: <Target className="w-4 h-4" />, color: "#8b5cf6",
    step: 1, min: 1, max: 10,
  },
];

function getWeekLabel(isoStart: string) {
  const start = new Date(isoStart);
  const end = new Date(start.getTime() + 6 * 86400000);
  const fmt = (d: Date) => d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  return `${fmt(start)} – ${fmt(end)}`;
}

function GoalCard({ goal, current, target, editing, onEdit }: {
  goal: GoalItem;
  current: number;
  target: number;
  editing: boolean;
  onEdit: (val: number) => void;
}) {
  const pct    = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
  const done   = pct >= 100;
  const near   = pct >= 70 && !done;

  return (
    <div className={cn(
      "rounded-xl border p-5 transition-all",
      done
        ? "bg-green-500/[0.05] border-green-500/20"
        : "bg-white/[0.03] border-white/[0.06]"
    )}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2" style={{ color: goal.color }}>
          {goal.icon}
          <span className="text-sm font-semibold text-white">{goal.label}</span>
        </div>
        {done && <CheckCircle className="w-4 h-4 text-green-400" />}
        {near && !done && (
          <span className="text-[10px] text-orange-400 font-semibold animate-pulse">Quase lá!</span>
        )}
      </div>

      {/* Progress ring */}
      <div className="flex items-center gap-5 mb-4">
        <div className="relative w-16 h-16 flex-shrink-0">
          <svg width="64" height="64" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
            <circle cx="32" cy="32" r="26" fill="none"
              stroke={done ? "#10b981" : goal.color}
              strokeWidth="6"
              strokeDasharray={`${(pct / 100) * 2 * Math.PI * 26} ${2 * Math.PI * 26}`}
              strokeLinecap="round"
              style={{ transition: "stroke-dasharray 0.6s ease" }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={cn("text-xs font-black", done ? "text-green-400" : "text-white")}>{pct}%</span>
          </div>
        </div>

        <div className="flex-1">
          <div className="text-2xl font-black text-white">
            {goal.key === "horasEstudoMeta"
              ? current.toFixed(1)
              : current.toLocaleString("pt-BR")}
          </div>
          <div className="text-xs text-gray-500">
            de {target} {goal.unit.split("/")[0]}
          </div>
        </div>
      </div>

      {/* Goal editor */}
      {editing ? (
        <div className="flex items-center gap-2">
          <button
            onClick={() => onEdit(Math.max(goal.min, target - goal.step))}
            className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white text-lg font-bold flex items-center justify-center transition-colors"
          >−</button>
          <div className="flex-1 text-center">
            <span className="text-sm font-bold text-white">{target}</span>
            <span className="text-xs text-gray-600 ml-1">{goal.unit}</span>
          </div>
          <button
            onClick={() => onEdit(Math.min(goal.max, target + goal.step))}
            className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white text-lg font-bold flex items-center justify-center transition-colors"
          >+</button>
        </div>
      ) : (
        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${pct}%`,
              background: done ? "#10b981" : goal.color,
            }}
          />
        </div>
      )}
    </div>
  );
}

export default function MetasPage() {
  const [data, setData]       = useState<MetasData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState<Metas | null>(null);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);

  useEffect(() => {
    fetch("/api/workspace/metas")
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) { setData(d); setDraft(d.metas); }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function saveMetas() {
    if (!draft) return;
    setSaving(true);
    const res = await fetch("/api/workspace/metas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    }).catch(() => null);
    if (res?.ok) {
      const d = await res.json();
      setData(prev => prev ? { ...prev, metas: d.metas } : prev);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
    setSaving(false);
    setEditing(false);
  }

  function updateDraft(key: keyof Metas, val: number) {
    setDraft(prev => prev ? { ...prev, [key]: val } : prev);
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen text-white">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-400">Carregando metas...</p>
        </div>
      </div>
    );
  }

  if (!data || !draft) return null;

  const metas    = editing ? draft : data.metas;
  const progress = data.progresso;

  // Overall completion
  const completedGoals = GOALS.filter(g => {
    const cur = progress[g.progressKey];
    const tgt = metas[g.key];
    return cur >= tgt;
  }).length;
  const overallPct = Math.round((completedGoals / GOALS.length) * 100);

  return (
    <div className="min-h-screen text-white p-6 max-w-4xl mx-auto">
      <TourGuide tourId="metas" steps={METAS_STEPS} autoStart buttonLabel="Tour: Metas" />
      {/* Header */}
      <div id="tour-metas-header" className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Target className="w-6 h-6 text-green-400" />
            Metas Semanais
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {data.semanaInicio ? getWeekLabel(data.semanaInicio) : "Semana atual"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <button
                onClick={() => { setEditing(false); setDraft(data.metas); }}
                className="px-4 py-2 rounded-xl text-sm border border-white/10 text-gray-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={saveMetas}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
              >
                {saving
                  ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <Save className="w-4 h-4" />
                }
                Salvar metas
              </button>
            </>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-2 px-4 py-2 border border-white/10 rounded-xl text-sm text-gray-400 hover:text-white transition-colors"
            >
              <TrendingUp className="w-4 h-4" />
              Editar metas
            </button>
          )}
        </div>
      </div>

      {/* Saved toast */}
      {saved && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-500/20 border border-green-500/30 text-green-300 text-sm font-medium shadow-xl">
          <CheckCircle className="w-4 h-4" />
          Metas salvas!
        </div>
      )}

      {/* Weekly overview */}
      <div id="tour-metas-progresso" className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-gray-300 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-green-400" />
            Progresso geral da semana
          </span>
          <span className={cn("text-sm font-bold",
            overallPct === 100 ? "text-green-400" : overallPct >= 50 ? "text-amber-400" : "text-gray-400"
          )}>
            {completedGoals}/{GOALS.length} metas
          </span>
        </div>
        <div className="h-2 rounded-full bg-white/10 overflow-hidden mb-2">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${overallPct}%`,
              background: overallPct === 100
                ? "#10b981"
                : "linear-gradient(90deg, #6366f1, #8b5cf6)",
            }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-600">
          <span>{overallPct}% concluído</span>
          {overallPct === 100 && (
            <span className="text-green-400 font-semibold">🎉 Todas as metas alcançadas!</span>
          )}
        </div>
      </div>

      {/* Goal cards grid */}
      {editing && (
        <div className="mb-4 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-sm text-indigo-300">
          Use os botões + / − para ajustar suas metas semanais, depois salve.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {GOALS.map(goal => (
          <GoalCard
            key={goal.key}
            goal={goal}
            current={progress[goal.progressKey] as number}
            target={metas[goal.key] as number}
            editing={editing}
            onEdit={(val) => updateDraft(goal.key, val)}
          />
        ))}
      </div>

      {/* Daily breakdown for questions */}
      <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">📅 Meta diária derivada</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-white/5 p-4">
            <p className="text-xs text-gray-500 mb-1">Questões por dia</p>
            <p className="text-2xl font-black text-indigo-400">
              {Math.ceil((metas.questoesMeta) / 5)}
            </p>
            <p className="text-xs text-gray-600">dias úteis</p>
          </div>
          <div className="rounded-lg bg-white/5 p-4">
            <p className="text-xs text-gray-500 mb-1">Horas por dia</p>
            <p className="text-2xl font-black text-green-400">
              {(metas.horasEstudoMeta / 7).toFixed(1)}h
            </p>
            <p className="text-xs text-gray-600">todos os dias</p>
          </div>
        </div>
        <p className="text-xs text-gray-600 mt-4">
          💡 As metas diárias são calculadas automaticamente a partir das metas semanais.
          Você pode ajustar as metas semanais clicando em &quot;Editar metas&quot;.
        </p>
      </div>
    </div>
  );
}
