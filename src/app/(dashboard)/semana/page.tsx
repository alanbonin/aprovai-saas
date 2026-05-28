"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  CalendarDays, Target, RotateCcw, Brain, BookOpen, Zap, ChevronRight,
  RefreshCw, TrendingUp, TrendingDown, Minus, CheckCircle, FileText,
  Search, FlameIcon as Flame,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ── Tipos ──────────────────────────────────────────────────────────────── */

interface MetasSemana {
  questoesMeta: number;
  flashcardsMeta: number;
  simuladosMeta: number;
  horasEstudoMeta: number;
  leituraPdfMeta?: number;
  questoesRealizadas: number;
  flashcardsRealizados: number;
  horasEstudadas: number;
  simuladosRealizados: number;
}

interface WeeklyDigest {
  questoesRespondidas: number;
  questoesCorretas: number;
  aproveitamento: number;
  streakAtual: number;
  xpGanho: number;
  melhorMateria: string | null;
  piorMateria: string | null;
  tendencia: "subindo" | "estavel" | "caindo";
  titulo: string;
  paragrafo: string;
  destaques: string[];
  proximasSemana: string[];
  emoji: string;
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */

const DIAS_PT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MESES_PT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function getWeekRange() {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - now.getDay()); // domingo
  const end = new Date(start);
  end.setDate(start.getDate() + 6); // sábado
  const fmt = (d: Date) => `${d.getDate()} ${MESES_PT[d.getMonth()]}`;
  const diaSemana = DIAS_PT[now.getDay()];
  return { label: `${fmt(start)} – ${fmt(end)}`, diaSemana };
}

function pct(val: number, meta: number) {
  return Math.min(100, meta > 0 ? Math.round((val / meta) * 100) : 0);
}

/* ── Componentes ─────────────────────────────────────────────────────────── */

function RingProgress({ value, max, size = 72, color = "#6366f1" }: { value: number; max: number; size?: number; color?: string }) {
  const p = pct(value, max);
  const r = size / 2 - 7;
  const circ = 2 * Math.PI * r;
  const c = p >= 100 ? "#34d399" : color;
  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={5} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={c} strokeWidth={5}
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - p / 100)}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.8s ease" }}
      />
    </svg>
  );
}

function MetaCard({ label, value, meta, color, unit = "" }: {
  label: string; value: number; meta: number; color: string; unit?: string;
}) {
  const p = pct(value, meta);
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative">
        <RingProgress value={value} max={meta} size={72} color={color} />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs font-black text-white leading-none">{p}%</span>
        </div>
      </div>
      <p className="text-[10px] text-gray-500 font-medium text-center leading-tight">{label}</p>
      <p className="text-[11px] font-semibold text-gray-400">
        <span className="text-white">{value}{unit}</span>/{meta}{unit}
      </p>
    </div>
  );
}

function ActionCard({ href, icon, title, desc, badge, badgeColor = "bg-indigo-500" }: {
  href: string; icon: React.ReactNode; title: string; desc: string; badge?: number | string; badgeColor?: string;
}) {
  return (
    <Link href={href} className="flex items-center gap-4 p-3.5 rounded-xl border border-white/[0.06] bg-white/[0.02] transition-all hover:bg-white/[0.04] group">
      <div className="w-9 h-9 rounded-xl bg-white/[0.05] flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="text-xs text-gray-500 mt-0.5 truncate">{desc}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {badge !== undefined && (
          <span className={cn("min-w-[22px] h-[22px] rounded-full text-white text-[10px] font-bold flex items-center justify-center px-1.5", badgeColor)}>
            {badge}
          </span>
        )}
        <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors" />
      </div>
    </Link>
  );
}

/* ── Skeleton ────────────────────────────────────────────────────────────── */
function Skeleton() {
  return (
    <div className="min-h-screen text-white p-6 max-w-2xl mx-auto animate-pulse space-y-4">
      <div className="h-8 bg-white/5 rounded-xl w-52" />
      <div className="h-36 bg-white/5 rounded-2xl" />
      <div className="h-28 bg-white/5 rounded-2xl" />
      <div className="h-20 bg-white/5 rounded-xl" />
      <div className="h-20 bg-white/5 rounded-xl" />
    </div>
  );
}

