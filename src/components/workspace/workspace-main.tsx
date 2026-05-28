"use client";
import { useState, useRef, useEffect } from "react";
import { BookOpen, Target, Layers, ChevronRight, Clock, CheckCircle2, XCircle, RotateCcw, ClipboardList, Filter, Pause, Play, ArrowLeft, Flame, RefreshCw, Calendar, Sparkles, TrendingUp, AlertCircle, Brain, Lock, X, Search, Plus, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { SimuladoClient } from "@/app/(dashboard)/simulado/simulado-client";
import { SimuladoBanca } from "@/components/workspace/simulado-banca";
import RelatorioPage from "@/app/(dashboard)/relatorio/page";
import { RedacaoClient } from "@/app/(dashboard)/redacao/redacao-client";
import { CasoClient } from "@/app/(dashboard)/caso/caso-client";
import { PlanosClient } from "@/app/(dashboard)/planos/planos-client";
import { MentorChat } from "@/components/mentor/mentor-chat";
import { EditalDecoder } from "@/components/workspace/edital-decoder";
import { EditalWatch } from "@/components/workspace/edital-watch";
import { ModoCompanhia } from "@/components/workspace/modo-companhia";
import { QuestoesAdaptativas } from "@/components/workspace/questoes-adaptativas";
import { PomodoroTimer } from "@/components/workspace/pomodoro-timer";
import { PushToggle } from "@/components/push-toggle";
import { CATEGORIAS, BANCAS } from "@/lib/agents";

interface Agent { id: string; name: string; description: string; color: string; area?: string | null; categoria?: string | null; banca?: string | null; isPremium?: boolean; avatar?: string | null; }
interface Subject { id: string; name: string; slug: string; }
interface Profile { cargo: string | null; orgao: string | null; dataProva: string | null; dificuldades: string | null; onboardingDone: boolean; }

type Tab = "materiais" | "questoes" | "flashcards" | "simulados";

interface Props {
  agents: Agent[];
  allAgents: Agent[];
  activeAgentIds: string[];
  maxAgents: number;
  subjects: Subject[];
  profile: Profile;
  userId: string;
  aiCreditsTotal: number;
  subscriptionEndDate?: string | null;
  isPremium: boolean;
  isExpired?: boolean;
}

// Dias até a data
function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function fmtNextReview(dateStr: string | null): string {
  if (!dateStr) return "Nova";
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff <= 0) return "Vence hoje";
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return days === 1 ? "Amanhã" : `Em ${days} dias`;
}

// ── CircularProgress (PCBA Elite) ─────────────────────────────────────────────
function CircularProgress({ pct, color, size = 40, stroke = 4 }: { pct: number; color: string; size?: number; stroke?: number }) {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)", flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: "stroke-dashoffset .6s ease" }} />
    </svg>
  );
}

// ── Confetti (PCBA Elite) ─────────────────────────────────────────────────────
const CONFETTI_COLORS = ["#6366f1","#f59e0b","#10b981","#ef4444","#8b5cf6","#3b82f6","#ec4899","#f97316","#facc15","#14b8a6"];
function Confetti({ onDone }: { onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 3200); return () => clearTimeout(t); }, []);
  const particles = Array.from({ length: 55 }, (_, i) => ({
    left: `${(Math.random() * 100).toFixed(1)}%`,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    delay: `${(Math.random() * 0.8).toFixed(2)}s`,
    dur: `${(1.8 + Math.random() * 1.4).toFixed(2)}s`,
    size: i % 4 === 0 ? 11 : 7,
    round: i % 3,
  }));
  return (
    <div className="fixed inset-0 z-[1000] pointer-events-none overflow-hidden">
      {particles.map((p, i) => (
        <div key={i} style={{
          position: "absolute", width: p.size, height: p.size,
          borderRadius: p.round === 0 ? "50%" : p.round === 1 ? "2px" : "0",
          background: p.color, left: p.left, top: "-20px",
          animation: `confettiFall ${p.dur} linear ${p.delay} forwards`,
        }} />
      ))}
    </div>
  );
}

// ── Toast de celebração (PCBA Elite) ─────────────────────────────────────────
function CelebrationToast({ msg }: { msg: string }) {
  return (
    <div className="fixed bottom-8 left-1/2 z-[999] pointer-events-none"
      style={{ transform: "translateX(-50%)", animation: "toastIn .35s ease, toastOut .4s ease 2.8s forwards" }}>
      <div className="px-6 py-3 rounded-2xl text-sm font-bold text-white text-center whitespace-nowrap"
        style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", boxShadow: "0 8px 32px rgba(99,102,241,.45)" }}>
        {msg}
      </div>
    </div>
  );
}

// ── Paleta de cores por matéria ───────────────────────────────────────────────
const PALETTE = ["#6366f1","#f59e0b","#10b981","#ef4444","#8b5cf6","#3b82f6","#ec4899","#14b8a6","#f97316","#84cc16"];

