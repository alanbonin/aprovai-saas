"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

/* ── Circular Progress SVG ──────────────────────────────────────────── */
function CircularProgress({ pct, size = 56, stroke = 5, color = "#6366f1" }: {
  pct: number; size?: number; stroke?: number; color?: string;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.8s ease" }} />
    </svg>
  );
}

/* ── Palette ────────────────────────────────────────────────────────── */
const SUBJECT_COLORS = [
  "#6366f1","#8b5cf6","#ec4899","#f59e0b","#10b981",
  "#3b82f6","#ef4444","#06b6d4","#84cc16","#f97316",
];

const QUICK_ACTIONS = [
  { href: "/hoje",          icon: "☀️", label: "Briefing",       sub: "Missão do dia",      bg: "rgba(251,191,36,0.12)",  border: "rgba(251,191,36,0.3)"  },
  { href: "/workspace",     icon: "📚", label: "Estudar",         sub: "Questões e mentor",  bg: "rgba(99,102,241,0.12)",  border: "rgba(99,102,241,0.3)"  },
  { href: "/quiz",          icon: "🏃", label: "Quiz Rápido",     sub: "5 questões cronometradas", bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.3)"  },
  { href: "/desafio-semanal",icon: "⚔️",label: "Desafio Semanal", sub: "10 questões difíceis",bg: "rgba(139,92,246,0.12)", border: "rgba(139,92,246,0.3)"  },
  { href: "/simulado",      icon: "🎯", label: "Simulado",        sub: "Teste completo",      bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.3)"  },
  { href: "/relatorio",     icon: "📊", label: "Relatório",       sub: "Seu desempenho",      bg: "rgba(59,130,246,0.12)", border: "rgba(59,130,246,0.3)"  },
];

const ALL_CATEGORIES = [
  {
    title: "🎯 Praticar",
    color: "#6366f1",
    items: [
      { href: "/questoes",          icon: "📝", label: "Questões" },
      { href: "/simulado",          icon: "🎯", label: "Simulado" },
      { href: "/simulado/filtrado", icon: "🎛️", label: "Sim. com Filtros" },
      { href: "/simulado/exame",    icon: "⏱️", label: "Modo Exame" },
      { href: "/simulado/revisao",  icon: "🔁", label: "Sim. de Revisão" },
      { href: "/desafio",           icon: "⚡", label: "Desafio Diário" },
      { href: "/desafio-semanal",   icon: "⚔️", label: "Desafio Semanal" },
      { href: "/quiz",              icon: "🏃", label: "Quiz Rápido" },
      { href: "/adaptativo",        icon: "🧠", label: "Adaptativo" },
    ],
  },
  {
    title: "🔄 Revisão",
    color: "#10b981",
    items: [
      { href: "/revisao",         icon: "🔄", label: "Revisão SM-2" },
      { href: "/agenda-revisoes", icon: "📆", label: "Agenda SM-2" },
      { href: "/caderno-erros",   icon: "📒", label: "Caderno de Erros" },
      { href: "/flashcards",      icon: "🗂️", label: "Flashcards" },
      { href: "/favoritos",       icon: "⭐", label: "Favoritos" },
    ],
  },
  {
    title: "📊 Análise",
    color: "#f59e0b",
    items: [
      { href: "/relatorio",           icon: "📊", label: "Relatório" },
      { href: "/diagnostico",         icon: "🩺", label: "Diagnóstico IA" },
      { href: "/bancas",              icon: "🏛️", label: "Por Banca" },
      { href: "/nivel",               icon: "📶", label: "Por Nível" },
      { href: "/comparar",            icon: "📊", label: "Vs. Média" },
      { href: "/historico-simulados", icon: "📈", label: "Hist. Simulados" },
    ],
  },
  {
    title: "📅 Planejamento",
    color: "#8b5cf6",
    items: [
      { href: "/metas",        icon: "🎯", label: "Metas" },
      { href: "/cronograma",   icon: "📅", label: "Cronograma" },
      { href: "/plano-semanal",icon: "🤖", label: "Plano IA" },
      { href: "/edital-watch", icon: "📡", label: "Radar Editais" },
      { href: "/sessao",       icon: "⏱️", label: "Cronômetro de Estudo" },
      { href: "/pomodoro",     icon: "🍅", label: "Pomodoro" },
    ],
  },
  {
    title: "🎓 Aprendizado IA",
    color: "#06b6d4",
    items: [
      { href: "/workspace",  icon: "📚", label: "Estudar com Mentor" },
      { href: "/mentor",     icon: "🎓", label: "Mentores" },
      { href: "/glossario",  icon: "📖", label: "Glossário IA" },
      { href: "/artigos",    icon: "📜", label: "Artigos IA" },
      { href: "/caso",       icon: "🔍", label: "Casos" },
      { href: "/redacao",    icon: "✍️", label: "Redação" },
      { href: "/materiais",  icon: "📄", label: "Materiais" },
    ],
  },
  {
    title: "👥 Social",
    color: "#f43f5e",
    items: [
      { href: "/ranking",      icon: "🏆", label: "Ranking" },
      { href: "/grupos",       icon: "👥", label: "Grupos" },
      { href: "/conquistas",   icon: "🎖️", label: "Conquistas" },
      { href: "/timeline",     icon: "🕐", label: "Linha do Tempo" },
      { href: "/notificacoes", icon: "🔔", label: "Notificações" },
    ],
  },
  {
    title: "🛠️ Ferramentas",
    color: "#94a3b8",
    items: [
      { href: "/calculadora",   icon: "🧮", label: "Calculadora" },
      { href: "/diario",        icon: "📔", label: "Diário" },
      { href: "/notas",         icon: "📓", label: "Anotações" },
      { href: "/perfil",        icon: "👤", label: "Meu Perfil" },
      { href: "/planos",        icon: "💳", label: "Planos" },
      { href: "/configuracoes", icon: "⚙️", label: "Configurações" },
    ],
  },
];