/* ── Página principal ────────────────────────────────────────────────────── */
export default function BriefingSemanaPage() {
  const [metas, setMetas] = useState<MetasSemana | null>(null);
  const [digest, setDigest] = useState<WeeklyDigest | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const { label: weekRange, diaSemana } = getWeekRange();

  async function load(forceRefresh = false) {
    if (forceRefresh) setRefreshing(true);
    const [metasRes, digestRes] = await Promise.all([
      fetch("/api/workspace/metas"),
      fetch(forceRefresh ? "/api/relatorio/semanal" : "/api/relatorio/semanal", {
        method: forceRefresh ? "POST" : "GET",
      }),
    ]);
    if (metasRes.ok) setMetas(await metasRes.json());
    if (digestRes.ok) {
      const d = await digestRes.json();
      if (d.digest) setDigest(d.digest);
    }
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => { load(); }, []);

  if (loading) return <Skeleton />;

  const m = metas;
  const d = digest;

  // Dias da semana para exibição
  const hoje = new Date().getDay(); // 0=dom
  const diasDaSemana = DIAS_PT.map((nome, i) => ({
    nome,
    passado: i < hoje,
    hoje: i === hoje,
  }));

  return (
    <div className="min-h-screen text-white p-6 max-w-2xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-indigo-400" />
            Briefing da Semana
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">{weekRange} · hoje é {diaSemana}</p>
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="p-2 text-gray-600 hover:text-gray-300 transition-colors"
        >
          <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
        </button>
      </div>

      {/* Dias da semana — barra visual */}
      <div className="flex gap-1 mb-6">
        {diasDaSemana.map(({ nome, passado, hoje: isHoje }) => (
          <div key={nome} className={cn(
            "flex-1 flex flex-col items-center gap-1 py-2 rounded-lg text-[10px] font-medium transition-all",
            isHoje ? "bg-indigo-600/30 border border-indigo-500/40 text-indigo-300"
            : passado ? "bg-white/[0.04] text-gray-500"
            : "bg-white/[0.02] text-gray-700"
          )}>
            <span>{nome}</span>
            {passado && <CheckCircle className="w-3 h-3 text-emerald-500" />}
            {isHoje && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />}
            {!passado && !isHoje && <span className="w-1.5 h-1.5 rounded-full bg-white/10" />}
          </div>
        ))}
      </div>

      {/* Metas da semana */}
      {m && (
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5 mb-5">
          <p className="text-xs text-gray-600 font-semibold uppercase tracking-wider mb-4">Progresso semanal</p>
          <div className="grid grid-cols-4 gap-2">
            <MetaCard
              label="Questões" value={m.questoesRealizadas} meta={m.questoesMeta}
              color="#6366f1" unit=""
            />
            <MetaCard
              label="Flashcards" value={m.flashcardsRealizados} meta={m.flashcardsMeta}
              color="#8b5cf6" unit=""
            />
            <MetaCard
              label="Horas" value={m.horasEstudadas} meta={m.horasEstudoMeta}
              color="#06b6d4" unit="h"
            />
            <MetaCard
              label="Simulados" value={m.simuladosRealizados} meta={m.simuladosMeta}
              color="#f59e0b" unit=""
            />
          </div>
        </div>
      )}

      {/* Digest semanal da IA */}
      {d && (
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5 mb-5">
          <div className="flex items-start gap-3 mb-3">
            <span className="text-3xl">{d.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white">{d.titulo}</p>
              <div className="flex items-center gap-2 mt-1">
                {d.tendencia === "subindo"
                  ? <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  : d.tendencia === "caindo"
                  ? <TrendingDown className="w-3.5 h-3.5 text-red-400" />
                  : <Minus className="w-3.5 h-3.5 text-gray-500" />}
                <span className={cn(
                  "text-xs font-semibold",
                  d.aproveitamento >= 70 ? "text-emerald-400"
                  : d.aproveitamento >= 50 ? "text-amber-400"
                  : "text-red-400"
                )}>{d.aproveitamento}% de aproveitamento</span>
                <span className="text-xs text-gray-600">· {d.questoesRespondidas} questões</span>
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Flame className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-black text-white">{d.streakAtual}</span>
              <span className="text-[10px] text-gray-600">dias</span>
            </div>
          </div>

          <p className="text-xs text-gray-400 leading-relaxed mb-4">{d.paragrafo}</p>

          {d.melhorMateria && d.piorMateria && (
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="rounded-xl bg-emerald-500/[0.07] border border-emerald-500/15 p-3">
                <p className="text-[10px] text-emerald-500 font-semibold uppercase tracking-wide mb-1">Melhor matéria</p>
                <p className="text-xs font-bold text-emerald-300 truncate">{d.melhorMateria}</p>
              </div>
              <div className="rounded-xl bg-rose-500/[0.07] border border-rose-500/15 p-3">
                <p className="text-[10px] text-rose-500 font-semibold uppercase tracking-wide mb-1">Foco da semana</p>
                <p className="text-xs font-bold text-rose-300 truncate">{d.piorMateria}</p>
              </div>
            </div>
          )}

          {d.destaques.length > 0 && (
            <div className="mb-3">
              <p className="text-[10px] text-gray-600 font-semibold uppercase tracking-wide mb-2">Destaques</p>
              <ul className="space-y-1">
                {d.destaques.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-gray-400">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {d.proximasSemana.length > 0 && (
            <div>
              <p className="text-[10px] text-gray-600 font-semibold uppercase tracking-wide mb-2">Próxima semana</p>
              <ul className="space-y-1">
                {d.proximasSemana.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-gray-400">
                    <Target className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Ações da semana */}
      <div className="space-y-2 mb-6">
        <p className="text-xs text-gray-600 font-medium uppercase tracking-wider mb-3">Continuar praticando</p>

        <ActionCard
          href="/questoes"
          icon={<Target className="w-4 h-4 text-indigo-400" />}
          title="Questões"
          desc={m ? `${m.questoesRealizadas}/${m.questoesMeta} questões esta semana` : "Responda questões agora"}
          badge={m && m.questoesRealizadas >= m.questoesMeta ? "✓" : undefined}
          badgeColor="bg-emerald-600"
        />

        <ActionCard
          href="/revisao"
          icon={<RotateCcw className="w-4 h-4 text-rose-400" />}
          title="Revisão SM-2"
          desc="Revise questões com espaçamento inteligente"
        />

        <ActionCard
          href="/flashcards"
          icon={<Brain className="w-4 h-4 text-violet-400" />}
          title="Flashcards"
          desc={m ? `${m.flashcardsRealizados}/${m.flashcardsMeta} flashcards esta semana` : "Pratique com flashcards"}
        />

        <ActionCard
          href="/redacao"
          icon={<FileText className="w-4 h-4 text-cyan-400" />}
          title="Redação"
          desc="Pratique dissertação e redação oficial"
        />

        <ActionCard
          href="/caso"
          icon={<Search className="w-4 h-4 text-amber-400" />}
          title="Estudo de Caso"
          desc="Resolva casos práticos do seu cargo"
        />

        <ActionCard
          href="/desafio-semanal"
          icon={<Zap className="w-4 h-4 text-yellow-400" />}
          title="Desafio Semanal"
          desc="Competição semanal com outros alunos"
        />

        <ActionCard
          href="/biblioteca"
          icon={<BookOpen className="w-4 h-4 text-emerald-400" />}
          title="Biblioteca PDF"
          desc="Leitura de materiais e apostilas"
        />
      </div>

      {/* Plano de estudos */}
      <Link
        href="/plano-semanal"
        className="flex items-center justify-between p-4 rounded-xl border border-indigo-500/20 bg-indigo-500/[0.04] hover:bg-indigo-500/[0.08] transition-colors group mb-5"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">🤖</span>
          <div>
            <p className="text-xs text-indigo-400 font-semibold uppercase tracking-wide mb-0.5">Plano de Estudos IA</p>
            <p className="text-sm font-medium text-white">Ver cronograma completo</p>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors" />
      </Link>

      {/* Meta da semana completa */}
      {m && m.questoesRealizadas >= m.questoesMeta && m.flashcardsRealizados >= m.flashcardsMeta && (
        <div className="rounded-2xl bg-emerald-500/[0.06] border border-emerald-500/20 p-6 text-center">
          <div className="text-4xl mb-3">🏆</div>
          <p className="text-sm font-bold text-emerald-300 mb-1">Semana completa!</p>
          <p className="text-xs text-gray-500">Todas as metas atingidas. Você é incrível!</p>
        </div>
      )}
    </div>
  );
}
