"use client";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, Award, Flame, Target, Zap, BookOpen, ClipboardList, AlertTriangle, CheckCircle2, BarChart3, Download } from "lucide-react";

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface SubjectStat { name: string; correct: number; total: number; accuracy: number; subjectId: string; }
interface Badge { id: string; label: string; desc: string; icon: string; unlocked: boolean; }
interface HeatmapDay { date: string; count: number; }
interface Level { name: string; min: number; max: number; color: string; }
interface WeekPoint { week: string; accuracy: number; total: number; }
interface SimuladoTrend { date: string; accuracy: number; total: number; }
interface PontoCritico { subjectName: string; accuracy: number; urgencia: "alta" | "media" | "baixa"; }

interface RelatorioData {
  xp: number;
  level: Level;
  progress: number;
  nextLevel: Level | null;
  heatmap: HeatmapDay[];
  subjectStats: SubjectStat[];
  badges: Badge[];
  streak: number;
  totalAnswered: number;
  totalCorrect: number;
  overallAccuracy: number;
  todayCount: number;
  weeklyEvolution: WeekPoint[];
  simuladoStats: { total: number; recentAccuracy: number; trend: SimuladoTrend[] };
  flashcardStats: { total: number; dueToday: number; studiedThisWeek: number };
  pontoCritico: PontoCritico[];
  prontidao: number | null;
  daysToProva: number | null;
  cargoAlvo: string | null;
}

// ── Heatmap cell ──────────────────────────────────────────────────────────────
function HeatmapCell({ count }: { count: number }) {
  const cls = count === 0 ? "bg-white/5" : count < 3 ? "bg-indigo-500/30" : count < 6 ? "bg-indigo-500/60" : "bg-indigo-500";
  return <div className={cn("w-3 h-3 rounded-sm", cls)} title={`${count} questões`} />;
}

const MONTHS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const WEEKDAYS = ["D","S","T","Q","Q","S","S"];