const LEVELS = [
  { name: "Calouro",   min: 0,    color: "#8b949e" },
  { name: "Estudioso", min: 201,  color: "#60a5fa" },
  { name: "Focado",    min: 501,  color: "#818cf8" },
  { name: "Avançado",  min: 1001, color: "#a78bfa" },
  { name: "Expert",    min: 2001, color: "#fbbf24" },
  { name: "Elite",     min: 4001, color: "#facc15" },
];

function getLevel(xp: number) {
  return [...LEVELS].reverse().find(l => xp >= l.min) ?? LEVELS[0];
}

interface Relatorio {
  totalAnswered: number;
  overallAccuracy: number;
  streak: number;
  todayCount: number;
  xp: number;
  level: { name: string; color: string };
  progress: number;
  nextLevel: { name: string; min: number } | null;
  subjectStats: { name: string; correct: number; total: number; accuracy: number }[];
  badges: { id: string; label: string; desc: string; icon: string; unlocked: boolean }[];
}

interface PomodoroWeek { totalHrs: number; countToday: number; sessions: unknown[] }
interface MetasWeek { metas: { horasEstudoMeta: number }; progresso: { horasEstudo: number } }
interface Diagnostico {
  titulo: string; resumo: string; pontoForte: string | null;
  pontoFraco: string | null; recomendacao: string; emoji: string;
  nivel: "excelente" | "bom" | "regular" | "atencao" | "inicio";
}
interface DiagnosticoResult {
  diagnostico: Diagnostico | null;
  stats?: { totalQuestoes: number; accuracy: number; horasEstudo: number; simulados: number };
  cached?: boolean;
}

interface QuestaoDodia {
  question: {
    id: number; statement: string; answer: string;
    optionA: string|null; optionB: string|null; optionC: string|null; optionD: string|null; optionE: string|null;
    banca: string|null; year: number|null; level: string; explanation: string|null;
  } | null;
  answeredToday: boolean;
  answeredCorrect: boolean | null;
}

const NIVEL_COLORS: Record<string, string> = {
  excelente: "#10b981", bom: "#6366f1", regular: "#f59e0b", atencao: "#ef4444", inicio: "#6b7280",
};

