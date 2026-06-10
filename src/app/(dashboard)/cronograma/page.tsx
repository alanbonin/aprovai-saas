"use client";
import { useState, useEffect } from "react";
import { Calendar, Check, Plus, Trash2, RotateCcw, Clock, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { TourGuide } from "@/components/tour/tour-guide";
import { CRONOGRAMA_STEPS } from "@/components/tour/tour-steps";

// ── Tipos ──────────────────────────────────────────────────────────────────────
interface Bloco {
  dia: string;
  hora: string;
  durMin: number;
  subjectId: string | null;
  atividade: string;
  concluido?: boolean;
}

interface Plano {
  blocos: Bloco[];
  geradoEm: string;
}

interface Subject { id: string; name: string; }

// ── Constantes ─────────────────────────────────────────────────────────────────
const DIAS = [
  { key: "seg", label: "Seg" }, { key: "ter", label: "Ter" },
  { key: "qua", label: "Qua" }, { key: "qui", label: "Qui" },
  { key: "sex", label: "Sex" }, { key: "sab", label: "Sáb" },
  { key: "dom", label: "Dom" },
] as const;

const ATIVIDADES = ["Questões", "Flashcards", "Leitura", "Revisão", "Simulado", "Redação"] as const;

const ATIVIDADE_COLORS: Record<string, string> = {
  "Questões":   "bg-indigo-500/15 border-indigo-500/30 text-indigo-300",
  "Flashcards": "bg-emerald-500/15 border-emerald-500/30 text-emerald-300",
  "Leitura":    "bg-blue-500/15 border-blue-500/30 text-blue-300",
  "Revisão":    "bg-amber-500/15 border-amber-500/30 text-amber-300",
  "Simulado":   "bg-purple-500/15 border-purple-500/30 text-purple-300",
  "Redação":    "bg-rose-500/15 border-rose-500/30 text-rose-300",
};

const TODAY_DIA = (() => {
  const d = new Date().getDay(); // 0=dom
  return ["dom","seg","ter","qua","qui","sex","sab"][d];
})();

// ── Main ───────────────────────────────────────────────────────────────────────
export default function CronogramaPage() {
  const [plano, setPlano]       = useState<Plano | null>(null);
  const [loading, setLoading]   = useState(true);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [activeDia, setActiveDia] = useState(TODAY_DIA);
  const [saving, setSaving]     = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // Formulário de adicionar bloco
  const [newHora, setNewHora]       = useState("08:00");
  const [newDurMin, setNewDurMin]   = useState(60);
  const [newSubject, setNewSubject] = useState("");
  const [newAtividade, setNewAtividade] = useState<string>("Questões");

  useEffect(() => {
    Promise.all([
      fetch("/api/plano-estudos").then(r => r.ok ? r.json() : null),
      fetch("/api/workspace/materias").then(r => r.ok ? r.json() : null),
    ]).then(([planoData, matData]) => {
      if (planoData) setPlano(planoData as Plano);
      if (matData?.subjects) setSubjects(matData.subjects as Subject[]);
      setLoading(false);
    });
  }, []);

  async function toggleBloco(bloco: Bloco) {
    const res = await fetch("/api/plano-estudos", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toggleBloco: { dia: bloco.dia, hora: bloco.hora } }),
    });
    if (res.ok) setPlano(await res.json() as Plano);
  }

  async function addBloco() {
    if (!plano) return;
    setSaving(true);
    const newBloco: Bloco = {
      dia: activeDia,
      hora: newHora,
      durMin: newDurMin,
      subjectId: newSubject || null,
      atividade: newAtividade,
      concluido: false,
    };
    const blocos = [...plano.blocos, newBloco].sort((a, b) => {
      if (a.dia !== b.dia) {
        const order = ["seg","ter","qua","qui","sex","sab","dom"];
        return order.indexOf(a.dia) - order.indexOf(b.dia);
      }
      return a.hora.localeCompare(b.hora);
    });
    const res = await fetch("/api/plano-estudos", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blocos }),
    });
    if (res.ok) setPlano(await res.json() as Plano);
    setShowAddForm(false);
    setSaving(false);
  }

  async function removeBloco(bloco: Bloco) {
    if (!plano) return;
    const blocos = plano.blocos.filter(b => !(b.dia === bloco.dia && b.hora === bloco.hora && b.atividade === bloco.atividade));
    const res = await fetch("/api/plano-estudos", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blocos }),
    });
    if (res.ok) setPlano(await res.json() as Plano);
  }

  async function resetPlano() {
    if (!confirm("Apagar plano atual e gerar um novo?")) return;
    await fetch("/api/plano-estudos", { method: "DELETE" });
    setLoading(true);
    const res = await fetch("/api/plano-estudos");
    if (res.ok) setPlano(await res.json() as Plano);
    setLoading(false);
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!plano) return null;

  const blocosDia = (plano.blocos ?? []).filter(b => b.dia === activeDia)
    .sort((a, b) => a.hora.localeCompare(b.hora));

  const totalMinHoje = blocosDia.reduce((s, b) => s + b.durMin, 0);
  const concluidos = blocosDia.filter(b => b.concluido).length;

  const subjectName = (id: string | null) =>
    id ? (subjects.find(s => s.id === id)?.name ?? "Matéria") : "Livre";

  // Stats da semana
  const totalBlocos = plano.blocos.length;
  const totalConcluidos = plano.blocos.filter(b => b.concluido).length;
  const pct = totalBlocos > 0 ? Math.round((totalConcluidos / totalBlocos) * 100) : 0;

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto text-white">
      <TourGuide tourId="cronograma" steps={CRONOGRAMA_STEPS} autoStart buttonLabel="Tour: Cronograma" />
      {/* Header */}
      <div id="tour-cronograma-plano" className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-indigo-400" />
          <div>
            <h1 className="text-xl font-bold">Cronograma</h1>
            <p className="text-gray-500 text-sm">{totalConcluidos}/{totalBlocos} blocos concluídos esta semana</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/api/plano-estudos/export"
            download="cronograma-aprovai.ics"
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-indigo-400 transition-colors px-2 py-1.5 rounded-lg hover:bg-white/5"
            title="Exportar para Google Calendar / iCal"
          >
            <Download className="w-3.5 h-3.5" /> Exportar
          </a>
          <button id="tour-cronograma-ajuste" onClick={resetPlano}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors px-2 py-1.5 rounded-lg hover:bg-white/5">
            <RotateCcw className="w-3.5 h-3.5" /> Resetar
          </button>
        </div>
      </div>

      {/* Progresso semanal */}
      <div className="rounded-xl bg-white/5 border border-white/10 p-4 mb-5">
        <div className="flex justify-between text-xs mb-2">
          <span className="text-gray-400">Progresso da semana</span>
          <span className={cn("font-bold", pct >= 70 ? "text-green-400" : pct >= 40 ? "text-yellow-400" : "text-gray-400")}>{pct}%</span>
        </div>
        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
          <div className={cn("h-full rounded-full transition-all", pct >= 70 ? "bg-green-500" : pct >= 40 ? "bg-yellow-500" : "bg-indigo-500")}
            style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Seletor de dia */}
      <div id="tour-cronograma-semana" className="flex gap-1 mb-5 overflow-x-auto pb-1">
        {DIAS.map(({ key, label }) => {
          const blocos = plano.blocos.filter(b => b.dia === key);
          const isToday = key === TODAY_DIA;
          const isActive = key === activeDia;
          return (
            <button key={key} onClick={() => setActiveDia(key)}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-xs font-medium flex-shrink-0 transition-all border min-w-[52px]",
                isActive
                  ? "bg-indigo-600/20 border-indigo-500/40 text-indigo-300"
                  : isToday
                  ? "bg-white/5 border-white/20 text-white"
                  : "bg-white/3 border-white/5 text-gray-500 hover:text-gray-300"
              )}>
              {label}
              {blocos.length > 0 && (
                <div className="flex gap-0.5">
                  {blocos.map((b, i) => (
                    <div key={i} className={cn("w-1 h-1 rounded-full", b.concluido ? "bg-green-400" : "bg-indigo-400")} />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Blocos do dia */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">
            {DIAS.find(d => d.key === activeDia)?.label}
            {activeDia === TODAY_DIA && <span className="ml-2 text-xs text-indigo-400 font-normal">· hoje</span>}
            <span className="ml-2 text-xs text-gray-500 font-normal">
              {totalMinHoje >= 60 ? `${Math.floor(totalMinHoje / 60)}h${totalMinHoje % 60 > 0 ? `${totalMinHoje % 60}min` : ""}` : `${totalMinHoje}min`} · {concluidos}/{blocosDia.length}
            </span>
          </h2>
          <button onClick={() => setShowAddForm(v => !v)}
            className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
            <Plus className="w-3.5 h-3.5" /> Adicionar
          </button>
        </div>

        {blocosDia.length === 0 && !showAddForm && (
          <div className="text-center py-8 rounded-xl border border-white/5 bg-white/2">
            <p className="text-gray-500 text-sm">Nenhum bloco para hoje</p>
            <button onClick={() => setShowAddForm(true)}
              className="mt-2 text-xs text-indigo-400 hover:text-indigo-300">
              + Adicionar bloco
            </button>
          </div>
        )}

        <div className="space-y-2">
          {blocosDia.map((bloco, i) => {
            const colorCls = ATIVIDADE_COLORS[bloco.atividade] ?? "bg-white/5 border-white/10 text-gray-300";
            return (
              <div key={i} className={cn(
                "flex items-center gap-3 p-3 rounded-xl border transition-all",
                bloco.concluido ? "opacity-50 bg-white/3 border-white/5" : "bg-white/5 border-white/10"
              )}>
                <button onClick={() => toggleBloco(bloco)}
                  className={cn(
                    "w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all",
                    bloco.concluido
                      ? "bg-green-500 border-green-500"
                      : "border-white/20 hover:border-green-400"
                  )}>
                  {bloco.concluido && <Check className="w-3.5 h-3.5 text-white" />}
                </button>
                <div className="flex items-center gap-2 flex-shrink-0 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />
                  <span>{bloco.hora}</span>
                  <span className="text-gray-700">·</span>
                  <span>{bloco.durMin}min</span>
                </div>
                <div className="flex-1 min-w-0">
                  <span className={cn("text-[11px] px-2 py-0.5 rounded-full border font-medium", colorCls)}>
                    {bloco.atividade}
                  </span>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{subjectName(bloco.subjectId)}</p>
                </div>
                <button onClick={() => removeBloco(bloco)}
                  className="text-gray-700 hover:text-red-400 transition-colors flex-shrink-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Formulário de adicionar */}
        {showAddForm && (
          <div className="mt-3 rounded-xl bg-white/5 border border-white/10 p-4 space-y-3">
            <h3 className="text-xs font-semibold text-gray-400">Novo bloco — {DIAS.find(d => d.key === activeDia)?.label}</h3>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-gray-500 mb-1 block">Horário</label>
                <input type="time" value={newHora} onChange={e => setNewHora(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 mb-1 block">Duração (min)</label>
                <input type="number" min={15} max={240} step={15} value={newDurMin} onChange={e => setNewDurMin(Number(e.target.value))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500" />
              </div>
            </div>
            <div>
              <label className="text-[10px] text-gray-500 mb-1 block">Atividade</label>
              <select value={newAtividade} onChange={e => setNewAtividade(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500">
                {ATIVIDADES.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            {subjects.length > 0 && (
              <div>
                <label className="text-[10px] text-gray-500 mb-1 block">Matéria (opcional)</label>
                <select value={newSubject} onChange={e => setNewSubject(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500">
                  <option value="">Livre / Sem matéria</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <button onClick={() => setShowAddForm(false)}
                className="flex-1 py-1.5 rounded-lg border border-white/10 text-xs text-gray-400 hover:text-white">
                Cancelar
              </button>
              <button onClick={addBloco} disabled={saving}
                className="flex-1 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs font-medium disabled:opacity-50">
                {saving ? "Salvando…" : "Adicionar"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap gap-2 mt-4">
        {Object.entries(ATIVIDADE_COLORS).map(([label, cls]) => (
          <span key={label} className={cn("text-[10px] px-2 py-0.5 rounded-full border", cls)}>
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