// ── Mini line chart ───────────────────────────────────────────────────────────
function LineChart({ points, color = "#6366f1", height = 60 }: {
  points: number[]; color?: string; height?: number;
}) {
  const w = 260; const h = height;
  const max = Math.max(...points, 1);
  const coords = points.map((v, i) => ({
    x: (i / Math.max(points.length - 1, 1)) * w,
    y: h - (v / max) * (h - 8) - 4,
  }));
  const path = coords.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const area = `${path} L${w},${h} L0,${h} Z`;
  const gId = `g${color.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gId})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {coords.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="3" fill={color} />)}
    </svg>
  );
}

// ── Prontidão ring ────────────────────────────────────────────────────────────
function ProntidaoRing({ pct }: { pct: number }) {
  const r = 48; const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const color = pct >= 70 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#ef4444";
  const label = pct >= 70 ? "Pronto" : pct >= 50 ? "Quase lá" : "Precisa estudar mais";
  return (
    <div className="flex flex-col items-center flex-shrink-0">
      <div className="relative">
        <svg width="112" height="112">
          <circle cx="56" cy="56" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
          <circle cx="56" cy="56" r={r} fill="none" stroke={color} strokeWidth="8"
            strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
            style={{ transform: "rotate(-90deg)", transformOrigin: "56px 56px", transition: "stroke-dashoffset 1s ease" }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-black tabular-nums" style={{ color }}>{pct}%</span>
          <span className="text-[10px] text-gray-500">prontidão</span>
        </div>
      </div>
      <p className="text-xs font-medium mt-1.5" style={{ color }}>{label}</p>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

interface MetasSemana {
  questoesMeta: number; flashcardsMeta: number; simuladosMeta: number; horasEstudoMeta: number;
}
interface MetasProgresso {
  questoes: number; flashcards: number; simulados: number; horasEstudo: number;
}

export default function RelatorioPage() {
  const [data, setData]       = useState<RelatorioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [metas, setMetas]     = useState<MetasSemana | null>(null);

  // Evolução temporal
  interface EvolucaoSemana { week: string; total: number; accuracy: number | null; bySubject: Record<string, number | null> }
  interface EvolucaoMateria { id: string; name: string; color: string }
  const [evoSemanas, setEvoSemanas] = useState<EvolucaoSemana[]>([]);
  const [evoMaterias, setEvoMaterias] = useState<EvolucaoMateria[]>([]);
  const [metasProg, setMetasProg] = useState<MetasProgresso | null>(null);
  const [editingMetas, setEditingMetas] = useState(false);
  const [metasDraft, setMetasDraft]     = useState<MetasSemana | null>(null);

  // Desempenho completo por matéria
  interface MateriaStat { id: string; name: string; categoria: string | null; total: number; correct: number; accuracy: number }
  const [materiaStats, setMateriaStats] = useState<MateriaStat[]>([]);
  const [materiaSort, setMateriaSort]   = useState<"accuracy" | "total" | "name">("accuracy");

  useEffect(() => {
    // AbortController com 10s de timeout — evita spinner infinito em caso de API lenta
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 10_000);

    const safe = (url: string) =>
      fetch(url, { signal: ctrl.signal }).then(r => r.ok ? r.json() : null).catch(() => null);

    Promise.all([
      safe("/api/relatorio"),
      safe("/api/workspace/metas"),
      safe("/api/relatorio/evolucao"),
      safe("/api/relatorio/materias"),
    ]).then(([relData, metasData, evoData, materiasData]) => {
      if (relData) setData(relData);
      if (metasData) { setMetas(metasData.metas); setMetasProg(metasData.progresso); }
      if (evoData) { setEvoSemanas(evoData.semanas ?? []); setEvoMaterias(evoData.materias ?? []); }
      if (materiasData) setMateriaStats(materiasData.materias ?? []);
    }).catch(() => {}).finally(() => {
      clearTimeout(tid);
      setLoading(false);
    });
  }, []);

  async function saveMetas() {
    if (!metasDraft) return;
    await fetch("/api/workspace/metas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(metasDraft),
    }).catch(() => {});
    setMetas(metasDraft);
    setEditingMetas(false);
  }

  if (loading) return (
    <div className="flex items-center justify-center h-40">
      <div className="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!data) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <p className="text-gray-400 text-sm">Não foi possível carregar seu relatório.</p>
      <button onClick={() => window.location.reload()} className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm transition-colors">
        Tentar novamente
      </button>
    </div>
  );

  const weeks: HeatmapDay[][] = [];
  for (let i = 0; i < data.heatmap.length; i += 7) weeks.push(data.heatmap.slice(i, i + 7));

  const monthLabels: { col: number; label: string }[] = [];
  for (let i = 0; i < weeks.length; i++) {
    const ws = weeks[i][0];
    if (ws) {
      const d = new Date(ws.date);
      if (i === 0 || new Date(weeks[i - 1][0].date).getMonth() !== d.getMonth())
        monthLabels.push({ col: i, label: MONTHS[d.getMonth()] });
    }
  }

  const weeklyPoints = data.weeklyEvolution.map(w => w.accuracy);
  const simPoints = data.simuladoStats.trend.map(t => t.accuracy);

  return (
    <div className="p-6 text-white max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">Relatório de Desempenho</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {data.cargoAlvo ? `Foco: ${data.cargoAlvo}` : "Seu progresso completo de estudos"}
            {data.daysToProva !== null && (
              <span className={cn("ml-2 font-semibold",
                data.daysToProva <= 7 ? "text-red-400" : data.daysToProva <= 30 ? "text-amber-400" : "text-green-400"
              )}>· {data.daysToProva} dias para a prova</span>
            )}
          </p>
        </div>
        <a
          href="/api/relatorio/export"
          download
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:border-white/20 text-xs font-medium transition-colors flex-shrink-0"
        >
          <Download className="w-3.5 h-3.5" />
          Exportar CSV
        </a>
      </div>

      {/* Top 4 stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Questões",      value: data.totalAnswered,          icon: Target,      color: "text-blue-400" },
          { label: "Taxa de acerto",value: `${data.overallAccuracy}%`,  icon: TrendingUp,  color: "text-green-400" },
          { label: "Sequência",     value: `${data.streak}d`,           icon: Flame,       color: "text-orange-400" },
          { label: "XP total",      value: data.xp,                     icon: Zap,         color: "text-yellow-400" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-xl bg-white/5 border border-white/5 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Icon className={cn("w-4 h-4", color)} />
              <span className="text-xs text-gray-500">{label}</span>
            </div>
            <p className="text-2xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      {/* Metas semanais */}
      {metas && metasProg && (
        <div className="rounded-xl bg-white/5 border border-white/5 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-400" /> Metas desta semana
            </h2>
            <button onClick={() => { setEditingMetas(true); setMetasDraft({ ...metas }); }}
              className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
              Editar metas
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {([
              { label: "Questões",    atual: metasProg.questoes,    meta: metas.questoesMeta,    unit: "", color: "#6366f1" },
              { label: "Flashcards",  atual: metasProg.flashcards,  meta: metas.flashcardsMeta,  unit: "", color: "#10b981" },
              { label: "Simulados",   atual: metasProg.simulados,   meta: metas.simuladosMeta,   unit: "", color: "#f59e0b" },
              { label: "Horas estudo",atual: metasProg.horasEstudo, meta: metas.horasEstudoMeta, unit: "h", color: "#8b5cf6" },
            ] as const).map(({ label, atual, meta, unit, color }) => {
              const pct = Math.min(100, meta > 0 ? Math.round((atual / meta) * 100) : 0);
              return (
                <div key={label} className="rounded-xl bg-white/5 p-3">
                  <p className="text-xs text-gray-500 mb-1">{label}</p>
                  <p className="text-lg font-bold mb-2" style={{ color }}>
                    {typeof atual === "number" && !Number.isInteger(atual) ? atual.toFixed(1) : atual}{unit}
                    <span className="text-xs text-gray-600 font-normal"> / {meta}{unit}</span>
                  </p>
                  <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, background: color }} />
                  </div>
                  <p className="text-[10px] text-gray-600 mt-1 text-right">{pct}%</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal editar metas */}
      {editingMetas && metasDraft && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[#0f1117] border border-white/10 rounded-2xl p-6 w-full max-w-sm space-y-4">
            <h3 className="font-bold text-sm">Metas semanais</h3>
            {([
              { key: "questoesMeta" as const,    label: "Questões / semana" },
              { key: "flashcardsMeta" as const,  label: "Flashcards / semana" },
              { key: "simuladosMeta" as const,   label: "Simulados / semana" },
              { key: "horasEstudoMeta" as const, label: "Horas de estudo / semana" },
            ]).map(({ key, label }) => (
              <div key={key}>
                <label className="text-xs text-gray-500 mb-1 block">{label}</label>
                <input type="number" inputMode="numeric" min={0} value={metasDraft[key]}
                  onChange={e => setMetasDraft(d => d ? { ...d, [key]: Number(e.target.value) } : d)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            ))}
            <div className="flex gap-2 pt-2">
              <button onClick={() => setEditingMetas(false)}
                className="flex-1 py-2 rounded-xl border border-white/10 text-sm text-gray-400 hover:text-white">
                Cancelar
              </button>
              <button onClick={saveMetas}
                className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-sm font-medium">
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Prontidão + Ponto crítico */}
      {(data.prontidao !== null || data.pontoCritico.length > 0) && (
        <div className="grid md:grid-cols-2 gap-4">
          {data.prontidao !== null && (
            <div className="rounded-xl bg-white/5 border border-white/5 p-5 flex items-center gap-5">
              <ProntidaoRing pct={data.prontidao} />
              <div>
                <h3 className="font-semibold text-sm mb-2">Prontidão estimada</h3>
                <p className="text-xs text-gray-400 leading-relaxed mb-3">
                  Baseado no seu aproveitamento ({data.overallAccuracy}%), simulados ({data.simuladoStats.recentAccuracy}%) e consistência de estudo.
                </p>
                <div className="flex flex-col gap-1.5">
                  {[
                    { icon: <BookOpen className="w-3 h-3" />, text: `${data.totalAnswered} questões respondidas` },
                    { icon: <ClipboardList className="w-3 h-3" />, text: `${data.simuladoStats.total} simulados` },
                    { icon: <span className="text-sm leading-none">🃏</span>, text: `${data.flashcardStats.total} flashcards` },
                  ].map((row, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-gray-400">{row.icon}{row.text}</div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {data.pontoCritico.length > 0 && (
            <div className="rounded-xl bg-red-500/5 border border-red-500/15 p-5">
              <h3 className="flex items-center gap-2 font-semibold text-sm mb-3 text-red-300">
                <AlertTriangle className="w-4 h-4" /> Ponto crítico
              </h3>
              <div className="space-y-3">
                {data.pontoCritico.map(p => (
                  <div key={p.subjectName}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-300">{p.subjectName}</span>
                      <span className={cn("font-bold",
                        p.urgencia === "alta" ? "text-red-400" : p.urgencia === "media" ? "text-amber-400" : "text-yellow-400"
                      )}>{p.accuracy}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-red-500" style={{ width: `${p.accuracy}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-3">Priorize essas matérias nas próximas sessões</p>
            </div>
          )}
        </div>
      )}

      {/* Flashcard quick stats */}
      {data.flashcardStats.total > 0 && (
        <div className="grid grid-cols-3 rounded-xl border border-white/[0.06] bg-[#0d1117] overflow-hidden">
          {[
            { label: "FLASHCARDS TOTAL",   value: data.flashcardStats.total, accent: "#6366f1" },
            { label: "VENCIDOS HOJE",       value: data.flashcardStats.dueToday, accent: data.flashcardStats.dueToday > 0 ? "#f59e0b" : "#6b7280" },
            { label: "SEMANA ESTUDADOS",    value: data.flashcardStats.studiedThisWeek, accent: "#10b981" },
          ].map((s, i) => (
            <div key={s.label} className={cn("py-4 text-center", i < 2 && "border-r border-white/[0.06]")}>
              <div className="text-2xl font-black tabular-nums" style={{ color: s.accent }}>{s.value}</div>
              <div className="text-[9px] text-gray-600 uppercase tracking-widest mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Evolução semanal */}
      {weeklyPoints.some(v => v > 0) && (
        <div className="rounded-xl bg-white/5 border border-white/5 p-5">
          <h2 className="text-sm font-semibold mb-1 text-gray-300">Evolução — acerto em questões</h2>
          <p className="text-xs text-gray-600 mb-4">Últimas 8 semanas</p>
          <LineChart points={weeklyPoints} color="#6366f1" height={70} />
          <div className="flex justify-between text-[10px] text-gray-600 mt-2">
            {data.weeklyEvolution.map((w, i) => (
              <span key={i}>{w.accuracy > 0 ? `${w.accuracy}%` : "—"}</span>
            ))}
          </div>
        </div>
      )}

      {/* Simulados trend */}
      {simPoints.length > 1 && simPoints.some(v => v > 0) && (
        <div className="rounded-xl bg-white/5 border border-white/5 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-300">Simulados — aproveitamento recente</h2>
            <span className={cn("text-xs font-bold px-3 py-1 rounded-full border",
              data.simuladoStats.recentAccuracy >= 70 ? "text-green-400 border-green-500/20 bg-green-500/8"
              : data.simuladoStats.recentAccuracy >= 50 ? "text-amber-400 border-amber-500/20 bg-amber-500/8"
              : "text-red-400 border-red-500/20 bg-red-500/8"
            )}>
              {data.simuladoStats.recentAccuracy}% média
            </span>
          </div>
          <LineChart points={simPoints} color="#f59e0b" height={60} />
        </div>
      )}

      {/* XP / Level */}
      <div className="rounded-xl bg-white/5 border border-white/5 p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-xs text-gray-500 uppercase tracking-wider">Nível atual</span>
            <h2 className={cn("text-xl font-bold", data.level.color)}>{data.level.name}</h2>
          </div>
          <div className="text-right">
            <span className="text-xs text-gray-500">{data.xp} XP</span>
            {data.nextLevel && <p className="text-xs text-gray-600">próximo: {data.nextLevel.name} ({data.nextLevel.min} XP)</p>}
          </div>
        </div>
        <div className="h-2 rounded-full bg-white/10">
          <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500" style={{ width: `${data.progress}%` }} />
        </div>
        <p className="text-xs text-gray-600 mt-1">{data.progress}% para o próximo nível</p>
      </div>

      {/* Heatmap */}
      <div className="rounded-xl bg-white/5 border border-white/5 p-5 overflow-x-auto">
        <h2 className="text-sm font-semibold mb-4 text-gray-300">Atividade — últimas 16 semanas</h2>
        <div className="flex gap-1.5 min-w-max">
          <div className="flex flex-col gap-1 pt-5 mr-1">
            {WEEKDAYS.map((d, i) => (
              <div key={i} className="h-3 w-3 flex items-center justify-center text-[9px] text-gray-600">{i % 2 === 0 ? d : ""}</div>
            ))}
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex gap-1 h-4 mb-1">
              {weeks.map((_, wi) => {
                const ml = monthLabels.find(m => m.col === wi);
                return <div key={wi} className="w-3 relative">
                  {ml && <span className="absolute text-[9px] text-gray-500 whitespace-nowrap">{ml.label}</span>}
                </div>;
              })}
            </div>
            <div className="flex gap-1">
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-1">
                  {week.map((day, di) => <HeatmapCell key={di} count={day.count} />)}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-3 text-[10px] text-gray-600">
          <span>Menos</span>
          {["bg-white/5","bg-indigo-500/30","bg-indigo-500/60","bg-indigo-500"].map(c => (
            <div key={c} className={cn("w-2.5 h-2.5 rounded-sm", c)} />
          ))}
          <span>Mais</span>
        </div>
      </div>

      {/* Conquistas */}
      <div className="rounded-xl bg-white/5 border border-white/5 p-5">
        <h2 className="text-sm font-semibold mb-4 text-gray-300 flex items-center gap-2">
          <Award className="w-4 h-4 text-yellow-400" /> Conquistas
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {data.badges.map(b => (
            <div key={b.id} className={cn(
              "flex flex-col items-center text-center p-3 rounded-xl border",
              b.unlocked ? "bg-yellow-500/10 border-yellow-500/30" : "bg-white/3 border-white/5 opacity-40 grayscale"
            )}>
              <span className="text-2xl mb-1.5">{b.icon}</span>
              <p className="text-xs font-semibold">{b.label}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">{b.desc}</p>
              {b.unlocked && <CheckCircle2 className="w-3 h-3 text-green-400 mt-1.5" />}
            </div>
          ))}
        </div>
      </div>

      {/* Desempenho por matéria */}
      {data.subjectStats.length > 0 && (
        <div className="rounded-xl bg-white/5 border border-white/5 p-5">
          <h2 className="text-sm font-semibold mb-4 text-gray-300">Desempenho por matéria</h2>
          <div className="space-y-3">
            {data.subjectStats.map(s => (
              <div key={s.name}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-300 truncate max-w-52">{s.name}</span>
                  <span className={cn("font-medium",
                    s.accuracy >= 70 ? "text-green-400" : s.accuracy >= 50 ? "text-yellow-400" : "text-red-400"
                  )}>{s.accuracy}% <span className="text-gray-600">({s.correct}/{s.total})</span></span>
                </div>
                <div className="h-1.5 rounded-full bg-white/10">
                  <div className={cn("h-full rounded-full",
                    s.accuracy >= 70 ? "bg-green-500" : s.accuracy >= 50 ? "bg-yellow-500" : "bg-red-500"
                  )} style={{ width: `${s.accuracy}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}


      {/* Evolução temporal por matéria */}
      {evoSemanas.length >= 2 && (() => {
        const semanasComDados = evoSemanas.filter(s => s.total > 0);
        if (semanasComDados.length < 2) return null;

        // Mini sparkline SVG por série
        const w = 300; const h = 60;
        function sparkline(values: (number | null)[], color: string) {
          const pts = values.map((v, i) => ({ x: (i / Math.max(values.length - 1, 1)) * w, y: v }));
          const valid = pts.filter(p => p.y !== null) as { x: number; y: number }[];
          if (valid.length < 2) return null;
          const path = valid.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${(h - (p.y / 100) * (h - 8) - 4).toFixed(1)}`).join(" ");
          return <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />;
        }

        const globalValues = evoSemanas.map(s => s.accuracy);

        return (
          <div className="rounded-xl bg-white/5 border border-white/5 p-5">
            <h2 className="text-sm font-semibold mb-1 text-gray-300 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-400" /> Evolução nas últimas 12 semanas
            </h2>
            <p className="text-xs text-gray-600 mb-4">Taxa de acerto semanal — global e por matéria</p>

            {/* Sparkline global */}
            <div className="mb-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-indigo-400 flex-shrink-0" />
                <span className="text-xs text-gray-400">Global</span>
              </div>
              <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
                {sparkline(globalValues, "#6366f1")}
              </svg>
            </div>

            {/* Sparklines por matéria */}
            {evoMaterias.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                {evoMaterias.map(m => {
                  const values = evoSemanas.map(s => s.bySubject[m.id] ?? null);
                  const hasData = values.some(v => v !== null);
                  if (!hasData) return null;
                  const last = values.findLast(v => v !== null);
                  return (
                    <div key={m.id} className="rounded-lg bg-white/3 p-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: m.color }} />
                          <span className="text-xs text-gray-400 truncate max-w-32">{m.name}</span>
                        </div>
                        {last !== null && (
                          <span className="text-xs font-bold" style={{ color: m.color }}>{last}%</span>
                        )}
                      </div>
                      <svg width="100%" height={40} viewBox={`0 0 ${w} 40`} preserveAspectRatio="none">
                        {sparkline(values, m.color)}
                      </svg>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Labels de semanas */}
            <div className="flex justify-between text-[10px] text-gray-700 mt-2">
              {[evoSemanas[0]?.week?.slice(5), evoSemanas[Math.floor(evoSemanas.length / 2)]?.week?.slice(5), evoSemanas[evoSemanas.length - 1]?.week?.slice(5)].map((w, i) => (
                <span key={i}>{w}</span>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Tabela completa por matéria */}
      {materiaStats.length > 0 && (() => {
        const sorted = [...materiaStats].sort((a, b) => {
          if (materiaSort === "accuracy") return a.accuracy - b.accuracy;
          if (materiaSort === "total")    return b.total - a.total;
          return a.name.localeCompare(b.name);
        });
        return (
          <div className="rounded-xl bg-white/5 border border-white/5 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-400" /> Desempenho total por matéria
              </h2>
              <div className="flex gap-1">
                {([
                  { key: "accuracy" as const, label: "% Acerto" },
                  { key: "total"    as const, label: "Volume" },
                  { key: "name"     as const, label: "A–Z" },
                ]).map(({ key, label }) => (
                  <button key={key} onClick={() => setMateriaSort(key)}
                    className={cn(
                      "px-2 py-1 rounded-md text-[11px] transition-colors",
                      materiaSort === key
                        ? "bg-indigo-600/30 text-indigo-300 border border-indigo-500/30"
                        : "text-gray-600 hover:text-gray-400"
                    )}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              {sorted.map((s, i) => (
                <div key={s.id} className="flex items-center gap-3 py-1">
                  {/* Rank indicator */}
                  <span className="text-[10px] text-gray-700 w-4 tabular-nums text-right flex-shrink-0">{i + 1}</span>
                  {/* Name + categoria */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-300 truncate">{s.name}</p>
                    {s.categoria && <p className="text-[10px] text-gray-600 truncate">{s.categoria}</p>}
                  </div>
                  {/* Mini bar */}
                  <div className="w-20 h-1.5 rounded-full bg-white/10 flex-shrink-0 hidden sm:block">
                    <div className={cn("h-full rounded-full",
                      s.accuracy >= 70 ? "bg-green-500" : s.accuracy >= 50 ? "bg-amber-500" : "bg-red-500"
                    )} style={{ width: `${s.accuracy}%` }} />
                  </div>
                  {/* Correct / total */}
                  <span className="text-[11px] text-gray-600 tabular-nums w-14 text-right flex-shrink-0">
                    {s.correct}/{s.total}
                  </span>
                  {/* Accuracy badge */}
                  <span className={cn(
                    "text-[11px] font-bold tabular-nums w-10 text-right flex-shrink-0",
                    s.accuracy >= 70 ? "text-green-400" : s.accuracy >= 50 ? "text-amber-400" : "text-red-400"
                  )}>
                    {s.accuracy}%
                  </span>
                </div>
              ))}
            </div>

            {materiaSort === "accuracy" && (
              <p className="text-[10px] text-gray-600 mt-3 text-center">
                Ordenado por pior desempenho — priorize as matérias do topo
              </p>
            )}
          </div>
        );
      })()}
    </div>
  );
}