function getSubjectAbbr(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return name.slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function getSubjectColor(idx: number): string {
  return PALETTE[idx % PALETTE.length];
}

function PremiumGateInline({ recurso, desc }: { recurso: string; desc: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-6">
      <div className="w-16 h-16 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-3xl mb-4">⚡</div>
      <h3 className="font-bold text-base mb-2">{recurso}</h3>
      <p className="text-sm text-gray-500 max-w-xs mb-6">{desc}</p>
      <a href="/planos" className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-sm font-medium transition-colors">
        Ver planos →
      </a>
    </div>
  );
}

// ── Tela bloqueada (Trial) ────────────────────────────────────────────────────
function LockedSection({ recurso, desc, onUpgrade }: { recurso: string; desc: string; onUpgrade: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-6">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 relative"
        style={{ background: "linear-gradient(135deg,rgba(99,102,241,0.15),rgba(139,92,246,0.08))", border: "1px solid rgba(99,102,241,0.25)" }}>
        <Lock size={24} className="text-indigo-400" />
      </div>
      <h3 className="font-bold text-base mb-2 text-white">{recurso}</h3>
      <p className="text-sm text-gray-500 max-w-xs mb-6">{desc}</p>
      <button onClick={onUpgrade}
        className="px-6 py-3 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
        style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", boxShadow: "0 0 20px rgba(99,102,241,0.35)" }}>
        ⚡ Fazer upgrade para acessar
      </button>
      <p className="text-[11px] text-gray-600 mt-3">Disponível nos planos pagos</p>
    </div>
  );
}

// ── Modal de upgrade (Trial) ──────────────────────────────────────────────────
function UpgradeModal({ recurso, onClose }: { recurso: string; onClose: () => void }) {
  const beneficios = [
    "Questões ilimitadas (Trial: 20/dia)",
    "Simulados com gabarito comentado",
    "Relatório avançado de desempenho",
    "Artigos e materiais completos",
    "Redação com correção por IA",
    "Casos práticos e companhia de estudos",
    "Mentores IA sem limite de mensagens",
  ];
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      onClick={onClose}>
      <div className="w-full max-w-sm rounded-3xl overflow-hidden relative"
        style={{ background: "linear-gradient(160deg,#0f1520,#0a0d14)", border: "1px solid rgba(255,255,255,0.1)" }}
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4 text-center"
          style={{ background: "linear-gradient(135deg,rgba(99,102,241,0.15),rgba(139,92,246,0.08))" }}>
          <button onClick={onClose} className="absolute right-4 top-4 p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition-colors">
            <X size={16} />
          </button>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 text-2xl"
            style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", boxShadow: "0 8px 24px rgba(99,102,241,0.4)" }}>
            ⚡
          </div>
          <h2 className="text-white font-bold text-lg mb-1">Desbloqueie o {recurso}</h2>
          <p className="text-gray-400 text-sm">Faça upgrade para acessar todos os recursos da plataforma.</p>
        </div>

        {/* Benefícios */}
        <div className="px-6 py-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-3 font-semibold">O que você desbloqueia:</p>
          <div className="space-y-2">
            {beneficios.map(b => (
              <div key={b} className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                </div>
                <span className="text-sm text-gray-300">{b}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="px-6 pb-6 space-y-2">
          <a href="/planos"
            className="block w-full py-3.5 rounded-2xl font-bold text-sm text-center transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", boxShadow: "0 0 24px rgba(99,102,241,0.4)" }}>
            Ver planos e preços →
          </a>
          <button onClick={onClose}
            className="block w-full py-2.5 text-sm text-gray-600 hover:text-gray-400 transition-colors text-center">
            Continuar no plano gratuito
          </button>
        </div>
      </div>
    </div>
  );
}

function getDifficultyBadge(accuracy: number | null): { label: string; color: string; emoji: string } {
  if (accuracy === null) return { label: "Iniciar", emoji: "▶", color: "text-gray-500 bg-white/5 border-white/10" };
  if (accuracy < 50)     return { label: "Ponto fraco", emoji: "⚠", color: "text-red-400 bg-red-500/10 border-red-500/20" };
  if (accuracy < 75)     return { label: "Progredindo", emoji: "📈", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" };
  return                        { label: "Dominando",   emoji: "✓", color: "text-green-400 bg-green-500/10 border-green-500/20" };
}

type NavId = "estudar" | "mentor" | "flash" | "simulado" | "relatorio" | "redacao" | "casos" | "artigos" | "planos" | "estrategia" | "edital" | "companhia" | "pomodoro";

const NAV_ITEMS: { id: NavId; label: string; icon: string }[] = [
  { id: "estudar",   label: "Estudar",    icon: "📚" },
  { id: "mentor",    label: "Mentor",     icon: "🎓" },
  { id: "estrategia",label: "Estratégia", icon: "🗺️" },
  { id: "edital",    label: "Edital",     icon: "📄" },
  { id: "simulado",  label: "Simulado",   icon: "🎯" },
  { id: "flash",     label: "Flashcards", icon: "🃏" },
  { id: "relatorio", label: "Relatório",  icon: "📊" },
  { id: "redacao",   label: "Redação",    icon: "✍️" },
  { id: "casos",     label: "Casos",      icon: "🔍" },
  { id: "artigos",   label: "Artigos",    icon: "📖" },
  { id: "companhia", label: "Companhia",  icon: "👥" },
  { id: "pomodoro",  label: "Pomodoro",   icon: "🍅" },
  { id: "planos",    label: "Planos",     icon: "💳" },
];

// ── EditalTabs: Decodificar + Watch ──────────────────────────────────────────
function EditalTabs({ userId }: { userId: string }) {
  const [tab, setTab] = useState<"decoder" | "watch">("decoder");
  return (
    <div className="flex flex-col flex-1">
      <div className="flex gap-1 px-4 pt-4 pb-0">
        {([
          { id: "decoder" as const, label: "📄 Decodificar Edital" },
          { id: "watch"   as const, label: "🔔 Monitorar Órgãos" },
        ]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn(
              "px-4 py-2 rounded-t-lg text-sm font-medium border-b-2 transition-colors",
              tab === t.id
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-gray-500 hover:text-gray-300"
            )}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="border-t border-white/8 flex-1 overflow-y-auto">
        {tab === "decoder" && <EditalDecoder userId={userId} />}
        {tab === "watch"   && <EditalWatch userId={userId} />}
      </div>
    </div>
  );
}

// Wrapper compacto — evita conflito de "use client" em arquivo importado
function PushToggleCompact() {
  return <PushToggle compact />;
}

export function WorkspaceMain({ agents, allAgents, activeAgentIds, maxAgents, subjects, profile, userId, aiCreditsTotal, subscriptionEndDate, isPremium, isExpired = false }: Props) {
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [activeNav, setActiveNav] = useState<NavId>("estudar");
  const [activeTab, setActiveTab] = useState<Tab>("materiais");
  const [content, setContent] = useState<{ materiais: unknown[]; questoes: unknown[]; flashcards: unknown[] }>({ materiais: [], questoes: [], flashcards: [] });
  const [loadingContent, setLoadingContent] = useState(false);
  // (old floating pomodoro state removed — Pomodoro now has its own full tab/component)
  const [homeStats, setHomeStats] = useState<{
    totalAnswered: number; overallAccuracy: number; streak: number; todayCount: number;
    xp: number; levelName: string; levelColor: string; xpProgress: number;
    subjectStats: { name: string; subjectId: string; accuracy: number; total: number }[];
    flashcardDueToday: number;
    pontoCritico: { subjectName: string; subjectId: string; accuracy: number; urgencia: string }[];
    prontidao: number | null;
  } | null>(null);
  const [celebrate, setCelebrate] = useState<{ msg: string } | null>(null);
  const [upgradeModal, setUpgradeModal] = useState<string | null>(null); // nome do recurso bloqueado
  const [metas, setMetas] = useState<{
    metas: { questoesMeta: number; flashcardsMeta: number; simuladosMeta: number; casosMeta: number; redacaoMeta: number };
    progresso: { questoes: number; flashcards: number; simulados: number; casos: number; redacao: number };
  } | null>(null);
  const [editingMetas, setEditingMetas] = useState(false);
  const [showSubjectManager, setShowSubjectManager] = useState(false);
  const [allSubjects, setAllSubjects] = useState<{ id: string; name: string; categoria?: string }[]>([]);
  const [activeSubjectIds, setActiveSubjectIds] = useState<Set<string>>(new Set(subjects.map(s => s.id)));
  const [subjectSearch, setSubjectSearch] = useState("");
  const [savingSubjects, setSavingSubjects] = useState(false);

  async function openSubjectManager() {
    setShowSubjectManager(true);
    setActiveSubjectIds(new Set(subjects.map(s => s.id)));
    if (allSubjects.length === 0) {
      const res = await fetch("/api/subjects");
      if (res.ok) { const d = await res.json(); setAllSubjects(d.subjects ?? []); }
    }
  }

  async function saveSubjects() {
    setSavingSubjects(true);
    await fetch("/api/workspace/materias", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subjectIds: [...activeSubjectIds] }),
    });
    setSavingSubjects(false);
    setShowSubjectManager(false);
    window.location.reload();
  }
  const [simuladoHistory, setSimuladoHistory] = useState<{ id: number; total: number; correct: number; timeSecs: number; createdAt: string }[]>([]);
  const [planos, setPlanos] = useState<{ id: string; name: string; slug: string; price: number; intervalDays: number; aiCreditsPerWeek: number; maxAgents: number; maxProfiles: number; maxQuestionsPerWeek?: number; maxFlashcardsPerWeek?: number; maxSimuladosPerWeek?: number; maxRedacoesPerWeek?: number; maxCasosPerWeek?: number; hasEditalDecoder?: boolean; hasPdfLibrary?: boolean; hasGroupStudy?: boolean; hasLongTermMemory?: boolean; features: string[]; active: boolean }[]>([]);
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);

  const daysLeft = daysUntil(subscriptionEndDate);

  // Funcionalidades bloqueadas para trial (isPremium = false)
  const TRIAL_LOCKED: Partial<Record<NavId, string>> = {
    simulado:  "Simulados",
    relatorio: "Relatório de Desempenho",
    artigos:   "Artigos Jurídicos",
    companhia: "Modo Companhia",
    redacao:   "Redação com IA",
    casos:     "Estudo de Caso",
  };

  function tryNav(id: NavId) {
    if (!isPremium && TRIAL_LOCKED[id]) {
      setUpgradeModal(TRIAL_LOCKED[id]!);
    } else {
      setActiveNav(id);
    }
  }

  // Escuta evento do QuestoesTab para navegar ao mentor quando não há questões
  useEffect(() => {
    function onGoMentor() { setActiveNav("mentor"); setSelectedSubject(null); }
    window.addEventListener("aprovai:go-mentor", onGoMentor);
    return () => window.removeEventListener("aprovai:go-mentor", onGoMentor);
  }, []);

  // Escuta evento de navegação disparado pelos action cards [[IR:X]] do mentor
  useEffect(() => {
    function onNavigate(e: Event) {
      const detail = (e as CustomEvent<{ nav: string }>).detail;
      if (detail?.nav) setActiveNav(detail.nav as NavId);
    }
    window.addEventListener("aprovai:navigate", onNavigate);
    return () => window.removeEventListener("aprovai:navigate", onNavigate);
  }, []);

  // Busca histórico de simulados quando abre a aba
  useEffect(() => {
    if (activeNav !== "simulado") return;
    fetch("/api/simulados")
      .then(r => r.ok ? r.json() : [])
      .then(d => setSimuladoHistory(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [activeNav]);

  // Busca planos quando abre a aba
  useEffect(() => {
    if (activeNav !== "planos") return;
    fetch("/api/workspace/planos-info")
      .then(r => r.ok ? r.json() : { plans: [], currentPlanId: null })
      .then((d: { plans?: typeof planos; currentPlanId?: string | null }) => {
        setPlanos(d.plans ?? []);
        setCurrentPlanId(d.currentPlanId ?? null);
      })
      .catch(() => {});
  }, [activeNav]);



  useEffect(() => {
    fetch("/api/relatorio")
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return;
        setHomeStats({
          totalAnswered: d.totalAnswered ?? 0,
          overallAccuracy: Math.round(d.overallAccuracy ?? 0),
          streak: d.streak ?? 0,
          todayCount: d.todayCount ?? 0,
          xp: d.xp ?? 0,
          levelName: d.level?.name ?? "Iniciante",
          levelColor: d.level?.color ?? "#8b949e",
          xpProgress: d.progress ?? 0,
          subjectStats: d.subjectStats ?? [],
          flashcardDueToday: d.flashcardStats?.dueToday ?? 0,
          pontoCritico: d.pontoCritico ?? [],
          prontidao: d.prontidao ?? null,
        });
      })
      .catch(() => {});
    // Carrega metas semanais em paralelo
    fetch("/api/workspace/metas")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setMetas(d); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedSubject) return;
    setLoadingContent(true);
    fetch(`/api/workspace/conteudo?subjectId=${selectedSubject.id}`)
      .then(r => r.json())
      .then(d => {
        setContent({ materiais: d.materiais ?? [], questoes: d.questoes ?? [], flashcards: d.flashcards ?? [] });
        setLoadingContent(false);
      });
  }, [selectedSubject]);

  // Abre aba mentor quando vem do onboarding (?welcome=1)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("welcome") === "1") {
      window.history.replaceState({}, "", "/workspace");
      setActiveNav("mentor");
    }
  }, []);

  const tabs = [
    { id: "materiais" as Tab, label: "Materiais", icon: BookOpen, count: content.materiais.length },
    { id: "questoes" as Tab, label: "Questões", icon: Target, count: content.questoes.length },
    { id: "flashcards" as Tab, label: "Flashcards", icon: Layers, count: content.flashcards.length },
    { id: "simulados" as Tab, label: "Simulados", icon: ClipboardList, count: 0 },
  ];

  function handleTabChange(tab: Tab) {
    setActiveTab(tab);
  }

  function onProgressUpdate(questionId: number, _nextReview: string) {
    setContent(c => ({
      ...c,
      questoes: (c.questoes as Question[]).map(q =>
        q.id === questionId ? { ...q, _nextReview } : q
      ),
    }));
  }

  return (
    <div className="flex flex-col min-h-screen text-white overflow-hidden bg-[#080c18]">

        {/* ── Banner de expiração ── */}
        {isExpired && (
          <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-red-500/10 border-b border-red-500/20 flex-shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <p className="text-xs text-red-300 truncate">
                <span className="font-semibold">Seu acesso expirou.</span>{" "}
                Assine um plano para continuar seus estudos.
              </p>
            </div>
            <a href="/planos"
              className="flex-shrink-0 px-3 py-1 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-semibold transition-colors">
              Ver planos
            </a>
          </div>
        )}

        {/* ── Top bar ── */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-white/[0.06] bg-[#0a0d14] flex-shrink-0">
          {selectedSubject && activeNav === "estudar" && (
            <button onClick={() => setSelectedSubject(null)}
              className="p-1.5 rounded-lg hover:bg-white/5 text-gray-500 hover:text-white transition-colors flex-shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}

          {/* Mode tabs: Questões | Mentor IA */}
          <div className="flex gap-1 rounded-xl bg-white/[0.04] border border-white/[0.06] p-1">
            {([
              { id: "estudar" as NavId, icon: "📚", label: selectedSubject ? selectedSubject.name : "Questões" },
              { id: "mentor"  as NavId, icon: "🎓", label: "Mentor IA" },
            ] as { id: NavId; icon: string; label: string }[]).map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveNav(tab.id); if (tab.id === "mentor") setSelectedSubject(null); }}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                  activeNav === tab.id
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-300"
                )}
              >
                <span>{tab.icon}</span>
                <span className="max-w-[120px] truncate">{tab.label}</span>
                {tab.id === "mentor" && (
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0"
                    style={{ animation: "pulse 2s infinite" }} />
                )}
              </button>
            ))}
          </div>

          <div className="flex-1" />

          {/* Push toggle + créditos */}
          <PushToggleCompact />
          {!isPremium && !isExpired && (
            <button onClick={() => setUpgradeModal("Premium")}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-[1.02]"
              style={{ background: "linear-gradient(135deg,rgba(99,102,241,0.2),rgba(139,92,246,0.12))", border: "1px solid rgba(99,102,241,0.3)", color: "#a5b4fc" }}>
              <Lock size={10} />
              Trial
            </button>
          )}
          {isExpired && (
            <a href="/planos"
              className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium hover:bg-indigo-600/20 transition-colors">
              ⚡ Upgrade
            </a>
          )}
        </div>

        {/* ── Conteúdo da nav ── */}
        <div className="flex-1 overflow-hidden flex flex-col">

          {/* ───── ESTUDAR ───── */}
          {activeNav === "estudar" && !selectedSubject && (
            <div className="flex-1 overflow-y-auto">

              {/* ── Topo: countdown + stats numa linha só ── */}
              <div className="mx-4 mt-3 flex gap-2">
                {/* Countdown compacto */}
                {profile.dataProva && (() => {
                  const d = daysUntil(profile.dataProva);
                  if (d === null) return null;
                  const color = d <= 7 ? "#ef4444" : d <= 30 ? "#f59e0b" : "#34d399";
                  return (
                    <a href="/workspace/perfil"
                      className="flex items-center gap-2 px-3 py-2 rounded-xl border flex-shrink-0 hover:opacity-80 transition-opacity"
                      style={{ background: color + "12", borderColor: color + "30" }}>
                      <span className="text-2xl font-black tabular-nums leading-none" style={{ color }}>{d}</span>
                      <div className="leading-tight">
                        <p className="text-[10px] font-bold leading-none" style={{ color }}>dias</p>
                        <p className="text-[9px] text-gray-500 leading-none mt-0.5">{profile.orgao ?? "para a prova"}</p>
                      </div>
                    </a>
                  );
                })()}

                {/* Stats row inline */}
                <div className="flex-1 grid grid-cols-3 rounded-xl border border-white/[0.07] bg-[#0d1117] overflow-hidden">
                  {[
                    { label: "Questões", value: String(homeStats?.totalAnswered ?? 0), color: "#a78bfa" },
                    { label: "Acerto",   value: homeStats ? `${homeStats.overallAccuracy}%` : "—", color: "#34d399" },
                    { label: "Sequência",value: `${homeStats?.streak ?? 0}d`, color: "#fb923c" },
                  ].map((s, i) => (
                    <div key={s.label} className={cn("py-2.5 text-center", i < 2 && "border-r border-white/[0.06]")}>
                      <div className="text-lg font-black tabular-nums" style={{ color: s.color }}>{s.value}</div>
                      <div className="text-[9px] text-gray-500 mt-0.5">{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Meta do dia ── */}
              {(() => {
                const today = homeStats?.todayCount ?? 0;
                const limit = 20;
                const pct = Math.min(100, (today / limit) * 100);
                const atLimit = !isPremium && today >= limit;
                return (
                  <div className="mx-4 mt-2 rounded-xl border px-4 py-2.5"
                    style={{ background: atLimit ? "rgba(99,102,241,0.07)" : "rgba(255,255,255,0.03)", borderColor: atLimit ? "rgba(99,102,241,0.25)" : "rgba(255,255,255,0.07)" }}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-gray-300">🎯 {atLimit ? "Limite diário atingido" : "Questões hoje"}</span>
                      <span className="text-xs font-bold" style={{ color: atLimit ? "#a5b4fc" : "#6366f1" }}>
                        {today}/{isPremium ? "∞" : limit}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/8 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, background: atLimit ? "linear-gradient(90deg,#6366f1,#8b5cf6)" : "#6366f1" }} />
                    </div>
                    {atLimit && (
                      <a href="/planos" className="block mt-1.5 text-center text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">
                        ⚡ Upgrade para questões ilimitadas →
                      </a>
                    )}
                  </div>
                );
              })()}

              {/* ── Streak (só quando relevante) ── */}
              {homeStats && homeStats.streak >= 3 && (
                <div className="mx-4 mt-2 rounded-xl px-3 py-2 flex items-center gap-2.5"
                  style={{
                    background: homeStats.streak >= 30 ? "rgba(234,179,8,0.08)" : homeStats.streak >= 7 ? "rgba(249,115,22,0.08)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${homeStats.streak >= 30 ? "rgba(234,179,8,0.2)" : homeStats.streak >= 7 ? "rgba(249,115,22,0.2)" : "rgba(255,255,255,0.06)"}`,
                  }}>
                  <span className="text-xl flex-shrink-0">{homeStats.streak >= 30 ? "👑" : homeStats.streak >= 14 ? "⚡" : "🔥"}</span>
                  <p className="text-xs font-bold flex-1" style={{ color: homeStats.streak >= 30 ? "#fde047" : homeStats.streak >= 7 ? "#fb923c" : "#f97316" }}>
                    {homeStats.streak} dias seguidos — {homeStats.streak >= 30 ? "imparável 👑" : homeStats.streak >= 14 ? "consistência de elite!" : homeStats.streak >= 7 ? "uma semana completa!" : "não quebre!"}
                  </p>
                  <button onClick={() => tryNav("relatorio")} className="text-[10px] text-gray-500 hover:text-gray-300 transition-colors flex-shrink-0">
                    Relatório
                  </button>
                </div>
              )}

              {/* ── Ações rápidas compactas ── */}
              <div className="mx-4 mt-2 grid grid-cols-4 gap-1.5">
                {[
                  { icon: "🎓", label: "Mentor", action: () => setActiveNav("mentor"), color: "#6366f1", locked: false },
                  { icon: "🎯", label: "Simulado", action: () => tryNav("simulado"), color: "#f59e0b", locked: !isPremium },
                  { icon: "🔍", label: "Casos", action: () => tryNav("casos"), color: "#06b6d4", locked: !isPremium },
                  { icon: "✍️", label: "Redação", action: () => tryNav("redacao"), color: "#ec4899", locked: !isPremium },
                ].map(({ icon, label, action, color, locked }) => (
                  <button key={label} onClick={action}
                    className="relative flex flex-col items-center gap-1 py-2.5 rounded-xl border border-white/[0.07] bg-[#0d1117] hover:bg-white/[0.05] transition-all active:scale-95">
                    <span className="text-xl leading-none">{icon}</span>
                    <span className="text-[10px] font-medium text-gray-400">{label}</span>
                    {locked && <Lock size={9} className="absolute top-1.5 right-1.5 text-gray-600" />}
                  </button>
                ))}
              </div>

              {/* ── Estudar Agora ── */}
              {homeStats && (homeStats.flashcardDueToday > 0 || homeStats.pontoCritico.length > 0) && (
                <div className="mx-5 mt-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
                  <p className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2.5">⚡ Estudar agora</p>
                  <div className="flex flex-col gap-2">
                    {homeStats.flashcardDueToday > 0 && (
                      <button onClick={() => setActiveNav("flash")}
                        className="flex items-center gap-3 text-left hover:bg-amber-500/10 rounded-xl px-3 py-2 transition-colors">
                        <span className="text-xl flex-shrink-0">🃏</span>
                        <div>
                          <p className="text-sm font-semibold text-white">{homeStats.flashcardDueToday} flashcard{homeStats.flashcardDueToday > 1 ? "s" : ""} vencido{homeStats.flashcardDueToday > 1 ? "s" : ""}</p>
                          <p className="text-[11px] text-gray-500">Revisar agora para não perder o ritmo</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-600 ml-auto flex-shrink-0" />
                      </button>
                    )}

                    {homeStats.pontoCritico.slice(0, 2).map(p => {
                      const subj = subjects.find(s => s.id === p.subjectId);
                      return (
                        <button key={p.subjectName}
                          onClick={() => subj && (setSelectedSubject(subj), setActiveTab("questoes"))}
                          className="flex items-center gap-3 text-left hover:bg-amber-500/10 rounded-xl px-3 py-2 transition-colors">
                          <span className="text-xl flex-shrink-0">📉</span>
                          <div>
                            <p className="text-sm font-semibold text-white">{p.subjectName}</p>
                            <p className="text-[11px] text-red-400">{p.accuracy}% de acerto — ponto crítico</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-600 ml-auto flex-shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Metas da Semana ── */}
              {metas && (
                <div className="mx-5 mt-3 rounded-2xl border border-white/[0.06] bg-[#0d1117] p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-bold text-white uppercase tracking-wider">🎯 Metas da semana</p>
                    <button onClick={() => setEditingMetas(v => !v)}
                      className="text-[10px] text-gray-600 hover:text-gray-400 transition-colors">
                      {editingMetas ? "Concluído" : "Editar"}
                    </button>
                  </div>
                  {editingMetas ? (
                    <div className="space-y-3">
                      {([
                        { key: "questoesMeta" as const, label: "Questões/semana", icon: "🎯", max: 200 },
                        { key: "flashcardsMeta" as const, label: "Flashcards/semana", icon: "🃏", max: 100 },
                        { key: "simuladosMeta" as const, label: "Simulados/semana", icon: "📋", max: 5 },
                        { key: "casosMeta" as const, label: "Casos/semana", icon: "🔍", max: 20 },
                        { key: "redacaoMeta" as const, label: "Redações/semana", icon: "✍️", max: 10 },
                      ]).map(({ key, label, icon, max }) => (
                        <div key={key} className="flex items-center gap-3">
                          <span className="text-sm w-5">{icon}</span>
                          <span className="text-xs text-gray-400 flex-1">{label}</span>
                          <input type="number" min={1} max={max}
                            value={metas.metas[key]}
                            onChange={e => {
                              const v = Math.max(1, Math.min(max, parseInt(e.target.value) || 1));
                              const updated = { ...metas.metas, [key]: v };
                              setMetas(m => m ? { ...m, metas: updated } : m);
                              fetch("/api/workspace/metas", {
                                method: "POST", headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ [key]: v }),
                              }).catch(() => {});
                            }}
                            className="w-16 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white text-center focus:outline-none focus:border-indigo-500/50"
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {([
                        { label: "Questões", done: metas.progresso.questoes, meta: metas.metas.questoesMeta, color: "#6366f1" },
                        { label: "Flashcards", done: metas.progresso.flashcards, meta: metas.metas.flashcardsMeta, color: "#10b981" },
                        { label: "Simulados", done: metas.progresso.simulados, meta: metas.metas.simuladosMeta, color: "#f59e0b" },
                        { label: "Casos", done: metas.progresso.casos ?? 0, meta: metas.metas.casosMeta ?? 2, color: "#06b6d4" },
                        { label: "Redação", done: metas.progresso.redacao ?? 0, meta: metas.metas.redacaoMeta ?? 1, color: "#ec4899" },
                      ]).map(({ label, done, meta, color }) => {
                        const pct = Math.min(100, Math.round((done / meta) * 100));
                        const done_ = pct >= 100;
                        return (
                          <div key={label}>
                            <div className="flex justify-between text-[10px] mb-1">
                              <span className="text-gray-400">{label}</span>
                              <span style={{ color: done_ ? "#10b981" : color }} className="font-semibold">{done}/{meta} {done_ ? "✓" : ""}</span>
                            </div>
                            <div className="h-1 rounded-full bg-white/8">
                              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ── Matérias ── */}
              <div className="px-4 mt-4 pb-24">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Suas matérias <span className="text-gray-600 normal-case font-normal">({subjects.length})</span></p>
                  <button onClick={openSubjectManager}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-500 transition-all active:scale-95 shadow-md">
                    <Plus size={13} />
                    + Matérias
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {subjects.map((s, idx) => {
                    const color = getSubjectColor(idx);
                    const abbr = getSubjectAbbr(s.name);
                    const ss = homeStats?.subjectStats.find(x => x.subjectId === s.id);
                    const pct = ss && ss.total > 0 ? ss.accuracy : 0;
                    const ringColor = pct >= 70 ? "#34d399" : pct >= 40 ? color : ss?.total ? "#ef4444" : "rgba(255,255,255,0.12)";
                    const badge = getDifficultyBadge(ss?.total ? ss.accuracy : null);
                    return (
                      <button key={s.id}
                        onClick={() => { setSelectedSubject(s); setActiveTab("questoes"); }}
                        className="flex flex-col p-3 rounded-2xl border border-white/[0.07] bg-[#0d1117] hover:bg-[#131820] hover:border-white/12 transition-all text-left group active:scale-[0.97]"
                        style={{ transition: "all .15s ease" }}>
                        <div className="flex items-start justify-between mb-2">
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black flex-shrink-0"
                            style={{ background: color + "1a", border: `1px solid ${color}30`, color }}>
                            {abbr}
                          </div>
                          <div className="flex flex-col items-center gap-0.5">
                            <div className="relative">
                              <CircularProgress pct={pct} color={ringColor} size={30} stroke={2.5} />
                              <div className="absolute inset-0 flex items-center justify-center"
                                style={{ fontSize: 6.5, fontWeight: 800, color: pct > 0 ? ringColor : "rgba(255,255,255,0.2)" }}>
                                {pct > 0 ? `${pct}%` : "—"}
                              </div>
                            </div>
                            <span className="text-[7px] text-gray-500 leading-none">acerto</span>
                          </div>
                        </div>
                        <p className="text-[12px] font-semibold text-white leading-tight mb-1.5 line-clamp-2">{s.name}</p>
                        <div className="flex items-center justify-between mt-auto">
                          <span className={cn("text-[9px] px-1.5 py-0.5 rounded border font-semibold flex items-center gap-0.5", badge.color)}>
                            {badge.emoji} {badge.label}
                          </span>
                          <span className="text-[9px] text-gray-500">{ss?.total ? `${ss.total} feitas` : "Iniciar →"}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── Modal gerenciador de matérias ── */}
              {showSubjectManager && (
                <div className="fixed inset-0 z-[200] flex flex-col" style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(6px)" }}
                  onClick={e => { if (e.target === e.currentTarget) setShowSubjectManager(false); }}>
                  <div className="mt-auto mx-auto w-full max-w-lg flex flex-col rounded-t-3xl overflow-hidden"
                    style={{ background: "#1a1f2e", maxHeight: "85vh", border: "1px solid rgba(255,255,255,0.15)" }}>

                    {/* Header */}
                    <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-white/[0.10] flex-shrink-0">
                      <div>
                        <p className="text-base font-bold text-white">Gerenciar Matérias</p>
                        <p className="text-sm text-indigo-300 mt-0.5 font-medium">{activeSubjectIds.size} selecionada{activeSubjectIds.size !== 1 ? "s" : ""}</p>
                      </div>
                      <button onClick={() => setShowSubjectManager(false)}
                        className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-gray-300 hover:text-white hover:bg-white/20 transition-all">
                        <X size={18} />
                      </button>
                    </div>

                    {/* Search */}
                    <div className="px-4 py-3 flex-shrink-0">
                      <div className="flex items-center gap-2 bg-white/10 border border-white/20 rounded-xl px-3 py-2.5">
                        <Search size={15} className="text-gray-300 flex-shrink-0" />
                        <input
                          type="text"
                          placeholder="Buscar matéria..."
                          value={subjectSearch}
                          onChange={e => setSubjectSearch(e.target.value)}
                          className="flex-1 bg-transparent text-sm text-white placeholder-gray-400 focus:outline-none"
                          autoFocus
                        />
                        {subjectSearch && (
                          <button onClick={() => setSubjectSearch("")} className="text-gray-400 hover:text-white">
                            <X size={13} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Lista */}
                    <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-1.5">
                      {allSubjects.length === 0 ? (
                        <div className="flex items-center justify-center py-12">
                          <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                        </div>
                      ) : (() => {
                        const filtered = allSubjects.filter(s =>
                          s.name.toLowerCase().includes(subjectSearch.toLowerCase())
                        );
                        const ativas = filtered.filter(s => activeSubjectIds.has(s.id));
                        const inativas = filtered.filter(s => !activeSubjectIds.has(s.id));
                        const renderItem = (s: { id: string; name: string; categoria?: string }, isActive: boolean) => (
                          <button key={s.id}
                            onClick={() => setActiveSubjectIds(prev => {
                              const n = new Set(prev);
                              if (isActive) n.delete(s.id); else n.add(s.id);
                              return n;
                            })}
                            className={cn(
                              "w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-all text-left",
                              isActive
                                ? "bg-indigo-600/30 border-indigo-400/50 hover:bg-indigo-600/40"
                                : "bg-white/[0.06] border-white/[0.12] hover:bg-white/[0.10]"
                            )}>
                            <div className={cn(
                              "w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 border-2 transition-all",
                              isActive ? "bg-indigo-500 border-indigo-400" : "border-gray-500 bg-white/5"
                            )}>
                              {isActive && <Check size={13} className="text-white" strokeWidth={3} />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-white truncate">{s.name}</p>
                              {s.categoria && <p className="text-[11px] text-gray-400 capitalize mt-0.5">{s.categoria.replace(/-/g, " ")}</p>}
                            </div>
                          </button>
                        );
                        return (
                          <>
                            {ativas.length > 0 && (
                              <>
                                <p className="text-xs text-indigo-300 font-bold uppercase tracking-widest px-1 pt-1 pb-1.5">✓ Ativas ({ativas.length})</p>
                                {ativas.map(s => renderItem(s, true))}
                              </>
                            )}
                            {inativas.length > 0 && (
                              <>
                                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest px-1 pt-3 pb-1.5">Disponíveis para adicionar ({inativas.length})</p>
                                {inativas.map(s => renderItem(s, false))}
                              </>
                            )}
                            {filtered.length === 0 && (
                              <p className="text-center text-gray-600 text-sm py-8">Nenhuma matéria encontrada</p>
                            )}
                          </>
                        );
                      })()}
                    </div>

                    {/* Footer */}
                    <div className="px-4 py-4 border-t border-white/[0.12] flex gap-2 flex-shrink-0">
                      <button onClick={() => setShowSubjectManager(false)}
                        className="flex-1 py-3.5 rounded-xl border border-white/20 text-gray-300 text-sm font-semibold hover:bg-white/10 transition-all">
                        Cancelar
                      </button>
                      <button onClick={saveSubjects} disabled={savingSubjects || activeSubjectIds.size === 0}
                        className="flex-[2] py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg">
                        {savingSubjects
                          ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Salvando...</>
                          : `Salvar (${activeSubjectIds.size} matérias)`}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ───── ESTUDAR → SUBJECT VIEW ───── */}
          {activeNav === "estudar" && selectedSubject && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Tabs */}
              {(() => {
                const tabs = [
                  { id: "materiais" as Tab,  label: "Materiais",  icon: BookOpen,     count: content.materiais.length },
                  { id: "questoes" as Tab,   label: "Questões",   icon: Target,       count: content.questoes.length },
                  { id: "flashcards" as Tab, label: "Flashcards", icon: Layers,       count: content.flashcards.length },
                  { id: "simulados" as Tab,  label: "Simulados",  icon: ClipboardList, count: 0 },
                ];
                return (
                  <div className="flex border-b border-white/[0.06] bg-[#0a0d14] flex-shrink-0 overflow-x-auto bottom-tabs-scroll">
                    {tabs.map(({ id, label, icon: Icon, count }) => (
                      <button key={id} onClick={() => setActiveTab(id)}
                        className={cn(
                          "flex items-center gap-1.5 px-5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0",
                          activeTab === id ? "border-indigo-500 text-indigo-400" : "border-transparent text-gray-500 hover:text-gray-300"
                        )}>
                        <Icon className="w-4 h-4" />
                        {label}
                        {count > 0 && <span className="text-xs bg-white/10 px-1.5 rounded-full">{count}</span>}
                      </button>
                    ))}
                  </div>
                );
              })()}
              <div className="flex-1 overflow-y-auto p-5">
                {loadingContent ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : activeTab === "materiais" ? (
                  <MateriaisTab items={content.materiais as Material[]} subjectName={selectedSubject.name} />
                ) : activeTab === "questoes" ? (
                  <QuestoesAdaptativasToggle
                    subjectId={selectedSubject.id}
                    subjectName={selectedSubject.name}
                    items={content.questoes as Question[]}
                    onProgressUpdate={onProgressUpdate}
                    onCelebrate={(msg: string) => setCelebrate({ msg })}
                    isPremium={isPremium}
                    todayCount={homeStats?.todayCount ?? 0}
                  />
                ) : activeTab === "flashcards" ? (
                  <FlashcardsTab items={content.flashcards as Flashcard[]} />
                ) : (
                  <SimuladosTab />
                )}
              </div>
            </div>
          )}

          {/* ───── FLASH (sem matéria selecionada) ───── */}
          {activeNav === "flash" && (
            <FlashNavPanel
              subjects={subjects}
              onStudy={(s) => { setSelectedSubject(s); setActiveTab("flashcards"); setActiveNav("estudar"); }}
              getSubjectColor={getSubjectColor}
              getSubjectAbbr={getSubjectAbbr}
            />
          )}

          {/* ───── MENTOR (MentorChat completo com seletor) ───── */}
          {activeNav === "mentor" && (
            <div className="flex-1 overflow-hidden">
              <MentorChat
                agents={allAgents as Parameters<typeof MentorChat>[0]["agents"]}
                categorias={CATEGORIAS}
                bancas={BANCAS}
                aiCreditsLeft={aiCreditsTotal}
                aiCreditsTotal={aiCreditsTotal}
                userId={userId}
                maxAgents={maxAgents}
                activeAgentIds={activeAgentIds}
              />
            </div>
          )}

          {/* ───── ARTIGOS ───── */}
          {activeNav === "artigos" && (
            isPremium
              ? <ArtigosPanel subjects={subjects} />
              : <LockedSection recurso="Artigos Jurídicos" desc="Acesse artigos completos com referências legais e explicações para provas. Disponível nos planos pagos." onUpgrade={() => setUpgradeModal("Artigos Jurídicos")} />
          )}

          {/* ───── SIMULADO ───── */}
          {activeNav === "simulado" && (
            <div className="flex-1 overflow-y-auto flex flex-col">
              {isPremium
                ? <SimuladoBanca subjects={subjects} profile={profile} />
                : <LockedSection recurso="Simulados" desc="Faça simulados completos com gabarito comentado, ranking e análise de desempenho. Disponível nos planos pagos." onUpgrade={() => setUpgradeModal("Simulados")} />
              }
            </div>
          )}

          {/* ───── RELATÓRIO ───── */}
          {activeNav === "relatorio" && (
            <div className="flex-1 overflow-y-auto">
              {isPremium
                ? <RelatorioPage />
                : <LockedSection recurso="Relatório de Desempenho" desc="Veja gráficos detalhados de evolução, pontos fortes e fracos, e sugestões de estudo personalizadas." onUpgrade={() => setUpgradeModal("Relatório de Desempenho")} />
              }
            </div>
          )}

          {/* ───── REDAÇÃO ───── */}
          {activeNav === "redacao" && (
            <div className="flex-1 overflow-y-auto">
              {isPremium
                ? <RedacaoClient />
                : <LockedSection recurso="Redação com IA" desc="Treine redações e receba correção detalhada com IA especializada. Disponível nos planos pagos." onUpgrade={() => setUpgradeModal("Redação com IA")} />
              }
            </div>
          )}

          {/* ───── CASOS ───── */}
          {activeNav === "casos" && (
            <div className="flex-1 overflow-y-auto">
              {isPremium
                ? <CasoClient />
                : <LockedSection recurso="Estudo de Caso" desc="Resolva casos práticos com avaliação por IA. Simula provas discursivas dos principais concursos." onUpgrade={() => setUpgradeModal("Estudo de Caso")} />
              }
            </div>
          )}

          {/* ───── PLANOS ───── */}
          {activeNav === "planos" && (
            <div className="flex-1 overflow-y-auto">
              {planos.length > 0
                ? <PlanosClient plans={planos} currentPlanId={currentPlanId} />
                : <div className="flex items-center justify-center h-40"><div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
              }
            </div>
          )}

          {/* ───── EDITAL ───── */}
          {activeNav === "edital" && (
            <div className="flex-1 overflow-y-auto flex flex-col">
              <EditalTabs userId={userId} />
            </div>
          )}

          {/* ───── ESTRATÉGIA ───── */}
          {activeNav === "estrategia" && (
            <div className="flex-1 overflow-y-auto">
              <CronogramaTab profile={profile} subjects={subjects} />
            </div>
          )}

          {/* ───── COMPANHIA ───── */}
          {activeNav === "companhia" && (
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              {isPremium
                ? <ModoCompanhia userId={userId} userName={profile.cargo ?? "Estudante"} subjects={subjects} />
                : <LockedSection recurso="Modo Companhia" desc="Estude acompanhado por uma IA que conversa, motiva e faz check-ins ao longo da sessão de estudos." onUpgrade={() => setUpgradeModal("Modo Companhia")} />
              }
            </div>
          )}

          {activeNav === "pomodoro" && (
            <div className="flex-1 overflow-hidden">
              <PomodoroTimer subjects={subjects} />
            </div>
          )}

        </div>{/* fim conteúdo */}

      {/* ══ UPGRADE MODAL ══════════════════════════════════════════════════ */}
      {upgradeModal && (
        <UpgradeModal recurso={upgradeModal} onClose={() => setUpgradeModal(null)} />
      )}

      {/* ══ CONFETTI + TOAST ═══════════════════════════════════════════════ */}
      {celebrate && (
        <>
          <Confetti onDone={() => setCelebrate(null)} />
          <CelebrationToast msg={celebrate.msg} />
        </>
      )}
    </div>
  );
}

// ── Tipos locais ──────────────────────────────────────────────────────────────
interface Material { id: string; title: string; type: string; description: string | null; fileUrl: string | null; isPremium: boolean; }
interface Question {
  id: number; statement: string; answer: string; banca: string | null; year: number | null;
  optionA: string | null; optionB: string | null; optionC: string | null; optionD: string | null; optionE: string | null;
  explanation: string | null; level: string;
  artigo: string | null; dicaBanca: string | null;
  _nextReview: string | null; _interval: number | null; _seen: boolean;
}
interface Flashcard { id: string; front: string; back: string; deckName: string; setId: string; nextReview: string | null; interval: number; easeFactor: number; due: boolean; }
interface SimuladoItem {
  id: string; name: string; agentName: string | null; banca: string | null;
  totalQuestions: number; timeLimitMins: number; createdAt: string;
}
interface SimuladoQuestion {
  id: number; materia: string; statement: string; answer: string;
  optionA: string | null; optionB: string | null; optionC: string | null;
  optionD: string | null; optionE: string | null; explanation: string | null; level: string;
}

const ARTIGOS_COBRADOS: Record<string, string[]> = {
  "direito administrativo": ["Art. 37 CF/88 — Princípios da Adm. Pública (LIMPE)", "Art. 41 CF/88 — Estabilidade do servidor", "L 9784/99 — Processo Administrativo Federal", "L 8112/90 — Regime Jurídico dos Servidores", "Art. 5º CF/88 — Direitos fundamentais"],
  "direito constitucional": ["Art. 1º-4º CF/88 — Fundamentos e princípios", "Art. 5º CF/88 — Direitos e garantias", "Art. 37 CF/88 — Administração pública", "Art. 60 CF/88 — Emendas constitucionais", "Art. 102 CF/88 — Competências do STF"],
  "direito penal": ["Art. 1º-12 CP — Aplicação da lei penal", "Art. 23 CP — Excludentes de ilicitude", "Art. 107 CP — Extinção da punibilidade", "L 9605/98 — Crimes ambientais", "L 11343/06 — Lei de drogas"],
  "direito processual penal": ["Art. 1º-24 CPP — Disposições gerais", "Art. 302 CPP — Prisão em flagrante", "Art. 312 CPP — Prisão preventiva", "Art. 563 CPP — Nulidades", "L 12403/11 — Medidas cautelares"],
  "raciocínio lógico": ["Tabela-verdade", "Proposições compostas", "Silogismos", "Conjuntos e probabilidade", "Sequências e progressões"],
  "língua portuguesa": ["Crase — Art. 786 MRPR", "Concordância verbal e nominal", "Regência", "Pontuação", "Ortografia — Acordo Ortográfico 2009"],
};

function getArtigosCobrados(subjectName: string): string[] {
  const key = Object.keys(ARTIGOS_COBRADOS).find(k => subjectName.toLowerCase().includes(k));
  return key ? ARTIGOS_COBRADOS[key] : [];
}

// ── PDF Viewer inline ─────────────────────────────────────────────────────────
function PDFViewer({ url, title, onClose }: { url: string; title: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex flex-col">
      <div className="flex items-center justify-between px-5 py-3 bg-[#0a0d14] border-b border-white/8 flex-shrink-0">
        <p className="text-sm font-semibold truncate flex-1 mr-4">{title}</p>
        <div className="flex items-center gap-2">
          <a href={url} target="_blank" rel="noopener noreferrer"
            className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors px-3 py-1.5 border border-indigo-500/30 rounded-lg">
            Abrir em nova aba ↗
          </a>
          <button onClick={onClose}
            className="text-xs text-gray-500 hover:text-white transition-colors px-3 py-1.5 border border-white/10 rounded-lg">
            Fechar ✕
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden bg-[#1a1f2e]">
        <iframe
          src={url}
          className="w-full h-full border-0"
          title={title}
          allow="fullscreen"
        />
      </div>
    </div>
  );
}

// ── Tab Materiais ─────────────────────────────────────────────────────────────
function MateriaisTab({ items, subjectName }: { items: Material[]; subjectName: string }) {
  const artigos = getArtigosCobrados(subjectName);
  const typeIcon: Record<string, string> = { PDF: "📄", VIDEO: "🎬", LINK: "🔗", TEXTO: "📝" };
  const [pdfOpen, setPdfOpen] = useState<{ url: string; title: string } | null>(null);

  return (
    <div className="space-y-3">
      {pdfOpen && (
        <PDFViewer url={pdfOpen.url} title={pdfOpen.title} onClose={() => setPdfOpen(null)} />
      )}
      {items.length === 0 && <EmptyState label="Nenhum material cadastrado para essa matéria ainda." />}
      {items.map(m => (
        <div key={m.id} className="rounded-xl border border-white/5 bg-white/3 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-base">{typeIcon[m.type] ?? "📄"}</span>
                <p className="font-medium text-sm truncate">{m.title}</p>
                {m.isPremium && <span className="text-xs bg-yellow-500/10 text-yellow-400 px-1.5 py-0.5 rounded-full flex-shrink-0">Premium</span>}
              </div>
              {m.description && <p className="text-xs text-gray-500 mt-1 ml-6">{m.description}</p>}
            </div>
            <span className="text-xs bg-white/5 border border-white/10 px-2 py-0.5 rounded-full text-gray-500 flex-shrink-0">{m.type}</span>
          </div>
          {m.fileUrl && (
            <div className="mt-2 ml-6 flex items-center gap-3">
              {m.type === "PDF" ? (
                <button onClick={() => setPdfOpen({ url: m.fileUrl!, title: m.title })}
                  className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                  📄 Visualizar PDF →
                </button>
              ) : (
                <a href={m.fileUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                  Acessar material →
                </a>
              )}
            </div>
          )}
        </div>
      ))}
      {artigos.length > 0 && (
        <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4">
          <p className="text-xs font-semibold text-indigo-400 mb-2">📌 Artigos mais cobrados em {subjectName}</p>
          <ul className="space-y-1">
            {artigos.map((a, i) => (
              <li key={i} className="text-xs text-gray-400 flex items-start gap-1.5">
                <span className="text-indigo-600 flex-shrink-0">§</span>{a}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── Glossário: tipos e componentes ───────────────────────────────────────────
interface GlossTermo { termo: string; definicao: string; }

function HighlightedText({ text, termos, onTermClick }: { text: string; termos: GlossTermo[]; onTermClick: (t: GlossTermo) => void }) {
  if (termos.length === 0) return <span>{text}</span>;
  const pattern = new RegExp(`(${termos.map(t => t.termo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
  const parts = text.split(pattern);
  return (
    <span>
      {parts.map((part, i) => {
        const match = termos.find(t => t.termo.toLowerCase() === part.toLowerCase());
        return match ? (
          <span key={i} onClick={() => onTermClick(match)}
            className="cursor-pointer border-b-2 border-dotted border-amber-400 text-amber-300 hover:text-amber-200 transition-colors">
            {part}
          </span>
        ) : <span key={i}>{part}</span>;
      })}
    </span>
  );
}

function TermoTooltip({ termo, onClose }: { termo: GlossTermo; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center pb-24 px-4 pointer-events-none">
      <div className="pointer-events-auto w-full max-w-sm rounded-xl bg-[#1a1f2e] border border-amber-500/30 shadow-2xl p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <p className="text-sm font-semibold text-amber-300">📚 {termo.termo}</p>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-lg leading-none">×</button>
        </div>
        <p className="text-xs text-gray-300 leading-relaxed">{termo.definicao}</p>
      </div>
    </div>
  );
}

// ── Toggle Questões Normal vs Adaptativas ────────────────────────────────────
function QuestoesAdaptativasToggle({ subjectId, subjectName, items, onProgressUpdate, onCelebrate, isPremium, todayCount }: {
  subjectId: string; subjectName: string; items: Question[];
  onProgressUpdate: (id: number, next: string) => void;
  onCelebrate?: (msg: string) => void;
  isPremium: boolean; todayCount: number;
}) {
  const [modo, setModo] = useState<"normal" | "adaptativo">("normal");

  // Revisão Inteligente bloqueada para trial
  const handleModoAdaptativo = () => {
    if (!isPremium) { setModo("normal"); return; } // bloqueado — não muda
    setModo("adaptativo");
  };

  return (
    <div>
      <div className="flex gap-1 mb-4">
        <button onClick={() => setModo("normal")}
          className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
            modo === "normal" ? "bg-indigo-600 border-indigo-500 text-white" : "bg-white/5 border-white/10 text-gray-400 hover:text-white")}>
          <Target className="w-3.5 h-3.5" /> Por matéria
        </button>
        <button onClick={handleModoAdaptativo}
          className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors relative",
            modo === "adaptativo" ? "bg-indigo-600 border-indigo-500 text-white" : "bg-white/5 border-white/10 text-gray-400 hover:text-white",
            !isPremium && "opacity-60"
          )}>
          <Brain className="w-3.5 h-3.5" /> 🧠 Revisão Inteligente
          {!isPremium && <Lock size={10} className="ml-1 text-gray-500" />}
        </button>
      </div>
      {!isPremium && modo === "adaptativo" && (
        <LockedSection recurso="Revisão Inteligente" desc="Modo adaptativo com algoritmo SM-2 personalizado ao seu desempenho. Disponível nos planos pagos." onUpgrade={() => setModo("normal")} />
      )}
      {modo === "normal"
        ? <QuestoesTab items={items} subjectName={subjectName} onProgressUpdate={onProgressUpdate} onCelebrate={onCelebrate} isPremium={isPremium} todayCount={todayCount} />
        : isPremium ? <QuestoesAdaptativas subjectId={subjectId} subjectName={subjectName} onClose={() => setModo("normal")} /> : null
      }
    </div>
  );
}

// ── Filtros avançados de questões ─────────────────────────────────────────────
function QuestoesFiltros({ bancas, filterBanca, filterLevel, filterStatus, onBanca, onLevel, onStatus, count, total, favCount }: {
  bancas: string[]; filterBanca: string; filterLevel: string;
  filterStatus: "todas" | "pendentes" | "revisadas" | "favoritas";
  onBanca: (v: string) => void; onLevel: (v: string) => void;
  onStatus: (v: "todas" | "pendentes" | "revisadas" | "favoritas") => void;
  count: number; total: number; favCount: number;
}) {
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {/* Status pills */}
      {(["todas","pendentes","revisadas","favoritas"] as const).map(s => (
        <button key={s} onClick={() => onStatus(s)}
          className={cn("text-xs px-2.5 py-1 rounded-full border transition-colors",
            filterStatus === s ? "bg-indigo-600 border-indigo-500 text-white" : "bg-white/5 border-white/10 text-gray-400 hover:text-white")}>
          {s === "todas" ? `Todas (${total})` : s === "pendentes" ? "🔴 Pendentes" : s === "revisadas" ? "✅ Revisadas" : `⭐ Favoritas (${favCount})`}
        </button>
      ))}
      {/* Filtro banca */}
      {bancas.length > 0 && (
        <select value={filterBanca} onChange={e => onBanca(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-full px-3 py-1 text-xs text-gray-300 focus:outline-none">
          <option value="">Banca: todas</option>
          {bancas.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
      )}
      {/* Filtro nível */}
      <select value={filterLevel} onChange={e => onLevel(e.target.value)}
        className="bg-white/5 border border-white/10 rounded-full px-3 py-1 text-xs text-gray-300 focus:outline-none">
        <option value="">Nível: todos</option>
        <option value="facil">🟢 Fácil</option>
        <option value="medio">🟡 Médio</option>
        <option value="dificil">🔴 Difícil</option>
      </select>
      {(filterBanca || filterLevel || filterStatus !== "todas") && (
        <span className="text-xs text-gray-500 self-center">{count} questão(ões)</span>
      )}
    </div>
  );
}

// ── Tab Questões com Spaced Repetition ───────────────────────────────────────
const CORRECT_MSGS = [
  "✅ Correto! +15 XP", "🎯 Acertou! Continue assim!", "🔥 Isso! +15 XP",
  "💪 Excelente! +15 XP", "⚡ Perfeito! Ótimo ritmo!", "🏆 Correto! +15 XP",
];

function QuestoesTab({ items, subjectName, onProgressUpdate, onCelebrate, isPremium = true, todayCount = 0 }: {
  items: Question[]; subjectName: string;
  onProgressUpdate: (id: number, next: string) => void;
  onCelebrate?: (msg: string) => void;
  isPremium?: boolean; todayCount?: number;
}) {
  const DAILY_LIMIT = 20;
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [showExpl, setShowExpl] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [answered, setAnswered] = useState<Set<number>>(new Set());
  const [dailyLimitHit, setDailyLimitHit] = useState(!isPremium && todayCount >= DAILY_LIMIT);
  const [filterBanca, setFilterBanca] = useState("");
  const [filterLevel, setFilterLevel] = useState("");
  const [filterStatus, setFilterStatus] = useState<"todas" | "pendentes" | "revisadas" | "favoritas">("todas");
  const [favoritos, setFavoritos] = useState<Set<number>>(new Set());
  const [glossTermos, setGlossTermos] = useState<GlossTermo[]>([]);
  const [activeTermo, setActiveTermo] = useState<GlossTermo | null>(null);
  const [loadingGloss, setLoadingGloss] = useState(false);
  const [reportando, setReportando] = useState<number | null>(null); // questionId sendo reportado
  const [reportMotivo, setReportMotivo] = useState("gabarito_errado");
  const [reportDesc, setReportDesc] = useState("");
  const [autoAdvancing, setAutoAdvancing] = useState(false); // countdown ao errar
  const [shuffleSeed, setShuffleSeed] = useState(() => Math.random()); // embaralho por sessão
  const [reportSent, setReportSent] = useState(false);

  async function enviarReporte(questionId: number) {
    await fetch("/api/questoes/reportar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId, motivo: reportMotivo, descricao: reportDesc }),
    }).catch(() => {});
    setReportSent(true);
    setTimeout(() => { setReportando(null); setReportSent(false); setReportDesc(""); setReportMotivo("gabarito_errado"); }, 1800);
  }

  // Carrega favoritos
  useEffect(() => {
    fetch("/api/questoes/favoritos").then(r => r.json()).then(d => {
      setFavoritos(new Set(d.favoritos ?? []));
    }).catch(() => {});
  }, []);

  async function toggleFavorito(id: number) {
    const isFav = favoritos.has(id);
    const next = new Set(favoritos);
    isFav ? next.delete(id) : next.add(id);
    setFavoritos(next);
    await fetch("/api/questoes/favoritos", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId: id, action: isFav ? "remove" : "add" }),
    }).catch(() => {});
  }

  function resetFilters() {
    setCurrent(0); setSelected(null); setScore({ correct: 0, total: 0 }); setShowExpl(false); setAutoAdvancing(false);
  }

  function restartEmbaralhado() {
    setShuffleSeed(Math.random());
    setCurrent(0); setSelected(null); setScore({ correct: 0, total: 0 }); setShowExpl(false); setAnswered(new Set()); setAutoAdvancing(false);
  }

  // Fisher-Yates shuffle determinístico pelo seed
  function shuffleArray<T>(arr: T[], seed: number): T[] {
    const a = [...arr];
    let s = seed;
    for (let i = a.length - 1; i > 0; i--) {
      s = (s * 9301 + 49297) % 233280;
      const j = Math.floor((s / 233280) * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  const bancas = Array.from(new Set(items.map(q => q.banca).filter(Boolean) as string[]));

  let filtered = items;
  if (filterBanca) filtered = filtered.filter(q => q.banca === filterBanca);
  if (filterLevel) filtered = filtered.filter(q => q.level === filterLevel);
  if (filterStatus === "pendentes") filtered = filtered.filter(q => !q._seen || !q._nextReview || new Date(q._nextReview).getTime() <= Date.now());
  if (filterStatus === "revisadas") filtered = filtered.filter(q => q._seen && q._nextReview && new Date(q._nextReview).getTime() > Date.now());
  if (filterStatus === "favoritas") filtered = filtered.filter(q => favoritos.has(q.id));
  // Embaralha as questões para não seguir sempre a mesma ordem
  filtered = shuffleArray(filtered, shuffleSeed);

  const q = filtered[current];

  useEffect(() => {
    if (!q?.statement) { setGlossTermos([]); return; }
    setGlossTermos([]);
    setLoadingGloss(true);
    fetch("/api/workspace/glossario", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enunciado: q.statement }),
    }).then(r => r.json()).then(d => {
      setGlossTermos(d.termos ?? []);
    }).catch(() => {}).finally(() => setLoadingGloss(false));
  }, [q?.id]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      const k = e.key.toUpperCase();
      if (["A","B","C","D","E"].includes(k) && !selected && q) handleSelect(k);
      // N só avança (como "Boa") quando acertou — se errou, o auto-advance já trata
      if ((e.key === "Enter" || e.key === "n" || e.key === "N") && selected && selected === q?.answer) handleQuality("ok");
      if (e.key === "Escape") setActiveTermo(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Sem questões no banco para essa matéria
  if (items.length === 0) return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-3xl mb-4">📝</div>
      <h3 className="font-bold text-base mb-2">Questões em breve</h3>
      <p className="text-sm text-gray-500 max-w-xs mb-4">
        Ainda não há questões cadastradas para <strong className="text-gray-300">{subjectName}</strong>.<br/>
        Enquanto isso, use o <strong className="text-indigo-400">Mentor IA</strong> para estudar o conteúdo.
      </p>
      <button
        onClick={() => {
          // Dispara evento para mudar para a aba de mentor no componente pai
          window.dispatchEvent(new CustomEvent("aprovai:go-mentor"));
        }}
        className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-sm font-medium transition-colors">
        🎓 Estudar com o Mentor
      </button>
    </div>
  );

  const novas = filtered.filter(qq => !qq._seen);
  const vencidas = filtered.filter(qq => qq._seen && (!qq._nextReview || new Date(qq._nextReview).getTime() <= Date.now()));
  const due = [...novas, ...vencidas]; // para compatibilidade
  const future = filtered.filter(qq => qq._seen && qq._nextReview && new Date(qq._nextReview).getTime() > Date.now());

  const options = q ? (["A","B","C","D","E"] as const)
    .map(k => ({ key: k, text: (q as unknown as Record<string,string|null>)[`option${k}`] }))
    .filter(o => o.text) : [];

  function handleSelect(key: string) {
    if (selected) return;
    setSelected(key);
    const isCorrect = key === q.answer;
    const newScore = { correct: score.correct + (isCorrect ? 1 : 0), total: score.total + 1 };
    setScore(newScore);
    if (isCorrect) {
      const msg = CORRECT_MSGS[Math.floor(Math.random() * CORRECT_MSGS.length)];
      onCelebrate?.(msg);
    } else {
      // Resposta errada → salva automaticamente como "again" e avança após 1.5s
      setAutoAdvancing(true);
      handleQualityDirect("again");
    }
  }

  async function handleQualityDirect(quality: "easy" | "ok" | "hard" | "again") {
    // Salva progresso sem avançar imediatamente (usado no auto-advance de erros)
    if (!q) return;
    const res = await fetch("/api/questoes/progresso", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId: q.id, quality }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.limitReached) { setDailyLimitHit(true); return; }
      onProgressUpdate(q.id, data.nextReview);
      setAnswered(prev => new Set([...prev, q.id]));
    }
    // Avança após 1.5s para o aluno ver a resposta correta
    setTimeout(() => {
      setCurrent(c => c + 1);
      setSelected(null);
      setShowExpl(false);
      setActiveTermo(null);
      setAutoAdvancing(false);
    }, 1500);
  }

  async function handleQuality(quality: "easy" | "ok" | "hard" | "again") {
    if (!q) return;
    const res = await fetch("/api/questoes/progresso", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId: q.id, quality }),
    });
    if (res.ok) {
      const data = await res.json();
      // Limite diário atingido (trial)
      if (data.limitReached) {
        setDailyLimitHit(true);
        return;
      }
      onProgressUpdate(q.id, data.nextReview);
      setAnswered(prev => new Set([...prev, q.id]));
    }
    setCurrent(c => c + 1);
    setSelected(null);
    setShowExpl(false);
    setActiveTermo(null);
  }

  const isFinished = current >= filtered.length;

  // Parede de limite diário trial
  if (dailyLimitHit) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 text-3xl"
          style={{ background: "linear-gradient(135deg,rgba(99,102,241,0.2),rgba(139,92,246,0.1))", border: "1px solid rgba(99,102,241,0.3)" }}>
          🎯
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Limite diário atingido!</h2>
        <p className="text-gray-400 text-sm mb-1">Você já respondeu <strong className="text-white">20 questões</strong> hoje.</p>
        <p className="text-gray-500 text-xs mb-6">No plano Trial, o limite é de 20 questões por dia no total.</p>
        <div className="w-full max-w-xs space-y-2">
          <a href="/planos"
            className="block w-full py-3.5 rounded-2xl font-bold text-sm text-center transition-all hover:scale-[1.02]"
            style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", boxShadow: "0 0 24px rgba(99,102,241,0.35)" }}>
            ⚡ Fazer upgrade — questões ilimitadas
          </a>
          <p className="text-[11px] text-gray-600">Seu limite reseta amanhã à meia-noite</p>
        </div>
      </div>
    );
  }

  if (isFinished) {
    const pct = score.total > 0 ? Math.round(score.correct / score.total * 100) : 0;
    return (
      <div className="text-center py-12 px-4">
        <div className="text-5xl mb-4">{pct >= 80 ? "🏆" : pct >= 60 ? "💪" : "📚"}</div>
        <h2 className="text-xl font-bold mb-1">Banco concluído!</h2>
        <p className="text-gray-400 text-sm mb-1">
          {score.correct}/{score.total} corretas · <span className={cn(
            "font-bold", pct >= 80 ? "text-emerald-400" : pct >= 60 ? "text-amber-400" : "text-red-400"
          )}>{pct}%</span>
        </p>
        <p className="text-xs text-gray-600 mb-8">{future.length > 0 ? `${future.length} questões agendadas para revisão futura` : "Continue praticando para agendar revisões"}</p>
        <div className="space-y-2 max-w-xs mx-auto">
          <button onClick={restartEmbaralhado}
            className="w-full px-6 py-3 bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 font-semibold text-sm">
            <RotateCcw className="w-4 h-4" /> Responder novamente (embaralhado)
          </button>
          {future.length > 0 && (
            <p className="text-[11px] text-gray-600">As questões serão misturadas em nova ordem</p>
          )}
        </div>
      </div>
    );
  }

  if (filtered.length === 0) return (
    <div>
      {/* Filtros mesmo vazio */}
      <QuestoesFiltros bancas={bancas} filterBanca={filterBanca} filterLevel={filterLevel} filterStatus={filterStatus}
        onBanca={v => { setFilterBanca(v); resetFilters(); }} onLevel={v => { setFilterLevel(v); resetFilters(); }}
        onStatus={v => { setFilterStatus(v); resetFilters(); }} count={0} total={items.length} favCount={favoritos.size} />
      <EmptyState label={filterStatus === "favoritas" ? "Nenhuma questão favoritada ainda." : `Nenhuma questão encontrada com esses filtros.`} />
    </div>
  );

  return (
    <div>
      {/* Filtros avançados */}
      <QuestoesFiltros bancas={bancas} filterBanca={filterBanca} filterLevel={filterLevel} filterStatus={filterStatus}
        onBanca={v => { setFilterBanca(v); resetFilters(); }} onLevel={v => { setFilterLevel(v); resetFilters(); }}
        onStatus={v => { setFilterStatus(v); resetFilters(); }} count={filtered.length} total={items.length} favCount={favoritos.size} />

      {/* Header */}
      <div className="flex justify-between items-center text-xs text-gray-500 mb-3">
        <span>
          Questão {current + 1}
          {novas.length > 0 && <span className="text-gray-600"> · <span className="text-indigo-400">{novas.length} novas</span></span>}
          {vencidas.length > 0 && <span className="text-gray-600"> · <span className="text-yellow-400">{vencidas.length} p/ revisar</span></span>}
          {future.length > 0 && <span className="text-gray-600"> · {future.length} agendadas</span>}
        </span>
        <div className="flex items-center gap-2">
          {q.banca && <span className="text-indigo-400">{q.banca}{q.year ? ` ${q.year}` : ""}</span>}
          <span className={cn("px-2 py-0.5 rounded-full text-xs", {
            "bg-green-500/10 text-green-400": q.level === "facil",
            "bg-yellow-500/10 text-yellow-400": q.level === "medio",
            "bg-red-500/10 text-red-400": q.level === "dificil",
          })}>{q.level}</span>
          {/* Favorito */}
          <button onClick={() => toggleFavorito(q.id)}
            className={cn("p-1 rounded transition-colors", favoritos.has(q.id) ? "text-yellow-400" : "text-gray-700 hover:text-yellow-500")}
            title={favoritos.has(q.id) ? "Remover dos favoritos" : "Adicionar aos favoritos"}>
            ★
          </button>
        </div>
      </div>

      {/* Spaced rep badge */}
      {q._nextReview && (
        <div className="flex items-center gap-1.5 mb-3 text-xs text-gray-600">
          <Clock className="w-3 h-3" />
          <span>{fmtNextReview(q._nextReview)}</span>
          {q._interval && <span className="text-gray-700">· intervalo {q._interval}d</span>}
        </div>
      )}

      {/* Progress bar */}
      <div className="h-1 rounded-full bg-white/10 mb-4">
        <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${((current + 1) / filtered.length) * 100}%` }} />
      </div>

      {activeTermo && <TermoTooltip termo={activeTermo} onClose={() => setActiveTermo(null)} />}
      <div className="flex items-center gap-2 mb-2 text-[10px] text-gray-700">
        <span>Atalhos:</span>
        {["A","B","C","D","E"].map(k => <kbd key={k} className="px-1 py-0.5 rounded border border-white/10 font-mono">{k}</kbd>)}
        <span>responder</span>
        <kbd className="px-1 py-0.5 rounded border border-white/10 font-mono">N</kbd>
        <span>próxima</span>
      </div>
      <p className="text-sm text-gray-200 leading-relaxed mb-4">
        <HighlightedText text={q.statement} termos={glossTermos} onTermClick={setActiveTermo} />
        {loadingGloss && <span className="ml-2 text-[10px] text-gray-600 animate-pulse">analisando termos...</span>}
      </p>

      <div className="space-y-2 mb-4">
        {options.map(({ key, text }) => {
          const isSelected = selected === key;
          const isCorrect = key === q.answer;
          let style = "border-white/10 bg-white/3 hover:bg-white/5 text-gray-300";
          if (selected) {
            if (isCorrect) style = "border-green-500/50 bg-green-500/10 text-green-300";
            else if (isSelected) style = "border-red-500/50 bg-red-500/10 text-red-300";
            else style = "border-white/5 text-gray-600";
          }
          return (
            <button key={key} onClick={() => handleSelect(key)} disabled={!!selected}
              className={cn("w-full text-left flex items-center gap-2.5 p-3 rounded-lg border text-xs transition-all", style, !selected && "cursor-pointer")}>
              <span className={cn("w-5 h-5 rounded-full border flex items-center justify-center text-[10px] font-bold flex-shrink-0",
                selected && isCorrect ? "bg-green-500 border-green-500 text-white" :
                selected && isSelected ? "bg-red-500 border-red-500 text-white" : "border-current")}>
                {key}
              </span>
              <span className="flex-1">{text}</span>
              {selected && isCorrect && <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />}
              {selected && isSelected && !isCorrect && <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />}
            </button>
          );
        })}
      </div>

      {selected && (
        <div className="space-y-3">
          {q.explanation && (
            <div>
              <button onClick={() => setShowExpl(r => !r)} className="text-xs text-gray-500 hover:text-gray-400 mb-1">
                {showExpl ? "▲ Ocultar" : "▼ Ver"} justificativa
              </button>
              {showExpl && (
                <p className="text-xs text-gray-400 leading-relaxed p-3 rounded-lg bg-white/5 border border-white/5">
                  {q.explanation}
                </p>
              )}
            </div>
          )}
          {q.artigo && (
            <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
              <span className="text-indigo-400 text-xs font-bold flex-shrink-0 mt-0.5">§</span>
              <p className="text-xs text-indigo-300">{q.artigo}</p>
            </div>
          )}
          {q.dicaBanca && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <span className="text-amber-400 text-sm flex-shrink-0 mt-0.5">⚡</span>
              <div>
                <p className="text-xs font-semibold text-amber-400 mb-0.5">Dica da banca</p>
                <p className="text-xs text-amber-300/80 leading-relaxed">{q.dicaBanca}</p>
              </div>
            </div>
          )}
          <div>
            {selected && selected !== q.answer ? (
              // Resposta errada — salva automaticamente, avança em 1.5s
              <div className="flex items-center gap-2 py-2.5 px-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <div className={cn("w-2 h-2 rounded-full bg-red-500 flex-shrink-0", autoAdvancing && "animate-ping")} />
                <p className="text-xs text-red-400 font-medium">
                  Adicionada à revisão — próxima questão em instantes...
                </p>
              </div>
            ) : (
              <>
                <p className="text-xs text-gray-600 mb-2">Como foi? (define próxima revisão)</p>
                <div className="grid grid-cols-3 gap-1.5">
                  <button onClick={() => handleQuality("hard")} className="py-2 rounded-lg bg-orange-500/20 border border-orange-500/30 text-orange-400 text-xs font-medium hover:bg-orange-500/30 transition-colors">Difícil</button>
                  <button onClick={() => handleQuality("ok")} className="py-2 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-400 text-xs font-medium hover:bg-blue-500/30 transition-colors">Boa</button>
                  <button onClick={() => handleQuality("easy")} className="py-2 rounded-lg bg-green-500/20 border border-green-500/30 text-green-400 text-xs font-medium hover:bg-green-500/30 transition-colors">Fácil</button>
                </div>
              </>
            )}
          </div>

          {/* Botão de reporte */}
          {reportando === q.id ? (
            <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/5 p-3 space-y-2">
              {reportSent ? (
                <p className="text-xs text-green-400 text-center py-1">✓ Reporte enviado! Obrigado.</p>
              ) : (
                <>
                  <p className="text-[11px] text-red-300 font-medium">Reportar problema nesta questão</p>
                  <select
                    value={reportMotivo}
                    onChange={e => setReportMotivo(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-gray-300 focus:outline-none"
                  >
                    <option value="gabarito_errado">Gabarito errado</option>
                    <option value="enunciado_desatualizado">Enunciado desatualizado</option>
                    <option value="alternativas_incorretas">Alternativas incorretas</option>
                    <option value="questao_duplicada">Questão duplicada</option>
                    <option value="outro">Outro</option>
                  </select>
                  <textarea
                    value={reportDesc}
                    onChange={e => setReportDesc(e.target.value)}
                    placeholder="Descreva o problema (opcional)..."
                    rows={2}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-gray-300 placeholder-gray-600 focus:outline-none resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => enviarReporte(q.id)}
                      className="flex-1 py-1.5 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-medium hover:bg-red-500/30 transition-colors"
                    >
                      Enviar reporte
                    </button>
                    <button
                      onClick={() => setReportando(null)}
                      className="px-3 py-1.5 rounded-lg border border-white/10 text-gray-500 text-xs hover:text-white transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button
              onClick={() => { setReportando(q.id); setReportSent(false); }}
              className="mt-1 text-[10px] text-gray-700 hover:text-red-400 transition-colors flex items-center gap-1"
            >
              🚩 Reportar problema com esta questão
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Artigos Mais Cobrados com IA ──────────────────────────────────────────────
type ArtigoItem = { referencia: string; topico: string; frequencia: "muito alta" | "alta" | "media"; dica: string };
type ArtigoCache = { artigos: ArtigoItem[]; subjectName: string; generatedAt: string; cached?: boolean };

const FREQ_CONFIG = {
  "muito alta": { label: "Muito alta", color: "text-red-400",   dot: "bg-red-500" },
  "alta":       { label: "Alta",       color: "text-amber-400", dot: "bg-amber-500" },
  "media":      { label: "Média",      color: "text-blue-400",  dot: "bg-blue-500" },
};

function ArtigosPanel({ subjects }: { subjects: Subject[] }) {
  const [selected, setSelected] = useState<Subject | null>(subjects[0] ?? null);
  const [cache, setCache] = useState<Record<string, ArtigoCache>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selected) return;
    // Já tem em cache local
    if (cache[selected.id]) return;
    // Tenta cache do servidor
    setLoading(true);
    setError(null);
    fetch(`/api/workspace/artigos?subjectId=${selected.id}`)
      .then(r => r.json())
      .then((d: ArtigoCache & { artigos: ArtigoItem[] | null }) => {
        if (d.artigos) {
          setCache(prev => ({ ...prev, [selected.id]: d }));
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [selected, cache]);

  async function gerar() {
    if (!selected || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/workspace/artigos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectId: selected.id, subjectName: selected.name }),
      });
      const data = await res.json() as ArtigoCache & { error?: string };
      if (!res.ok) { setError(data.error ?? "Erro ao gerar"); return; }
      setCache(prev => ({ ...prev, [selected.id]: data }));
    } catch {
      setError("Erro de conexão");
    } finally {
      setLoading(false);
    }
  }

  const current = selected ? cache[selected.id] : null;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Subject selector tabs */}
      <div className="flex gap-1.5 px-4 pt-3 pb-2 overflow-x-auto no-scrollbar border-b border-white/[0.06] flex-shrink-0">
        {subjects.map(s => (
          <button
            key={s.id}
            onClick={() => { setSelected(s); setError(null); }}
            className={cn(
              "flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
              selected?.id === s.id
                ? "bg-indigo-600 text-white"
                : "bg-white/5 text-gray-400 hover:text-gray-200 hover:bg-white/8"
            )}>
            {s.name}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {!selected && (
          <p className="text-xs text-gray-500 text-center py-8">Adicione matérias para ver artigos cobrados.</p>
        )}

        {selected && !current && !loading && (
          <div className="text-center py-12">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-3 text-2xl">📌</div>
            <p className="text-sm font-medium text-gray-200 mb-1">{selected.name}</p>
            <p className="text-xs text-gray-500 mb-5 max-w-xs mx-auto">Gere os 10 artigos, leis e súmulas mais cobrados em provas de concurso para essa matéria.</p>
            <button
              onClick={gerar}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-sm font-medium text-white transition-colors flex items-center gap-2 mx-auto">
              <Sparkles className="w-4 h-4" /> Gerar com IA
            </button>
            {error && <p className="text-xs text-red-400 mt-3">{error}</p>}
          </div>
        )}

        {selected && loading && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin" />
            <p className="text-xs text-gray-500">Analisando o que mais cai em provas…</p>
          </div>
        )}

        {selected && current && !loading && (
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-gray-600">
                {current.cached ? "Em cache" : "Gerado agora"} · {new Date(current.generatedAt).toLocaleDateString("pt-BR")}
              </p>
              <button
                onClick={gerar}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors">
                <RefreshCw className="w-3 h-3" /> Atualizar
              </button>
            </div>

            {(current.artigos ?? []).map((a, i) => {
              const fc = FREQ_CONFIG[a.frequencia] ?? FREQ_CONFIG["media"];
              return (
                <div key={i} className="rounded-xl border border-white/[0.06] bg-[#0d1117] p-3.5">
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-md bg-indigo-600/15 border border-indigo-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-[10px] font-black text-indigo-400">{i + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="text-xs font-semibold text-white font-mono">{a.referencia}</span>
                        <span className={cn("flex items-center gap-1 text-[10px] font-medium", fc.color)}>
                          <span className={cn("w-1.5 h-1.5 rounded-full inline-block", fc.dot)} />
                          {fc.label}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mb-1">{a.topico}</p>
                      {a.dica && (
                        <p className="text-[10px] text-indigo-400/70 italic">💡 {a.dica}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Flash Nav Panel — decks de todas as matérias + geração com IA ────────────
function FlashNavPanel({
  subjects,
  onStudy,
  getSubjectColor,
  getSubjectAbbr,
}: {
  subjects: Subject[];
  onStudy: (s: Subject) => void;
  getSubjectColor: (idx: number) => string;
  getSubjectAbbr: (name: string) => string;
}) {
  type DeckInfo = { id: string; name: string; subjectId: string; totalCards: number; dueCount: number };
  const [decks, setDecks] = useState<DeckInfo[]>([]);
  const [totalDue, setTotalDue] = useState(0);
  const [loadingDecks, setLoadingDecks] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null); // subjectId being generated
  const [topico, setTopico] = useState("");
  const [showGenerateFor, setShowGenerateFor] = useState<string | null>(null); // subjectId

  useEffect(() => {
    fetch("/api/workspace/flashcards")
      .then(r => r.json())
      .then(d => {
        setDecks(d.decks ?? []);
        setTotalDue(d.totalDueToday ?? 0);
        setLoadingDecks(false);
      })
      .catch(() => setLoadingDecks(false));
  }, []);

  async function gerarDeck(subjectId: string, subjectName: string) {
    setGenerating(subjectId);
    try {
      const res = await fetch("/api/workspace/flashcards/gerar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectId, subjectName, qty: 10, topico: topico || undefined }),
      });
      if (!res.ok) throw new Error("Falha");
      // Recarrega lista
      const r2 = await fetch("/api/workspace/flashcards");
      const d2 = await r2.json() as { decks: DeckInfo[]; totalDueToday: number };
      setDecks(d2.decks ?? []);
      setTotalDue(d2.totalDueToday ?? 0);
      setShowGenerateFor(null);
      setTopico("");
    } catch { /* silently */ }
    finally { setGenerating(null); }
  }

  const subjectIdx = (id: string) => subjects.findIndex(s => s.id === id);

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header com total due */}
      <div className="px-5 pt-4 pb-3 border-b border-white/[0.06]">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">Meus Flashcards</h3>
            <p className="text-xs text-gray-500 mt-0.5">Revisão espaçada SM-2 por matéria</p>
          </div>
          {totalDue > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/25">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-semibold text-amber-400">{totalDue} p/ revisar</span>
            </div>
          )}
        </div>
      </div>

      <div className="px-5 py-3 space-y-2">
        {subjects.length === 0 && (
          <p className="text-xs text-gray-500 text-center py-8">Adicione matérias no menu Estudar para ver flashcards.</p>
        )}

        {subjects.map((s, idx) => {
          const subjectDecks = decks.filter(d => d.subjectId === s.id);
          const subjectDue = subjectDecks.reduce((sum, d) => sum + d.dueCount, 0);
          const color = getSubjectColor(idx);
          const isGenerating = generating === s.id;
          const showForm = showGenerateFor === s.id;

          return (
            <div key={s.id} className="rounded-xl border border-white/[0.06] bg-[#0d1117] overflow-hidden">
              {/* Subject row */}
              <div className="flex items-center gap-3 p-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black flex-shrink-0"
                  style={{ background: color + "18", border: `1px solid ${color}33`, color }}>
                  {getSubjectAbbr(s.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-200 truncate">{s.name}</p>
                  {loadingDecks ? (
                    <p className="text-xs text-gray-600">carregando…</p>
                  ) : subjectDecks.length === 0 ? (
                    <p className="text-xs text-gray-600">nenhum deck ainda</p>
                  ) : (
                    <p className="text-xs text-gray-500">
                      {subjectDecks.length} deck{subjectDecks.length > 1 ? "s" : ""} · {subjectDecks.reduce((s, d) => s + d.totalCards, 0)} cards
                      {subjectDue > 0 && <span className="text-amber-400 ml-1">· {subjectDue} p/ revisar</span>}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {subjectDecks.length > 0 && (
                    <button
                      onClick={() => onStudy(s)}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium transition-colors"
                      style={{ background: color + "20", color }}>
                      {subjectDue > 0 ? `Revisar ${subjectDue}` : "Estudar"}
                    </button>
                  )}
                  <button
                    onClick={() => setShowGenerateFor(showForm ? null : s.id)}
                    className="p-1.5 rounded-lg border border-white/10 text-gray-400 hover:text-indigo-400 hover:border-indigo-500/30 transition-colors"
                    title="Gerar deck com IA">
                    <Sparkles className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Inline generate form */}
              {showForm && (
                <div className="px-3 pb-3 border-t border-white/[0.04] pt-2.5 space-y-2">
                  <input
                    type="text"
                    placeholder="Tópico específico (opcional)"
                    value={topico}
                    onChange={e => setTopico(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500/50"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setShowGenerateFor(null); setTopico(""); }}
                      className="flex-1 py-1.5 rounded-lg border border-white/10 text-xs text-gray-400 hover:text-gray-200 transition-colors">
                      Cancelar
                    </button>
                    <button
                      onClick={() => gerarDeck(s.id, s.name)}
                      disabled={isGenerating}
                      className="flex-1 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-medium transition-colors flex items-center justify-center gap-1.5">
                      {isGenerating ? (
                        <><RefreshCw className="w-3 h-3 animate-spin" /> Gerando…</>
                      ) : (
                        <><Sparkles className="w-3 h-3" /> Gerar 10 cards</>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Tab Flashcards com SRS (SM-2 persistente) ─────────────────────────────────
function FlashcardsTab({ items }: { items: Flashcard[] }) {
  const [cards, setCards] = useState(() => items);
  const [current, setCurrent] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [score, setScore] = useState({ lembrei: 0, nao: 0, dificil: 0 });
  const [submitting, setSubmitting] = useState(false);

  const dueCards = cards.filter(c => c.due);
  const pendingCards = cards.filter(c => !c.due);

  if (items.length === 0) return <EmptyState label="Nenhum flashcard cadastrado para essa matéria ainda." />;

  const card = cards[current];
  const isFinished = current >= cards.length;

  async function rate(quality: "lembrei" | "dificil" | "nao-lembrei") {
    if (!card || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/flashcards/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setId: card.setId, cardId: card.id, quality }),
      });
      const data = await res.json() as { nextReview: string | null; interval: number };
      // Atualiza o card localmente
      setCards(prev => prev.map((c, i) => i === current
        ? { ...c, nextReview: data.nextReview, interval: data.interval, due: false }
        : c
      ));
    } catch { /* silently ignore */ }
    finally { setSubmitting(false); }

    if (quality === "lembrei") setScore(s => ({ ...s, lembrei: s.lembrei + 1 }));
    else if (quality === "dificil") setScore(s => ({ ...s, dificil: s.dificil + 1 }));
    else setScore(s => ({ ...s, nao: s.nao + 1 }));

    setCurrent(c => c + 1);
    setFlipped(false);
  }

  // Header com stats
  const HeaderStats = () => (
    <div className="flex justify-between text-xs text-gray-500 mb-3">
      <span>{current + 1}/{cards.length}</span>
      <div className="flex items-center gap-3">
        <span className="text-amber-400">⏳ {dueCards.length} p/ revisar</span>
        {card?.deckName && <span className="text-gray-600 truncate max-w-28">{card.deckName}</span>}
      </div>
      <span className="text-green-400">✓{score.lembrei}</span>
    </div>
  );

  if (isFinished) {
    const total = score.lembrei + score.dificil + score.nao;
    return (
      <div className="text-center py-16 max-w-md mx-auto">
        <Layers className="w-14 h-14 text-indigo-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">Sessão completa!</h2>
        <div className="flex justify-center gap-4 text-sm mb-2">
          <span className="text-green-400">✓ {score.lembrei} lembrei</span>
          <span className="text-amber-400">~ {score.dificil} difícil</span>
          <span className="text-red-400">✗ {score.nao} errei</span>
        </div>
        {pendingCards.length > 0 && (
          <p className="text-xs text-gray-600 mb-4">{pendingCards.length} cards para revisão futura (já agendados)</p>
        )}
        <p className="text-xs text-gray-500 mb-6">
          {total > 0 ? `${Math.round((score.lembrei / total) * 100)}% de aproveitamento` : ""}
        </p>
        <button onClick={() => { setCurrent(0); setFlipped(false); setScore({ lembrei: 0, nao: 0, dificil: 0 }); setCards(items); }}
          className="px-6 py-3 bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors flex items-center gap-2 mx-auto">
          <RotateCcw className="w-4 h-4" /> Rever o deck
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <HeaderStats />

      {/* Badge SRS */}
      {card.nextReview && !card.due && (
        <div className="flex items-center gap-1.5 text-xs text-gray-600 mb-2">
          <Clock className="w-3 h-3" /> Próxima revisão: {fmtNextReview(card.nextReview)} · {card.interval}d
        </div>
      )}
      {card.due && (
        <div className="flex items-center gap-1.5 text-xs text-amber-500 mb-2">
          <Clock className="w-3 h-3" /> Para revisar hoje
        </div>
      )}

      {/* Progress bar */}
      <div className="h-1 rounded-full bg-white/10 mb-4 overflow-hidden">
        <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${((current) / cards.length) * 100}%` }} />
      </div>

      <div
        onClick={() => setFlipped(f => !f)}
        className={cn(
          "min-h-52 rounded-2xl border p-6 flex items-center justify-center text-center cursor-pointer transition-all",
          flipped
            ? "border-indigo-500/40 bg-indigo-600/10 text-indigo-200"
            : "border-white/10 bg-white/3 text-gray-200"
        )}
      >
        <div>
          <p className="text-xs text-gray-500 mb-3">{flipped ? "Resposta" : "Pergunta"}</p>
          <p className="text-sm leading-relaxed">{flipped ? card.back : card.front}</p>
          {!flipped && <p className="text-xs text-gray-600 mt-4">Toque para ver a resposta</p>}
        </div>
      </div>

      {flipped ? (
        <div className="grid grid-cols-3 gap-2 mt-4">
          <button onClick={() => rate("nao-lembrei")} disabled={submitting}
            className="py-2.5 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-medium hover:bg-red-500/30 transition-colors disabled:opacity-50">
            ✗ Não lembrei
          </button>
          <button onClick={() => rate("dificil")} disabled={submitting}
            className="py-2.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-medium hover:bg-amber-500/30 transition-colors disabled:opacity-50">
            ~ Difícil
          </button>
          <button onClick={() => rate("lembrei")} disabled={submitting}
            className="py-2.5 rounded-xl bg-green-500/20 border border-green-500/30 text-green-400 text-xs font-medium hover:bg-green-500/30 transition-colors disabled:opacity-50">
            ✓ Lembrei!
          </button>
        </div>
      ) : (
        <div className="flex gap-2 mt-4">
          <button onClick={() => { setCurrent(c => Math.max(0, c - 1)); setFlipped(false); }}
            className="flex-1 py-2 rounded-lg border border-white/10 text-xs text-gray-400 hover:text-white transition-colors disabled:opacity-30"
            disabled={current === 0}>
            ← Anterior
          </button>
          <button onClick={() => setFlipped(true)}
            className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs transition-colors">
            Ver resposta →
          </button>
        </div>
      )}
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-48 text-center">
      <BookOpen className="w-10 h-10 text-gray-700 mb-3" />
      <p className="text-gray-500 text-sm">{label}</p>
    </div>
  );
}

// ── Tab Simulados ─────────────────────────────────────────────────────────────
function SimuladosTab() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-4">
      <ClipboardList className="w-12 h-12 text-indigo-500/30" />
      <div>
        <p className="font-medium text-sm mb-1">Simulados cronometrados</p>
        <p className="text-xs text-gray-500 mb-4">Acesse a página de simulados para iniciar um teste com timer e acompanhar seu histórico.</p>
      </div>
      <a href="/simulado" className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-sm font-medium transition-colors flex items-center gap-2">
        <ClipboardList className="w-4 h-4" /> Ir para Simulados
      </a>
    </div>
  );
}

// ── CronogramaTab ─────────────────────────────────────────────────────────────
interface CronogramaDia {
  dia: string;
  materias: { nome: string; horas: number; prioridade: "alta" | "media" | "baixa"; dica: string }[];
  totalHoras: number;
  folga?: boolean;
}
interface CronogramaData {
  semana: CronogramaDia[];
  resumo: string;
  metaSemanal: string;
  horasTotais: number;
  geradoEm?: string;
}

const PRIORIDADE_CONFIG = {
  alta:  { label: "Alta",  color: "text-red-400",   bg: "bg-red-500/10 border-red-500/20" },
  media: { label: "Média", color: "text-amber-400",  bg: "bg-amber-500/10 border-amber-500/20" },
  baixa: { label: "Baixa", color: "text-green-400",  bg: "bg-green-500/10 border-green-500/20" },
};

const DIA_CORES: Record<string, string> = {
  "Segunda":  "#6366f1", "Terça": "#8b5cf6", "Quarta": "#ec4899",
  "Quinta": "#f59e0b",  "Sexta":  "#10b981", "Sábado": "#3b82f6", "Domingo": "#6b7280",
};

function CronogramaTab({ profile, subjects }: { profile: Profile; subjects: Subject[] }) {
  const [cronograma, setCronograma] = useState<CronogramaData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [horasPorDia, setHorasPorDia] = useState(3);
  const [diasDisp, setDiasDisp] = useState<string[]>(["Segunda","Terça","Quarta","Quinta","Sexta","Sábado"]);
  const [showConfig, setShowConfig] = useState(false);
  const DIAS_SEMANA = ["Segunda","Terça","Quarta","Quinta","Sexta","Sábado","Domingo"];

  async function gerar(force = false) {
    if (loading) return;
    setLoading(true);
    setError(null);
    if (force) setCronograma(null);
    try {
      const res = await fetch("/api/workspace/estrategia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ horasPorDia, diasDisp }),
      });
      const data = await res.json() as { cronograma?: CronogramaData; error?: string };
      if (!res.ok || data.error) { setError(data.error ?? "Erro ao gerar"); return; }
      setCronograma(data.cronograma ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro de conexão");
    } finally {
      setLoading(false);
    }
  }

  const diasProva = profile.dataProva
    ? Math.max(0, Math.ceil((new Date(profile.dataProva).getTime() - Date.now()) / (1000*60*60*24)))
    : null;

  // Tela de config / inicial
  if (!cronograma && !loading) {
    return (
      <div className="max-w-2xl mx-auto px-5 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600/15 border border-indigo-500/25 flex items-center justify-center mx-auto mb-4 text-3xl">🗺️</div>
          <h2 className="font-bold text-xl mb-2">Cronograma Adaptativo</h2>
          <p className="text-gray-500 text-sm max-w-xs mx-auto">
            A IA analisa seu perfil, matérias e data da prova para montar um plano semanal personalizado.
          </p>
          {diasProva !== null && (
            <div className={cn("inline-flex items-center gap-2 mt-3 px-3 py-1.5 rounded-full text-xs font-semibold border",
              diasProva <= 7 ? "bg-red-500/10 border-red-500/25 text-red-400" :
              diasProva <= 30 ? "bg-amber-500/10 border-amber-500/25 text-amber-400" :
              "bg-green-500/10 border-green-500/25 text-green-400"
            )}>
              <Calendar className="w-3.5 h-3.5" />
              {diasProva} dias para a prova
            </div>
          )}
        </div>

        {/* Perfil atual */}
        {(profile.cargo || profile.orgao) && (
          <div className="rounded-xl border border-white/8 bg-white/3 p-4 mb-5">
            <p className="text-xs text-gray-600 uppercase tracking-widest mb-2">Seu perfil</p>
            <div className="flex flex-wrap gap-2">
              {profile.cargo && <span className="text-xs bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-2.5 py-1 rounded-full">{profile.cargo}</span>}
              {profile.orgao && <span className="text-xs bg-purple-500/10 border border-purple-500/20 text-purple-400 px-2.5 py-1 rounded-full">{profile.orgao}</span>}
              {subjects.length > 0 && <span className="text-xs bg-white/5 border border-white/10 text-gray-400 px-2.5 py-1 rounded-full">{subjects.length} matérias</span>}
            </div>
          </div>
        )}

        {/* Configuração */}
        <div className="rounded-xl border border-white/8 bg-white/3 p-5 mb-5">
          <button onClick={() => setShowConfig(!showConfig)} className="flex items-center justify-between w-full text-sm font-medium text-gray-300 hover:text-white transition-colors">
            <span>⚙️ Configurar disponibilidade</span>
            <ChevronRight className={cn("w-4 h-4 transition-transform text-gray-500", showConfig && "rotate-90")} />
          </button>
          {showConfig && (
            <div className="mt-4 space-y-4">
              {/* Horas por dia */}
              <div>
                <label className="text-xs text-gray-500 block mb-2">Horas de estudo por dia: <strong className="text-white">{horasPorDia}h</strong></label>
                <input type="range" min={1} max={10} step={0.5} value={horasPorDia} onChange={e => setHorasPorDia(Number(e.target.value))}
                  className="w-full accent-indigo-500" />
                <div className="flex justify-between text-[10px] text-gray-600 mt-1"><span>1h</span><span>10h</span></div>
              </div>
              {/* Dias disponíveis */}
              <div>
                <label className="text-xs text-gray-500 block mb-2">Dias disponíveis para estudar:</label>
                <div className="flex flex-wrap gap-2">
                  {DIAS_SEMANA.map(d => (
                    <button key={d} onClick={() => setDiasDisp(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])}
                      className={cn("px-3 py-1 rounded-full text-xs font-medium border transition-all",
                        diasDisp.includes(d)
                          ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-300"
                          : "bg-white/5 border-white/10 text-gray-500 hover:text-gray-300"
                      )}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-400 text-sm mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <button onClick={() => gerar()}
          disabled={diasDisp.length === 0}
          className="w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all
            bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40 disabled:cursor-not-allowed
            shadow-lg shadow-indigo-500/20">
          <Sparkles className="w-4 h-4" />
          Gerar meu cronograma semanal
        </button>
        <p className="text-center text-xs text-gray-600 mt-3">Leva cerca de 15 segundos • Gerado com IA</p>
      </div>
    );
  }

  // Loading
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20">
        <div className="w-14 h-14 rounded-2xl bg-indigo-600/15 border border-indigo-500/25 flex items-center justify-center mb-5 text-2xl">🧠</div>
        <p className="font-semibold text-base mb-2">Montando seu cronograma…</p>
        <p className="text-xs text-gray-500 mb-6 text-center max-w-xs">
          Analisando seu perfil, matérias e dias disponíveis para criar o plano ideal
        </p>
        <div className="flex gap-1.5">
          {[0,1,2].map(i => (
            <div key={i} className="w-2 h-2 rounded-full bg-indigo-500"
              style={{ animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
          ))}
        </div>
      </div>
    );
  }

  if (!cronograma) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Header com resumo */}
      <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-5 mb-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-400 flex-shrink-0" />
            <p className="font-bold text-base text-indigo-300">Cronograma da Semana</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600 bg-white/5 px-2 py-1 rounded-lg">
              {cronograma.horasTotais}h/semana
            </span>
            <button onClick={() => gerar(true)}
              className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition-colors"
              title="Gerar novo cronograma">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <p className="text-sm text-gray-300 mb-2 italic">&ldquo;{cronograma.resumo}&rdquo;</p>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-gray-600">🎯 Meta:</span>
          <span className="text-gray-400">{cronograma.metaSemanal}</span>
        </div>
        {cronograma.geradoEm && (
          <p className="text-[10px] text-gray-700 mt-2">
            Gerado em {new Date(cronograma.geradoEm).toLocaleString("pt-BR")}
          </p>
        )}
      </div>

      {/* Grade semanal */}
      <div className="space-y-3 mb-6">
        {(cronograma.semana ?? []).map((dia) => {
          const cor = DIA_CORES[dia.dia] ?? "#6366f1";
          if (dia.folga) {
            return (
              <div key={dia.dia} className="rounded-xl border border-white/6 bg-white/2 p-4 flex items-center gap-3 opacity-60">
                <div className="w-16 text-center">
                  <p className="text-xs font-bold" style={{ color: cor }}>{dia.dia}</p>
                </div>
                <p className="text-sm text-gray-600">🛌 Descanso</p>
              </div>
            );
          }
          return (
            <div key={dia.dia} className="rounded-xl border border-white/8 bg-white/3 overflow-hidden">
              {/* Dia header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/6"
                style={{ background: cor + "10" }}>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cor }} />
                  <p className="text-sm font-bold" style={{ color: cor }}>{dia.dia}</p>
                </div>
                <span className="text-xs text-gray-500">{dia.totalHoras}h de estudo</span>
              </div>
              {/* Matérias */}
              <div className="divide-y divide-white/4">
                {dia.materias.map((m, i) => {
                  const pConf = PRIORIDADE_CONFIG[m.prioridade] ?? PRIORIDADE_CONFIG.media;
                  return (
                    <div key={i} className="px-4 py-3">
                      <div className="flex items-start justify-between gap-3 mb-1.5">
                        <p className="text-sm font-medium text-gray-200">{m.nome}</p>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={cn("text-[10px] px-1.5 py-0.5 rounded border font-bold", pConf.bg, pConf.color)}>
                            {pConf.label}
                          </span>
                          <span className="text-xs text-gray-500 font-mono">{m.horas}h</span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 leading-relaxed">
                        💡 {m.dica}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Ações */}
      <div className="flex gap-3">
        <button onClick={() => gerar(true)}
          className="flex-1 py-3 rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-sm font-medium
            hover:bg-indigo-500/20 transition-colors flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4" /> Gerar novo cronograma
        </button>
        <button onClick={() => { setShowConfig(true); setCronograma(null); }}
          className="px-4 py-3 rounded-xl border border-white/10 bg-white/3 text-gray-400 text-sm
            hover:text-white hover:border-white/20 transition-colors">
          ⚙️ Ajustar
        </button>
      </div>
    </div>
  );
}

// ── Tab Simulados (old — preserved for reference) ─────────────────────────────
function _SimuladosTabLegacy({ simulados, loading }: { simulados: SimuladoItem[]; loading: boolean }) {
  const [selectedSimulado, setSelectedSimulado] = useState<{ id: string; name: string; questions: SimuladoQuestion[]; timeLimitMins: number } | null>(null);
  const [loadingSim, setLoadingSim] = useState(false);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [showExpl, setShowExpl] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [timeLeft, setTimeLeft] = useState(0);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (!started || finished || timeLeft <= 0) return;
    const t = setInterval(() => {
      setTimeLeft(s => {
        if (s <= 1) { clearInterval(t); setFinished(true); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [started, finished]);

  async function startSimulado(item: SimuladoItem) {
    setLoadingSim(true);
    const res = await fetch(`/api/simulados/${item.id}`);
    const data = await res.json();
    setLoadingSim(false);
    if (!res.ok) return;
    setSelectedSimulado({ id: data.id, name: data.name, questions: data.questions ?? [], timeLimitMins: data.timeLimitMins ?? 60 });
    setTimeLeft((data.timeLimitMins ?? 60) * 60);
    setCurrent(0); setSelected(null); setScore({ correct: 0, total: 0 });
    setShowExpl(false); setStarted(false); setFinished(false);
  }

  function fmtTime(s: number) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (loadingSim) return (
    <div className="flex flex-col items-center justify-center h-48 gap-3">
      <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-xs text-gray-500">Carregando simulado...</p>
    </div>
  );

  if (!selectedSimulado) {
    if (simulados.length === 0) return <EmptyState label="Nenhum simulado disponível no momento." />;
    return (
      <div className="space-y-3">
        {simulados.map(sim => (
          <div key={sim.id} className="rounded-xl border border-white/5 bg-white/3 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-medium text-sm">{sim.name}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                  {sim.banca && <span className="text-indigo-400">{sim.banca}</span>}
                  {sim.agentName && <span>{sim.agentName}</span>}
                  <span>{sim.totalQuestions} questões</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{sim.timeLimitMins} min</span>
                </div>
              </div>
              <button onClick={() => startSimulado(sim)}
                className="flex-shrink-0 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-xs font-medium transition-colors">
                Iniciar
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const qs = selectedSimulado.questions;
  const q = qs[current];

  if (!started) {
    return (
      <div className="text-center py-12">
        <ClipboardList className="w-14 h-14 text-indigo-500/40 mx-auto mb-4" />
        <h2 className="font-bold text-lg mb-2">{selectedSimulado.name}</h2>
        <p className="text-gray-400 text-sm mb-1">{qs.length} questões · {selectedSimulado.timeLimitMins} minutos</p>
        <p className="text-xs text-gray-600 mb-6">O tempo começa quando você clicar em Iniciar</p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => setSelectedSimulado(null)} className="px-4 py-2 rounded-lg border border-white/10 text-sm text-gray-400 hover:text-white transition-colors">
            Voltar
          </button>
          <button onClick={() => setStarted(true)}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm font-medium transition-colors">
            Iniciar simulado
          </button>
        </div>
      </div>
    );
  }

  if (finished || current >= qs.length) {
    const pct = qs.length > 0 ? Math.round(score.correct / qs.length * 100) : 0;
    return (
      <div className="text-center py-12">
        <CheckCircle2 className="w-14 h-14 text-green-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">Simulado concluído!</h2>
        <p className="text-2xl font-bold text-indigo-400 mb-1">{pct}%</p>
        <p className="text-gray-400 text-sm mb-6">{score.correct}/{qs.length} corretas</p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => setSelectedSimulado(null)} className="px-4 py-2 rounded-lg border border-white/10 text-sm text-gray-400 hover:text-white transition-colors">
            Ver outros simulados
          </button>
          <button onClick={() => { setCurrent(0); setSelected(null); setScore({ correct: 0, total: 0 }); setShowExpl(false); setTimeLeft(selectedSimulado.timeLimitMins * 60); setFinished(false); }}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
            <RotateCcw className="w-3.5 h-3.5" /> Refazer
          </button>
        </div>
      </div>
    );
  }

  const options = (["A","B","C","D","E"] as const)
    .map(k => ({ key: k, text: (q as unknown as Record<string, string | null>)[`option${k}`] }))
    .filter(o => o.text);

  function handleSelect(key: string) {
    if (selected) return;
    setSelected(key);
    const isCorrect = key === q.answer;
    setScore(s => ({ correct: s.correct + (isCorrect ? 1 : 0), total: s.total + 1 }));
  }

  return (
    <div>
      {/* Header simulado */}
      <div className="flex justify-between items-center text-xs text-gray-500 mb-3">
        <span>{q.materia} · Questão {current + 1}/{qs.length}</span>
        <div className="flex items-center gap-2">
          <span className={cn("font-mono font-bold", timeLeft < 300 ? "text-red-400" : "text-gray-400")}>
            <Clock className="w-3 h-3 inline mr-1" />{fmtTime(timeLeft)}
          </span>
          <span className={cn("px-2 py-0.5 rounded-full", {
            "bg-green-500/10 text-green-400": q.level === "facil",
            "bg-yellow-500/10 text-yellow-400": q.level === "medio",
            "bg-red-500/10 text-red-400": q.level === "dificil",
          })}>{q.level}</span>
        </div>
      </div>

      <div className="h-1 rounded-full bg-white/10 mb-4">
        <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${((current + 1) / qs.length) * 100}%` }} />
      </div>

      <p className="text-sm text-gray-200 leading-relaxed mb-4">{q.statement}</p>

      <div className="space-y-2 mb-4">
        {options.map(({ key, text }) => {
          const isSelected = selected === key;
          const isCorrect = key === q.answer;
          let style = "border-white/10 bg-white/3 hover:bg-white/5 text-gray-300";
          if (selected) {
            if (isCorrect) style = "border-green-500/50 bg-green-500/10 text-green-300";
            else if (isSelected) style = "border-red-500/50 bg-red-500/10 text-red-300";
            else style = "border-white/5 text-gray-600";
          }
          return (
            <button key={key} onClick={() => handleSelect(key)} disabled={!!selected}
              className={cn("w-full text-left flex items-center gap-2.5 p-3 rounded-lg border text-xs transition-all", style, !selected && "cursor-pointer")}>
              <span className={cn("w-5 h-5 rounded-full border flex items-center justify-center text-[10px] font-bold flex-shrink-0",
                selected && isCorrect ? "bg-green-500 border-green-500 text-white" :
                selected && isSelected ? "bg-red-500 border-red-500 text-white" : "border-current")}>
                {key}
              </span>
              <span className="flex-1">{text}</span>
              {selected && isCorrect && <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />}
              {selected && isSelected && !isCorrect && <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />}
            </button>
          );
        })}
      </div>

      {selected && (
        <div className="space-y-3">
          {q.explanation && (
            <div>
              <button onClick={() => setShowExpl(!showExpl)} className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 mb-2">
                {showExpl ? "Ocultar" : "Ver"} explicação
              </button>
              {showExpl && (
                <div className="p-3 rounded-lg bg-indigo-500/5 border border-indigo-500/20 text-xs text-gray-300 leading-relaxed">
                  {q.explanation}
                </div>
              )}
            </div>
          )}
          <button onClick={() => { setCurrent(c => c + 1); setSelected(null); setShowExpl(false); }}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-sm font-medium transition-colors">
            {current + 1 < qs.length ? "Próxima questão →" : "Finalizar simulado"}
          </button>
        </div>
      )}
    </div>
  );
}