export default function DashboardPage() {
  const [data, setData] = useState<Relatorio | null>(null);
  const [loading, setLoading] = useState(true);
  const [dataProva, setDataProva] = useState<string | null>(null);
  const [cargo, setCargo] = useState<string | null>(null);
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [pomodoro, setPomodoro] = useState<PomodoroWeek | null>(null);
  const [metasHrs, setMetasHrs] = useState<{ meta: number; atual: number } | null>(null);
  const [diagResult, setDiagResult] = useState<DiagnosticoResult | null>(null);
  const [diagLoading, setDiagLoading] = useState(false);

  // Questão do Dia
  const [qdDia, setQdDia] = useState<QuestaoDodia | null>(null);
  const [qdExpanded, setQdExpanded] = useState(false);
  const [qdSelected, setQdSelected] = useState<string | null>(null);
  const [qdXpFlash, setQdXpFlash] = useState(false);

  // Cronograma de hoje
  const [cronHoje, setCronHoje] = useState<{ hora: string; atividade: string; durMin: number; concluido?: boolean }[]>([]);

  // Briefing do dia
  interface HojeBriefing {
    questoesHoje: number; questoesVencidas: number; flashcardsVencidos: number;
    streak: number; streakAtRisk: boolean; metaQuestoesHoje: number;
    progressoPct: number; estudouHoje: boolean;
    prioridade: { subjectName: string; erros: number } | null;
  }
  const [hoje, setHoje] = useState<HojeBriefing | null>(null);

  async function loadOrGenerateDiag() {
    setDiagLoading(true);
    try {
      // Tenta pegar do cache
      const r = await fetch("/api/workspace/diagnostico");
      if (r.ok) {
        const d = await r.json() as DiagnosticoResult;
        if (d.diagnostico) { setDiagResult(d); setDiagLoading(false); return; }
      }
      // Gera novo
      const r2 = await fetch("/api/workspace/diagnostico", { method: "POST" });
      if (r2.ok) setDiagResult(await r2.json() as DiagnosticoResult);
    } catch { /* silent */ }
    setDiagLoading(false);
  }

  useEffect(() => {
    // Fetch relatorio
    fetch("/api/relatorio")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d); setLoading(false); })
      .catch(() => setLoading(false));

    // Fetch profile for exam date
    fetch("/api/workspace/profile")
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.dataProva) {
          setDataProva(d.dataProva);
          setCargo(d.cargo ?? null);
          const diff = Math.ceil((new Date(d.dataProva).getTime() - Date.now()) / 86400000);
          setDaysLeft(diff > 0 ? diff : 0);
        }
      })
      .catch(() => {});

    // Fetch Pomodoro sessions this week
    fetch("/api/workspace/pomodoro")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setPomodoro(d); })
      .catch(() => {});

    // Fetch metas for horasEstudoMeta + horasEstudo
    fetch("/api/workspace/metas")
      .then(r => r.ok ? r.json() : null)
      .then((d: MetasWeek | null) => {
        if (d) setMetasHrs({
          meta:  d.metas?.horasEstudoMeta ?? 10,
          atual: d.progresso?.horasEstudo  ?? 0,
        });
      })
      .catch(() => {});

    // Carrega diagnóstico semanal
    loadOrGenerateDiag();

    // Questão do dia
    fetch("/api/questoes/do-dia")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setQdDia(d); })
      .catch(() => {});

    // Briefing do dia
    fetch("/api/workspace/hoje")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setHoje(d); })
      .catch(() => {});

    // Cronograma de hoje
    const DIAS_MAP: Record<number, string> = { 0: "dom", 1: "seg", 2: "ter", 3: "qua", 4: "qui", 5: "sex", 6: "sab" };
    const todayKey = DIAS_MAP[new Date().getDay()];
    fetch("/api/plano-estudos")
      .then(r => r.ok ? r.json() : null)
      .then((d: { blocos?: { dia: string; hora: string; atividade: string; durMin: number; concluido?: boolean }[] } | null) => {
        if (d?.blocos) {
          const blocos = d.blocos
            .filter(b => b.dia === todayKey)
            .sort((a, b) => a.hora.localeCompare(b.hora));
          setCronHoje(blocos);
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleQdAnswer(key: string) {
    if (!qdDia?.question || qdSelected || qdDia.answeredToday) return;
    setQdSelected(key);
    const isCorrect = key === qdDia.question.answer;
    if (isCorrect) {
      setQdXpFlash(true);
      setTimeout(() => setQdXpFlash(false), 1500);
    }
    await fetch("/api/questoes/progresso", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId: qdDia.question.id, correct: isCorrect, quality: isCorrect ? "ok" : "errei" }),
    }).catch(() => {});
    setQdDia(prev => prev ? { ...prev, answeredToday: true, answeredCorrect: isCorrect } : prev);
  }

  const totalAnswered = data?.totalAnswered ?? 0;
  const accuracy      = data?.overallAccuracy ?? 0;
  const streak        = data?.streak ?? 0;
  const xp            = data?.xp ?? 0;
  const lvl           = data?.level ?? getLevel(xp);
  const xpProgress    = data?.progress ?? 0;
  const subjectStats  = data?.subjectStats ?? [];
  const badges        = data?.badges ?? [];
  const todayCount    = data?.todayCount ?? 0;

  return (
    <div style={{ minHeight: "100vh", background: "#080c18", color: "#e8eaf0", fontFamily: "system-ui, -apple-system, sans-serif" }}>

      {/* ── Top bar ──────────────────────────────────────────────── */}
      <div style={{ padding: "20px 24px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>🎓 Painel de Estudos</div>
          <div style={{ fontSize: 13, color: "#7c84a0", marginTop: 2 }}>
            {cargo ? `Preparatório para ${cargo}` : "Sua central de estudos"}
          </div>
        </div>
        <Link href="/workspace" style={{
          background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
          color: "#fff", borderRadius: 10, padding: "9px 18px",
          fontSize: 14, fontWeight: 600, textDecoration: "none",
          boxShadow: "0 4px 14px rgba(99,102,241,0.35)"
        }}>
          📚 Estudar agora
        </Link>
      </div>

      <div style={{ padding: "20px 24px", maxWidth: 1200, margin: "0 auto" }}>

        {/* ── Countdown banner ─────────────────────────────────── */}
        {daysLeft !== null && (
          <div style={{
            background: "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.08))",
            border: "1px solid rgba(99,102,241,0.25)", borderRadius: 16,
            padding: "20px 28px", marginBottom: 20,
            display: "flex", alignItems: "center", gap: 24,
          }}>
            <div style={{ textAlign: "center", minWidth: 80 }}>
              <div style={{ fontSize: 52, fontWeight: 900, lineHeight: 1, color: "#a5b4fc" }}>{daysLeft}</div>
              <div style={{ fontSize: 11, color: "#7c84a0", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 2 }}>dias</div>
            </div>
            <div style={{ width: 1, height: 60, background: "rgba(255,255,255,0.08)" }} />
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>⏳ Contagem regressiva</div>
              <div style={{ fontSize: 13, color: "#7c84a0" }}>
                {dataProva ? `Prova em ${new Date(dataProva).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}` : "Configure sua data de prova no workspace"}
              </div>
              <div style={{ fontSize: 12, color: "#6366f1", marginTop: 6, fontWeight: 600 }}>
                {daysLeft > 0 ? `${Math.ceil(daysLeft / 7)} semanas restantes` : "Prova chegou! Boa sorte! 🍀"}
              </div>
            </div>
          </div>
        )}

        {/* ── Stats row ────────────────────────────────────────── */}
        <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
          {[
            { label: "QUESTÕES",     value: totalAnswered, color: "#f59e0b", bg: "rgba(245,158,11,0.12)",  border: "rgba(245,158,11,0.25)"  },
            { label: "ACERTO",       value: `${accuracy}%`, color: "#10b981", bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.25)" },
            { label: "DIAS SEGUIDOS",value: streak,         color: "#f97316", bg: "rgba(249,115,22,0.12)", border: "rgba(249,115,22,0.25)" },
            { label: "HOJE",         value: todayCount,     color: "#60a5fa", bg: "rgba(96,165,250,0.12)", border: "rgba(96,165,250,0.25)" },
          ].map(s => (
            <div key={s.label} style={{
              flex: "1 1 100px",
              background: s.bg, border: `1px solid ${s.border}`,
              borderRadius: 12, padding: "14px 18px",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
            }}>
              <div style={{ fontSize: 26, fontWeight: 800, color: s.color }}>{loading ? "…" : s.value}</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: s.color, letterSpacing: "0.1em", textTransform: "uppercase" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── XP bar ───────────────────────────────────────────── */}
        <div style={{
          background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 12, padding: "14px 18px", marginBottom: 20,
          display: "flex", alignItems: "center", gap: 16,
        }}>
          <div style={{ fontSize: 24 }}>⚡</div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: lvl.color }}>{lvl.name}</span>
              <span style={{ fontSize: 12, color: "#7c84a0" }}>{xp} XP {data?.nextLevel ? `/ ${data.nextLevel.min} XP` : ""}</span>
            </div>
            <div style={{ background: "rgba(255,255,255,0.07)", borderRadius: 99, height: 7, overflow: "hidden" }}>
              <div style={{
                width: `${xpProgress}%`, height: "100%",
                background: `linear-gradient(90deg, ${lvl.color}, ${lvl.color}88)`,
                borderRadius: 99, transition: "width 1s ease",
              }} />
            </div>
          </div>
          {data?.nextLevel && (
            <div style={{ fontSize: 12, color: "#7c84a0", textAlign: "right", minWidth: 60 }}>
              <div style={{ color: lvl.color, fontWeight: 700 }}>{xpProgress}%</div>
              <div>p/ {data.nextLevel.name}</div>
            </div>
          )}
        </div>

        {/* ── Pomodoro / Horas de Estudo ───────────────────────── */}
        {(pomodoro || metasHrs) && (() => {
          const totalHrs   = pomodoro?.totalHrs ?? metasHrs?.atual ?? 0;
          const countToday = pomodoro?.countToday ?? 0;
          const metaHrs    = metasHrs?.meta ?? 10;
          const pct        = Math.min(100, Math.round((totalHrs / metaHrs) * 100));
          return (
            <div style={{
              background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.2)",
              borderRadius: 16, padding: "16px 20px", marginBottom: 20,
              display: "flex", alignItems: "center", gap: 20,
            }}>
              <div style={{ textAlign: "center", minWidth: 64 }}>
                <div style={{ fontSize: 36, fontWeight: 900, color: "#f97316", lineHeight: 1 }}>
                  {totalHrs.toFixed(1)}h
                </div>
                <div style={{ fontSize: 10, color: "#7c84a0", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 2 }}>esta semana</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#f97316" }}>🍅 Horas de Estudo</span>
                  <span style={{ fontSize: 12, color: "#7c84a0" }}>{pct}% da meta</span>
                </div>
                <div style={{ background: "rgba(255,255,255,0.07)", borderRadius: 99, height: 7, overflow: "hidden" }}>
                  <div style={{
                    width: `${pct}%`, height: "100%",
                    background: pct >= 100 ? "#10b981" : "linear-gradient(90deg, #f97316, #f59e0b)",
                    borderRadius: 99, transition: "width 1s ease",
                  }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
                  <span style={{ fontSize: 11, color: "#7c84a0" }}>Meta: {metaHrs}h/semana</span>
                  {countToday > 0 && <span style={{ fontSize: 11, color: "#f97316", fontWeight: 600 }}>🍅 {countToday} hoje</span>}
                </div>
              </div>
              <Link href="/workspace" style={{
                fontSize: 11, color: "#f97316", fontWeight: 600,
                textDecoration: "none", whiteSpace: "nowrap",
                padding: "6px 12px", borderRadius: 8,
                background: "rgba(249,115,22,0.12)", border: "1px solid rgba(249,115,22,0.2)",
              }}>
                Iniciar →
              </Link>
            </div>
          );
        })()}

        {/* ── Briefing do Dia ─────────────────────────────────── */}
        {hoje && (() => {
          const items = [
            hoje.questoesVencidas > 0 && {
              icon: "🔄", label: `${hoje.questoesVencidas} questão${hoje.questoesVencidas !== 1 ? "ões" : ""} para revisão`, href: "/revisao", color: "#f59e0b",
            },
            hoje.flashcardsVencidos > 0 && {
              icon: "🗂️", label: `${hoje.flashcardsVencidos} flashcard${hoje.flashcardsVencidos !== 1 ? "s" : ""} vencido${hoje.flashcardsVencidos !== 1 ? "s" : ""}`, href: "/flashcards", color: "#10b981",
            },
            hoje.prioridade && {
              icon: "⚠️", label: `Foco em ${hoje.prioridade.subjectName} (${hoje.prioridade.erros} erros recentes)`, href: "/questoes", color: "#ef4444",
            },
          ].filter(Boolean) as { icon: string; label: string; href: string; color: string }[];

          return (
            <div style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.18)", borderRadius: 16, padding: "14px 18px", marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#a5b4fc" }}>📋 Para hoje</span>
                <span style={{ fontSize: 11, color: "#6b7280" }}>
                  {hoje.questoesHoje}/{hoje.metaQuestoesHoje} questões · {hoje.progressoPct}%
                </span>
              </div>
              {/* Progress bar */}
              <div style={{ background: "rgba(255,255,255,0.07)", borderRadius: 99, height: 5, overflow: "hidden", marginBottom: 12 }}>
                <div style={{
                  width: `${hoje.progressoPct}%`, height: "100%",
                  background: hoje.progressoPct >= 100 ? "#10b981" : "#6366f1",
                  borderRadius: 99, transition: "width 0.8s ease",
                }} />
              </div>
              {items.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {items.map((item, i) => (
                    <Link key={i} href={item.href} style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "6px 10px", borderRadius: 8,
                      background: `${item.color}12`, border: `1px solid ${item.color}25`,
                      textDecoration: "none",
                    }}>
                      <span style={{ fontSize: 14 }}>{item.icon}</span>
                      <span style={{ fontSize: 12, color: item.color, fontWeight: 500 }}>{item.label}</span>
                    </Link>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: 12, color: "#10b981", fontWeight: 600 }}>✅ Tudo em dia! Continue assim.</p>
              )}
              {hoje.streakAtRisk && (
                <p style={{ fontSize: 11, color: "#f97316", marginTop: 8, fontWeight: 600 }}>
                  🔥 Streak de {hoje.streak} dias em risco — estude hoje para manter!
                </p>
              )}
            </div>
          );
        })()}

        {/* ── Cronograma de Hoje ───────────────────────────────── */}
        {cronHoje.length > 0 && (() => {
          const concluidos = cronHoje.filter(b => b.concluido).length;
          const ATIV_COLORS: Record<string, string> = {
            "Questões": "#6366f1", "Flashcards": "#10b981", "Leitura": "#3b82f6",
            "Revisão": "#f59e0b", "Simulado": "#8b5cf6", "Redação": "#f43f5e",
          };
          return (
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "16px 20px", marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#a5b4fc" }}>📅 Hoje no cronograma</span>
                <span style={{ fontSize: 11, color: "#6b7280" }}>{concluidos}/{cronHoje.length} concluídos</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {cronHoje.map((b, i) => {
                  const color = ATIV_COLORS[b.atividade] ?? "#6b7280";
                  return (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", gap: 12,
                      opacity: b.concluido ? 0.5 : 1,
                    }}>
                      <span style={{ fontSize: 11, color: "#6b7280", fontVariantNumeric: "tabular-nums", minWidth: 36 }}>{b.hora}</span>
                      <div style={{ width: 3, height: 3, borderRadius: "50%", background: color, flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: b.concluido ? "#6b7280" : "#e2e8f0", flex: 1, textDecoration: b.concluido ? "line-through" : "none" }}>
                        {b.atividade}
                      </span>
                      <span style={{ fontSize: 10, color: "#6b7280" }}>{b.durMin}min</span>
                    </div>
                  );
                })}
              </div>
              <a href="/cronograma" style={{ display: "block", marginTop: 12, fontSize: 11, color: "#6366f1", textDecoration: "none" }}>Ver cronograma completo →</a>
            </div>
          );
        })()}

        {/* ── Diagnóstico Semanal IA ───────────────────────────── */}
        {(() => {
          const diag = diagResult?.diagnostico;
          const color = NIVEL_COLORS[diag?.nivel ?? "inicio"] ?? "#6b7280";
          return (
            <div style={{
              background: `${color}10`,
              border: `1px solid ${color}30`,
              borderRadius: 16, padding: "18px 20px", marginBottom: 20,
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                <div style={{ fontSize: 28, lineHeight: 1, flexShrink: 0 }}>
                  {diagLoading ? "🧠" : diag?.emoji ?? "📊"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color }}>
                      {diagLoading ? "Gerando diagnóstico semanal…" : (diag?.titulo ?? "Diagnóstico Semanal")}
                    </span>
                    {!diagLoading && (
                      <button
                        onClick={() => { setDiagResult(null); loadOrGenerateDiag(); }}
                        style={{ fontSize: 10, color: "#7c84a0", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, padding: "3px 8px", cursor: "pointer" }}
                      >
                        ↻ Atualizar
                      </button>
                    )}
                  </div>
                  {diagLoading ? (
                    <div style={{ fontSize: 12, color: "#7c84a0" }}>A IA está analisando seu desempenho desta semana…</div>
                  ) : diag ? (
                    <>
                      <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.6, marginBottom: 8 }}>{diag.resumo}</div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {diag.pontoForte && (
                          <div style={{ fontSize: 11, background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 6, padding: "3px 8px", color: "#34d399" }}>
                            💪 {diag.pontoForte}
                          </div>
                        )}
                        {diag.pontoFraco && (
                          <div style={{ fontSize: 11, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 6, padding: "3px 8px", color: "#f87171" }}>
                            ⚠️ {diag.pontoFraco}
                          </div>
                        )}
                      </div>
                      {diag.recomendacao && (
                        <div style={{ marginTop: 8, fontSize: 11, color: color, fontWeight: 600 }}>
                          → {diag.recomendacao}
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{ fontSize: 12, color: "#7c84a0" }}>
                      Responda questões para gerar seu diagnóstico desta semana.
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── Questão do Dia ───────────────────────────────────── */}
        {qdDia?.question && (() => {
          const q = qdDia.question!;
          const opts = [
            { key: "A", text: q.optionA }, { key: "B", text: q.optionB },
            { key: "C", text: q.optionC }, { key: "D", text: q.optionD },
            { key: "E", text: q.optionE },
          ].filter(o => o.text);
          const answered = qdDia.answeredToday;
          const correct = qdDia.answeredCorrect;
          return (
            <div style={{
              background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)",
              borderRadius: 16, padding: "16px 20px", marginBottom: 20,
              position: "relative",
            }}>
              {qdXpFlash && (
                <div style={{
                  position: "absolute", top: 12, right: 16,
                  background: "#6366f1", color: "#fff", borderRadius: 99,
                  padding: "4px 12px", fontSize: 12, fontWeight: 700,
                  animation: "bounce 1s ease",
                }}>⚡ +2 XP</div>
              )}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: qdExpanded ? 14 : 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 22 }}>🎯</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#34d399" }}>
                      Questão do Dia
                      {answered && (
                        <span style={{ marginLeft: 8, fontSize: 11, color: correct ? "#10b981" : "#ef4444", fontWeight: 600 }}>
                          {correct ? "✓ Acertou!" : "✗ Errou"}
                        </span>
                      )}
                    </div>
                    {q.banca && <div style={{ fontSize: 11, color: "#7c84a0" }}>{q.banca}{q.year ? ` · ${q.year}` : ""}</div>}
                  </div>
                </div>
                <button
                  onClick={() => setQdExpanded(v => !v)}
                  style={{ fontSize: 11, color: "#34d399", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 8, padding: "5px 12px", cursor: "pointer", fontWeight: 600 }}
                >
                  {qdExpanded ? "Fechar" : answered ? "Ver questão" : "Responder"}
                </button>
              </div>
              {qdExpanded && (
                <>
                  <p style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.7, marginBottom: 14 }}>{q.statement}</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {opts.map(({ key, text }) => {
                      const isSel = (qdSelected ?? (answered ? q.answer : null)) === key;
                      const isCorr = key === q.answer;
                      let bg = "rgba(255,255,255,0.04)";
                      let borderColor = "rgba(255,255,255,0.1)";
                      let textColor = "#94a3b8";
                      if (answered || qdSelected) {
                        if (isCorr)      { bg = "rgba(16,185,129,0.1)"; borderColor = "rgba(16,185,129,0.4)"; textColor = "#34d399"; }
                        else if (isSel)  { bg = "rgba(239,68,68,0.1)";  borderColor = "rgba(239,68,68,0.4)"; textColor = "#f87171"; }
                      }
                      return (
                        <button key={key}
                          disabled={!!(answered || qdSelected)}
                          onClick={() => handleQdAnswer(key)}
                          style={{
                            display: "flex", alignItems: "flex-start", gap: 10,
                            background: bg, border: `1px solid ${borderColor}`,
                            borderRadius: 10, padding: "10px 14px",
                            textAlign: "left", color: textColor, fontSize: 13,
                            cursor: answered || qdSelected ? "default" : "pointer",
                            transition: "background 0.2s",
                          }}
                        >
                          <span style={{ fontWeight: 700, flexShrink: 0 }}>{key})</span>
                          <span>{text}</span>
                        </button>
                      );
                    })}
                  </div>
                  {(answered || qdSelected) && q.explanation && (
                    <div style={{ marginTop: 12, fontSize: 12, color: "#7c84a0", lineHeight: 1.6, background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "10px 14px" }}>
                      <strong style={{ color: "#94a3b8" }}>Explicação:</strong> {q.explanation}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })()}

        {/* ── Quick actions ────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 24 }}>
          {QUICK_ACTIONS.map(a => (
            <Link key={a.href} href={a.href} style={{
              background: a.bg, border: `1px solid ${a.border}`,
              borderRadius: 14, padding: "16px 12px",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 7,
              textDecoration: "none", color: "inherit",
              transition: "transform 0.15s, box-shadow 0.15s",
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 24px ${a.border}`; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ""; (e.currentTarget as HTMLElement).style.boxShadow = ""; }}
            >
              <div style={{ fontSize: 26 }}>{a.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{a.label}</div>
              <div style={{ fontSize: 11, color: "#7c84a0", textAlign: "center" }}>{a.sub}</div>
            </Link>
          ))}
        </div>

        {/* ── Todos os Recursos ─────────────────────────────────── */}
        <div style={{ marginBottom: 28 }}>
          <div style={{
            fontSize: 15, fontWeight: 700, color: "#a5b4fc",
            marginBottom: 16, display: "flex", alignItems: "center", gap: 8,
          }}>
            🗂️ Todos os recursos
            <span style={{ fontSize: 11, color: "#6b7280", fontWeight: 400 }}>— acesso rápido a tudo</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {ALL_CATEGORIES.map(cat => (
              <div key={cat.title}>
                <div style={{
                  fontSize: 12, fontWeight: 700, color: cat.color,
                  marginBottom: 8, letterSpacing: "0.03em",
                }}>
                  {cat.title}
                </div>
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
                  gap: 8,
                }}>
                  {cat.items.map(item => (
                    <Link
                      key={item.href}
                      href={item.href}
                      style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "9px 12px",
                        background: `${cat.color}09`,
                        border: `1px solid ${cat.color}20`,
                        borderRadius: 10,
                        textDecoration: "none", color: "#cbd5e1",
                        fontSize: 12, fontWeight: 500,
                        transition: "background 0.15s, border-color 0.15s, color 0.15s",
                      }}
                      onMouseEnter={e => {
                        const el = e.currentTarget as HTMLElement;
                        el.style.background = `${cat.color}18`;
                        el.style.borderColor = `${cat.color}45`;
                        el.style.color = "#fff";
                      }}
                      onMouseLeave={e => {
                        const el = e.currentTarget as HTMLElement;
                        el.style.background = `${cat.color}09`;
                        el.style.borderColor = `${cat.color}20`;
                        el.style.color = "#cbd5e1";
                      }}
                    >
                      <span style={{ fontSize: 15, flexShrink: 0 }}>{item.icon}</span>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Subject cards ────────────────────────────────────── */}
        {subjectStats.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, color: "#a5b4fc" }}>📖 Desempenho por matéria</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
              {subjectStats.slice(0, 8).map((s, i) => {
                const color = SUBJECT_COLORS[i % SUBJECT_COLORS.length];
                const abbr = s.name.split(/\s+/).map((w: string) => w[0]).join("").slice(0, 3).toUpperCase();
                return (
                  <div key={s.name} style={{
                    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
                    borderRadius: 14, padding: "16px 14px",
                    display: "flex", alignItems: "center", gap: 14,
                  }}>
                    <div style={{ position: "relative", flexShrink: 0 }}>
                      <CircularProgress pct={s.accuracy} size={52} stroke={5} color={color} />
                      <div style={{
                        position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 10, fontWeight: 700, color, textAlign: "center"
                      }}>{abbr}</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.name}</div>
                      <div style={{ fontSize: 11, color: "#7c84a0" }}>{s.total} questões</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color }}>{s.accuracy}%</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Badges ───────────────────────────────────────────── */}
        {badges.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, color: "#a5b4fc" }}>🏆 Conquistas</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {badges.map(b => (
                <div key={b.id} style={{
                  background: b.unlocked ? "rgba(245,158,11,0.12)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${b.unlocked ? "rgba(245,158,11,0.3)" : "rgba(255,255,255,0.07)"}`,
                  borderRadius: 12, padding: "12px 16px",
                  display: "flex", alignItems: "center", gap: 10,
                  opacity: b.unlocked ? 1 : 0.45, minWidth: 160,
                }}>
                  <div style={{ fontSize: 24 }}>{b.icon}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: b.unlocked ? "#fbbf24" : "#7c84a0" }}>{b.label}</div>
                    <div style={{ fontSize: 11, color: "#7c84a0" }}>{b.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Empty state ──────────────────────────────────────── */}
        {!loading && totalAnswered === 0 && (
          <div style={{
            background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)",
            borderRadius: 16, padding: "36px 24px", textAlign: "center",
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🚀</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Comece sua jornada!</div>
            <div style={{ fontSize: 14, color: "#7c84a0", marginBottom: 20 }}>
              Responda sua primeira questão e veja seu progresso aqui.
            </div>
            <Link href="/workspace" style={{
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              color: "#fff", borderRadius: 10, padding: "11px 24px",
              fontSize: 14, fontWeight: 600, textDecoration: "none",
              display: "inline-block",
            }}>
              📚 Ir para Estudar
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}
