"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { ChevronDown, Sun, Moon, Menu, X } from "lucide-react";
import { ProfileSwitcher } from "@/components/layout/profile-switcher";

let signingOut = false;
async function handleSignOut() {
  if (signingOut) return;
  signingOut = true;
  // fetch + credentials: include → servidor invalida sessão e responde com
  // Set-Cookie para limpar os tokens; depois window.location força navegação
  // limpa sem os cookies SSR, evitando redirect-loop www→apex no middleware.
  try {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 5_000);
    await fetch("/api/auth/logout", { method: "POST", credentials: "include", signal: ctrl.signal });
    clearTimeout(tid);
  } catch { /* ignora timeout/rede — redireciona de qualquer forma */ }
  window.location.href = "/login";
}

/* ── Tipos ─────────────────────────────────────────────────────────────── */
interface NavItem { href: string; label: string; icon: string; badge?: boolean }
interface NavSection { id: string; title: string; color: string; items: NavItem[]; defaultOpen?: boolean }

/* ── Seções do aluno ────────────────────────────────────────────────────── */
const SECTIONS_STUDENT: NavSection[] = [
  {
    id: "planejar", title: "Planejar", color: "#ec4899", defaultOpen: true,
    items: [
      { href: "/plano-semanal",label: "Plano IA",    icon: "🤖" },
      { href: "/cronograma",   label: "Cronograma",  icon: "📅" },
      { href: "/metas",        label: "Metas",       icon: "🎯" },
    ],
  },
  {
    id: "praticar", title: "Praticar", color: "#6366f1", defaultOpen: true,
    items: [
      { href: "/workspace",     label: "Estudar",         icon: "📚" },
      { href: "/desafio",       label: "Desafio Diário",  icon: "⚡" },
      { href: "/quiz",          label: "Quiz Rápido",      icon: "🏃" },
      { href: "/desafio-semanal",label: "Desafio Semanal", icon: "⚔️" },
      { href: "/adaptativo",    label: "Adaptativo",       icon: "🧠" },
      { href: "/biblioteca",    label: "Biblioteca PDF",   icon: "📰" },
      { href: "/caso",          label: "Casos",            icon: "🔍" },
      { href: "/redacao",       label: "Redação",          icon: "✍️" },
      { href: "/flashcards",    label: "Flashcards",       icon: "🗂️" },
    ],
  },
  {
    id: "simulados", title: "Simulados", color: "#f59e0b", defaultOpen: true,
    items: [
      { href: "/simulado",           label: "Clássico",    icon: "🎯" },
      { href: "/simulado/filtrado",  label: "Com Filtros", icon: "🎛️" },
      { href: "/simulado/exame",     label: "Modo Exame",  icon: "⏱️" },
      { href: "/historico-simulados",label: "Histórico",   icon: "📈" },
    ],
  },
  {
    id: "revisao", title: "Revisão", color: "#10b981", defaultOpen: false,
    items: [
      { href: "/simulado/revisao",   label: "Revisão",         icon: "🔁" },
      { href: "/revisao",            label: "Revisão SM-2",    icon: "🔄" },
      { href: "/agenda-revisoes",label: "Agenda SM-2",     icon: "📆" },
      { href: "/caderno-erros",  label: "Caderno de Erros",icon: "📒" },
    ],
  },
  {
    id: "aprender", title: "Aprender IA", color: "#06b6d4", defaultOpen: false,
    items: [
      { href: "/mentor",    label: "Mentores",    icon: "🎓" },
      { href: "/glossario", label: "Glossário IA",icon: "📖" },
      { href: "/artigos",   label: "Artigos IA",  icon: "📜" },
    ],
  },
  {
    id: "analise", title: "Análise", color: "#8b5cf6", defaultOpen: false,
    items: [
      { href: "/relatorio",       label: "Relatório",      icon: "📊" },
      { href: "/resumo-semanal",  label: "Resumo Semanal", icon: "📋" },
      { href: "/diagnostico",     label: "Diagnóstico",    icon: "🩺" },
      { href: "/nivel",           label: "Por Nível",      icon: "📶" },
      { href: "/comparar",        label: "Vs. Média",      icon: "📊" },
    ],
  },
  {
    id: "social", title: "Social", color: "#f97316", defaultOpen: false,
    items: [
      { href: "/ranking",      label: "Ranking",        icon: "🏆" },
      { href: "/arena",        label: "Arena",          icon: "⚔️" },
      { href: "/grupos",       label: "Grupos",         icon: "👥" },
      { href: "/conquistas",   label: "Conquistas",     icon: "🎖️" },
      { href: "/timeline",     label: "Linha do Tempo", icon: "🕐" },
      { href: "/notificacoes", label: "Notificações",   icon: "🔔", badge: true },
    ],
  },
  {
    id: "ferramentas", title: "Ferramentas", color: "#94a3b8", defaultOpen: false,
    items: [
      { href: "/sessao",      label: "Cronômetro", icon: "⏱️" },
      { href: "/calculadora", label: "Calculadora",icon: "🧮" },
      { href: "/diario",      label: "Diário",     icon: "📔" },
      { href: "/notas",       label: "Anotações",  icon: "📓" },
    ],
  },
];

/* ── Seções do admin ───────────────────────────────────────────────────── */
const SECTIONS_ADMIN: NavSection[] = [
  {
    id: "admin-painel", title: "Painel", color: "#fb923c", defaultOpen: true,
    items: [
      { href: "/admin",           label: "Dashboard",        icon: "📊" },
      { href: "/admin/analytics", label: "Analytics",        icon: "📈" },
      { href: "/admin/alunos",    label: "Usuários",          icon: "👥" },
      { href: "/admin/relatorio", label: "Relatório Usuários", icon: "📉" },
    ],
  },
  {
    id: "admin-conteudo", title: "Conteúdo", color: "#f59e0b", defaultOpen: true,
    items: [
      { href: "/admin/questoes",                    label: "Questões",        icon: "📝" },
      { href: "/admin/questoes/gerar-massa",        label: "Gerar em Massa",  icon: "⚡" },
      { href: "/admin/questoes/gerar",              label: "Gerar Avulso",    icon: "✨" },
      { href: "/admin/questoes/import",             label: "Import CSV",      icon: "📥" },
      { href: "/admin/questoes/reportes",           label: "Reportes",        icon: "🚩" },
      { href: "/admin/flashcards",                  label: "Flashcards",      icon: "🗂️" },
      { href: "/admin/flashcards/gerar-massa",      label: "Flashcards Massa",icon: "🃏" },
      { href: "/admin/materias",          label: "Matérias",      icon: "📚" },
      { href: "/admin/topicos",           label: "Tópicos",       icon: "🏷️" },
      { href: "/admin/biblioteca",        label: "Biblioteca PDF", icon: "📰" },
      { href: "/admin/simulados",         label: "Simulados",     icon: "🎯" },
      { href: "/admin/editais",           label: "Editais",       icon: "📡" },
    ],
  },
  {
    id: "admin-ia", title: "Inteligência IA", color: "#8b5cf6", defaultOpen: false,
    items: [
      { href: "/admin/agentes", label: "Agentes IA", icon: "🤖" },
      { href: "/admin/ia-uso",  label: "Uso de IA",  icon: "🧠" },
    ],
  },
  {
    id: "admin-negocio", title: "Negócio", color: "#10b981", defaultOpen: false,
    items: [
      { href: "/admin/planos",      label: "Planos",      icon: "💳" },
      { href: "/admin/assinaturas", label: "Assinaturas", icon: "📋" },
      { href: "/admin/webhooks",    label: "Webhooks",    icon: "⚡" },
    ],
  },
  {
    id: "admin-sistema", title: "Sistema", color: "#64748b", defaultOpen: false,
    items: [
      { href: "/admin/configuracoes", label: "Configurações", icon: "⚙️" },
    ],
  },
  {
    id: "admin-comunicacao", title: "Comunicação", color: "#06b6d4", defaultOpen: false,
    items: [
      { href: "/admin/anuncio",        label: "Anúncios",          icon: "📢" },
      { href: "/admin/push",           label: "Push",              icon: "📲" },
      { href: "/admin/reengajamento",  label: "Reengajamento",     icon: "🔄" },
      { href: "/admin/emails",         label: "Templates de Email", icon: "✉️" },
    ],
  },
];

/* ── Subcomponente: seção recolhível ────────────────────────────────────── */
/* ── Mobile Bottom Nav ──────────────────────────────────────────────────── */
// 5 atalhos fixos + botão "Mais" que abre o menu completo
const BOTTOM_NAV = [
  { href: "/hoje",      label: "Hoje",     icon: "☀️" },
  { href: "/semana",    label: "Semana",   icon: "📅" },
  { href: "/workspace", label: "Estudar",  icon: "📚" },
  { href: "/simulado",  label: "Simulado", icon: "🎯" },
];

function MobileBottomNav({ pathname, sections, unreadNotifs, mobileOpen, setMobileOpen }: {
  pathname: string;
  sections: NavSection[];
  unreadNotifs: number;
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
}) {
  return (
    <>
      {/* Overlay do menu "Mais" */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-[150] bg-black/70 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sheet "Mais" — desliza de baixo */}
      <div
        className={cn(
          "fixed bottom-16 left-0 right-0 z-[160] lg:hidden transition-all duration-300 ease-out",
          mobileOpen ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 pointer-events-none"
        )}
        style={{ maxHeight: "70vh" }}
      >
        <div
          className="mx-2 rounded-2xl overflow-hidden border border-white/10"
          style={{ backgroundColor: "var(--bg-surface)" }}
        >
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-white/20" />
          </div>

          {/* Seções do menu */}
          <div className="overflow-y-auto p-3 space-y-3" style={{ maxHeight: "calc(70vh - 40px)" }}>
            {sections.map(section => (
              <div key={section.id}>
                <p className="text-[10px] font-bold uppercase tracking-widest px-2 mb-1.5"
                  style={{ color: section.color + "99" }}>
                  {section.title}
                </p>
                <div className="grid grid-cols-3 gap-1.5">
                  {section.items.map(item => {
                    const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href + "/"));
                    const hasNotif = item.href === "/notificacoes" && unreadNotifs > 0;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          "flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl border text-center transition-all relative",
                          active
                            ? "bg-indigo-600/25 border-indigo-500/40"
                            : "bg-white/[0.03] border-white/8 hover:bg-white/8"
                        )}
                      >
                        <span className="text-xl leading-none">{item.icon}</span>
                        <span className={cn("text-[10px] font-medium leading-none", active ? "text-indigo-300" : "text-gray-400")}>
                          {item.label}
                        </span>
                        {hasNotif && (
                          <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Config + Suporte + Sair */}
            <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-white/8">
              <Link href="/configuracoes" onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/8 text-xs text-gray-400">
                ⚙️ <span>Config.</span>
              </Link>
              <a href="https://wa.me/5571983434291" target="_blank" rel="noopener noreferrer"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-green-500/[0.08] border border-green-500/20 text-xs text-green-400">
                💬 <span>Suporte</span>
              </a>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-500/[0.08] border border-red-500/20 text-xs text-red-400">
                🚪 <span>Sair</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Barra inferior fixa ─────────────────────────────────── */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-[140] lg:hidden border-t border-white/10"
        style={{
          backgroundColor: "var(--bg-surface)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)", // suporte iPhone
        }}
      >
        <div className="flex items-stretch h-16">
          {BOTTOM_NAV.map(item => {
            const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href + "/"));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-1 transition-all",
                  active ? "text-[#0ab5bd]" : "text-gray-500 hover:text-gray-300"
                )}
              >
                <span className={cn("text-xl leading-none transition-transform", active && "scale-110")}>
                  {item.icon}
                </span>
                <span className={cn("text-[10px] font-medium", active ? "text-[#0ab5bd]" : "text-gray-600")}>
                  {item.label}
                </span>
              </Link>
            );
          })}

          {/* Botão "Mais" */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-1 transition-all relative",
              mobileOpen ? "text-[#0ab5bd]" : "text-gray-500 hover:text-gray-300"
            )}
          >
            <span className={cn("text-xl leading-none transition-transform", mobileOpen && "rotate-45")}>
              {mobileOpen ? "✕" : "⋯"}
            </span>
            <span className={cn("text-[10px] font-medium", mobileOpen ? "text-[#0ab5bd]" : "text-gray-600")}>
              Mais
            </span>
            {unreadNotifs > 0 && !mobileOpen && (
              <div className="absolute top-2 right-5 w-2 h-2 rounded-full bg-red-500" />
            )}
          </button>
        </div>
      </nav>
    </>
  );
}

function SidebarSection({
  section, isAdmin, open, onToggle, pathname, unreadNotifs, isPremium, usageLimits,
}: {
  section: NavSection;
  isAdmin: boolean;
  open: boolean;
  onToggle: () => void;
  pathname: string;
  unreadNotifs: number;
  isPremium?: boolean;
  usageLimits?: UsageLimits;
}) {
  const activeInSection = section.items.some(
    item => pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href + "/"))
  );

  return (
    <div className="mb-0.5">
      {/* Section header */}
      <button
        onClick={onToggle}
        className={cn(
          "w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors",
          activeInSection ? "text-white" : "text-gray-400 hover:text-gray-200"
        )}
      >
        <span
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ background: activeInSection ? section.color : "rgba(255,255,255,0.3)" }}
        />
        <span className="flex-1 text-left">{section.title}</span>
        <ChevronDown
          className={cn("w-3 h-3 flex-shrink-0 transition-transform duration-200", open && "rotate-180")}
          style={{ color: activeInSection ? section.color : undefined }}
        />
      </button>

      {/* Items */}
      {open && (
        <div className="mt-0.5 space-y-0.5 pl-1">
          {section.items.map(({ href, label, icon, badge }) => {
            const active = pathname === href || (href !== "/" && pathname.startsWith(href + "/"));
            const isNotif = href === "/notificacoes";
            const isLocked = !isPremium && TRIAL_LOCKED_HREFS.has(href);
            const resourceKey = HREF_RESOURCE[href];
            const usage = resourceKey && usageLimits ? usageLimits[resourceKey] : null;
            // Show counter when: resource has a positive finite limit (not -1/9999 = unlimited, not 0 = fully blocked/locked)
            const showCounter = usage && usage.total > 0 && usage.total < 9999;
            const usageExhausted = showCounter && usage!.used >= usage!.total;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all border",
                  active
                    ? isAdmin
                      ? "bg-orange-600/20 text-orange-300 border-orange-500/25"
                      : "bg-indigo-600/20 text-indigo-300 border-indigo-500/25"
                    : "text-gray-400 hover:text-white hover:bg-white/[0.05] border-transparent"
                )}
              >
                <span className="text-sm leading-none flex-shrink-0">{icon}</span>
                <span className="flex-1 truncate">{label}</span>
                {showCounter ? (
                  <span className={cn(
                    "text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 tabular-nums",
                    usageExhausted
                      ? "bg-red-500/20 text-red-400 border border-red-500/30"
                      : usage!.used >= usage!.total * 0.75
                        ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                        : "bg-white/[0.07] text-gray-400 border border-white/10"
                  )}>
                    {usage!.used}/{usage!.total}
                  </span>
                ) : isLocked ? (
                  <span className="text-[10px] text-gray-600 flex-shrink-0">🔒</span>
                ) : null}
                {badge && isNotif && unreadNotifs > 0 && (
                  <span className="min-w-[16px] h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-1 flex-shrink-0">
                    {unreadNotifs > 9 ? "9+" : unreadNotifs}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Subcomponente: stats footer ────────────────────────────────────────── */
interface Stats {
  totalAnswered: number; overallAccuracy: number; streak: number;
  xp: number; levelName: string; levelColor: string; xpProgress: number;
}

const TRIAL_LOCKED_HREFS = new Set([
  "/quiz", "/desafio-semanal", "/questoes", "/adaptativo",
  "/biblioteca",
  "/simulado", "/simulado/filtrado", "/simulado/revisao", "/simulado/exame", "/historico-simulados",
  "/arena",
  "/revisao", "/agenda-revisoes", "/favoritos",
  "/glossario", "/artigos", "/caso", "/redacao",
  "/resumo-semanal", "/diagnostico", "/bancas", "/nivel", "/comparar",
  "/plano-semanal",
  "/ranking", "/grupos", "/conquistas", "/timeline", "/notificacoes",
]);

interface UsageEntry { used: number; total: number }
interface UsageLimits { [resource: string]: UsageEntry }

// Maps sidebar href → WeeklyUsage resource key
const HREF_RESOURCE: Record<string, string> = {
  "/workspace": "questoes",
  "/caso":      "caso",
  "/redacao":   "redacao",
  "/simulado":  "simulado",
  "/simulado/filtrado": "simulado",
  "/simulado/exame":    "simulado",
  "/flashcards":"flashcards",
  "/biblioteca":"pdf",
};

interface SidebarProps {
  isAdmin?: boolean; userName?: string; planName?: string;
  aiCreditsLeft?: number; aiCreditsTotal?: number; isPremium?: boolean;
  trialDaysLeft?: number | null;
  usageLimits?: UsageLimits;
}

/* ── Componente principal ───────────────────────────────────────────────── */
export function Sidebar({ isAdmin, userName, planName, aiCreditsLeft = 0, aiCreditsTotal = 10, isPremium, trialDaysLeft, usageLimits }: SidebarProps) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(() => {
    try { return localStorage.getItem("sidebar-desktop-open") !== "false"; } catch { return true; }
  });

  function toggleDesktop() {
    setDesktopOpen(v => {
      const next = !v;
      try { localStorage.setItem("sidebar-desktop-open", String(next)); } catch { /* ok */ }
      return next;
    });
  }

  // Fecha o menu ao navegar para outra página (só mobile)
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const sections = isAdmin ? SECTIONS_ADMIN : SECTIONS_STUDENT;

  // Inicializa openMap a partir do localStorage ou dos defaults
  const [openMap, setOpenMap] = useState<Record<string, boolean>>(() => {
    const defaults: Record<string, boolean> = {};
    sections.forEach(s => { defaults[s.id] = s.defaultOpen ?? false; });
    return defaults;
  });

  useEffect(() => {
    setMounted(true);

    // Restaura estado do accordion do localStorage
    try {
      const saved = localStorage.getItem("sidebar-open-map");
      if (saved) {
        const parsed = JSON.parse(saved) as Record<string, boolean>;
        setOpenMap(prev => ({ ...prev, ...parsed }));
      }
    } catch { /* ignore */ }

    // Abre automaticamente a seção que contém a rota atual
    const activeSection = sections.find(s =>
      s.items.some(item => pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href + "/")))
    );
    if (activeSection) {
      setOpenMap(prev => ({ ...prev, [activeSection.id]: true }));
    }

    // Dados de stats — apenas para alunos
    if (!isAdmin) {
      const fetchStats = () => fetch("/api/relatorio", { cache: "no-store" })
        .then(r => r.ok ? r.json() : null)
        .then(d => {
          if (!d) return;
          setStats({
            totalAnswered: d.totalAnswered ?? 0,
            overallAccuracy: Math.round(d.overallAccuracy ?? 0),
            streak: d.streak ?? 0,
            xp: d.xp ?? 0,
            levelName: d.level?.name ?? "Iniciante",
            levelColor: d.level?.color ?? "#8b949e",
            xpProgress: d.progress ?? 0,
          });
        })
        .catch(() => {});

      fetchStats();

      // Re-busca stats quando qualquer questão é respondida (mesmo na mesma página)
      const onProgress = () => fetchStats();
      window.addEventListener("aprovai:progress", onProgress);

      fetch("/api/notificacoes")
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d) setUnreadNotifs(d.unread ?? 0); })
        .catch(() => {});

      return () => window.removeEventListener("aprovai:progress", onProgress);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, pathname]);

  function toggleSection(id: string) {
    setOpenMap(prev => {
      const next = { ...prev, [id]: !prev[id] };
      try { localStorage.setItem("sidebar-open-map", JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }

  return (
    <>
      {/* ── Header mobile fixo (lg:hidden) ────────────────────────── */}
      <div
        className="lg:hidden fixed top-0 left-0 right-0 z-[90] flex items-center justify-between px-4 h-12 border-b"
        style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-color)" }}
      >
        <a href="/hoje" className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-icon.svg" alt="AprovAI360" className="w-7 h-7" />
          <p className="font-bold text-sm">
            <span style={{ color: "var(--text-primary)" }}>Aprov</span>
            <span style={{ color: "#0ab5bd" }}>AI</span>
            <span style={{ color: "var(--text-primary)" }}>360</span>
          </p>
        </a>
      </div>

      {/* ── Bottom Nav mobile ─────────────────────────────────────── */}
      <MobileBottomNav
        pathname={pathname}
        sections={sections}
        unreadNotifs={unreadNotifs}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      {/* ── Botão toggle quando sidebar fechada (desktop) ─────────── */}
      {!desktopOpen && (
        <button
          onClick={toggleDesktop}
          className="hidden lg:flex fixed top-4 left-3 z-50 w-8 h-8 items-center justify-center rounded-lg border border-white/10 text-gray-400 hover:text-white transition-colors"
          style={{ backgroundColor: "var(--bg-surface)" }}
          title="Abrir menu"
        >
          <Menu className="w-4 h-4" />
        </button>
      )}

      {/* ── Sidebar — drawer mobile + sticky desktop ──────────────── */}
    <aside
      className={cn(
        "flex flex-col flex-shrink-0 z-[100]",
        // Mobile: oculto — usa bottom nav em vez de drawer lateral
        "hidden",
        // Desktop: sticky, largura controlada por desktopOpen
        "lg:flex lg:relative lg:translate-x-0 lg:transition-none lg:h-screen lg:sticky lg:top-0",
        desktopOpen ? "lg:w-56" : "lg:w-0 lg:overflow-hidden lg:border-r-0",
        "border-r border-white/[0.06]"
      )}
      style={{ backgroundColor: "var(--bg-surface)" }}
    >

      {/* ── Logo + Briefing do Dia ──────────────────────────────── */}
      <div className="px-4 py-4 border-b border-white/[0.06] flex-shrink-0 space-y-2">
        <div className="flex items-center justify-between">
        <a href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity flex-1 min-w-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-icon.svg" alt="AprovAI360" className="w-9 h-9 flex-shrink-0" />
          <div className="min-w-0">
            <p className="font-bold text-sm">
              <span className="text-white">Aprov</span>
              <span style={{ color: "#0ab5bd" }}>AI</span>
              <span className="text-white">360</span>
            </p>
            <p className="text-[10px] truncate" style={{ color: isAdmin ? "#fb923c" : "#6b7280" }}>
              {isAdmin ? "Painel Admin" : (planName ?? "Gratuito")}
            </p>
          </div>
        </a>
        {/* Botão fechar sidebar (desktop) */}
        <button
          onClick={toggleDesktop}
          className="hidden lg:flex w-7 h-7 items-center justify-center rounded-md text-gray-500 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
          title="Fechar menu"
        >
          <X className="w-4 h-4" />
        </button>
        </div>

        {/* Briefing do Dia — destaque fixo (só aluno) */}
        {!isAdmin && (
          <Link
            href="/hoje"
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all",
              pathname === "/hoje"
                ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                : "bg-amber-500/[0.07] text-amber-400/80 border-amber-500/15 hover:bg-amber-500/15 hover:text-amber-300"
            )}
          >
            <span className="text-sm">☀️</span>
            <span>Briefing do Dia</span>
          </Link>
        )}
      </div>

      {/* ── Seletor de Perfil (apenas alunos) ─────────────────── */}
      {!isAdmin && <ProfileSwitcher />}

      {/* ── Nav com seções recolhíveis ─────────────────────────── */}
      <nav className="flex-1 p-2 overflow-y-auto">
        {mounted && sections.map(section => (
          <SidebarSection
            key={section.id}
            section={section}
            isAdmin={!!isAdmin}
            open={openMap[section.id] ?? section.defaultOpen ?? false}
            onToggle={() => toggleSection(section.id)}
            pathname={pathname}
            unreadNotifs={unreadNotifs}
            isPremium={isPremium}
            usageLimits={usageLimits}
          />
        ))}
      </nav>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <div className="border-t border-white/[0.06] p-3 space-y-3 flex-shrink-0">

        {/* XP bar + mini stats — apenas alunos */}
        {!isAdmin && (
          <>
            {stats && (
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[11px] font-bold" style={{ color: stats.levelColor }}>
                    {stats.levelName}
                  </span>
                  <span className="text-[10px] text-gray-400 font-mono">{stats.xp} XP</span>
                </div>
                <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${stats.xpProgress}%`, background: stats.levelColor }} />
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-1">
              {[
                { label: "Quest.", value: String(stats?.totalAnswered ?? 0), color: "#6366f1" },
                { label: "Acerto", value: stats ? `${stats.overallAccuracy}%` : "—", color: "#34d399" },
                { label: "Streak", value: `${stats?.streak ?? 0}d`, color: "#f59e0b" },
              ].map(s => (
                <div key={s.label} className="text-center">
                  <div className="text-[11px] font-bold font-mono" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-[9px] text-gray-400">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="rounded-lg bg-white/[0.03] border border-white/[0.05] px-2.5 py-2">
              <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                <span>Mentoria IA / semana</span>
                <span className="font-mono">{aiCreditsLeft}/{aiCreditsTotal}</span>
              </div>
              <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full rounded-full bg-indigo-500 transition-all"
                  style={{ width: `${Math.min(100, (aiCreditsLeft / aiCreditsTotal) * 100)}%` }} />
              </div>
            </div>
          </>
        )}

        {/* Badge admin */}
        {isAdmin && (
          <div className="rounded-lg bg-orange-500/[0.08] border border-orange-500/20 px-2.5 py-2 text-center">
            <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest">
              ⚙️ Painel Admin
            </span>
          </div>
        )}

        {/* Banner de trial — exibe quando está no período gratuito */}
        {!isAdmin && trialDaysLeft !== null && trialDaysLeft !== undefined && (
          <div className={cn(
            "rounded-lg border px-2.5 py-2 space-y-1.5",
            trialDaysLeft <= 3
              ? "bg-amber-500/10 border-amber-500/30"
              : "bg-white/[0.03] border-white/[0.06]"
          )}>
            <p className={cn(
              "text-[10px] font-semibold",
              trialDaysLeft <= 3 ? "text-amber-400" : "text-gray-400"
            )}>
              {trialDaysLeft === 0
                ? "⏰ Trial expira hoje!"
                : `⏰ ${trialDaysLeft} dia${trialDaysLeft !== 1 ? "s" : ""} de trial restante${trialDaysLeft !== 1 ? "s" : ""}`}
            </p>
            <Link
              href="/planos"
              className={cn(
                "flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg text-[11px] font-bold transition-all",
                trialDaysLeft <= 3
                  ? "bg-amber-500 hover:bg-amber-400 text-white"
                  : "bg-indigo-600 hover:bg-indigo-500 text-white"
              )}
            >
              ⚡ Fazer upgrade
            </Link>
          </div>
        )}

        {/* Botão de upgrade para planos não-premium sem trial ativo */}
        {!isAdmin && !isPremium && (trialDaysLeft === null || trialDaysLeft === undefined) && (
          <Link
            href="/planos"
            className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold transition-all"
          >
            ⚡ Fazer upgrade
          </Link>
        )}

        {/* Toggle dark/light */}
        {mounted && (
          <button
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            title={theme === "light" ? "Alternar para modo escuro" : "Alternar para modo claro"}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] text-gray-500 hover:text-gray-300 hover:bg-white/[0.05] transition-all"
          >
            {theme === "light"
              ? <><Sun className="w-3.5 h-3.5 text-amber-400" /><span className="text-amber-400/80">Modo Claro</span></>
              : <><Moon className="w-3.5 h-3.5 text-indigo-400" /><span className="text-indigo-400/80">Modo Escuro</span></>
            }
          </button>
        )}

        {/* User card */}
        <div className="flex items-center gap-1.5 pt-0.5">
          <div className={cn(
            "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0",
            isAdmin ? "bg-orange-600/30" : "bg-indigo-600/30"
          )}>
            <span className={cn("text-xs font-bold", isAdmin ? "text-orange-400" : "text-indigo-400")}>
              {userName?.charAt(0).toUpperCase() ?? (isAdmin ? "A" : "U")}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-white truncate font-medium">
              {userName ?? (isAdmin ? "Admin" : "Aluno")}
            </p>
            {!isAdmin && (
              <div className="flex flex-col gap-0.5">
                <div className="flex gap-2">
                  <Link href="/configuracoes" className="text-[10px] text-gray-400 hover:text-gray-200 transition-colors">Config.</Link>
                  <Link href="/planos" className="text-[10px] text-gray-400 hover:text-gray-200 transition-colors">Planos</Link>
                </div>
                <div className="flex gap-2 mt-0.5">
                  <a href="/termos" target="_blank" className="text-[10px] text-gray-600 hover:text-gray-400 transition-colors">Termos</a>
                  <a href="/privacidade" target="_blank" className="text-[10px] text-gray-600 hover:text-gray-400 transition-colors">Privacidade</a>
                  <a href="https://wa.me/5571983434291" target="_blank" rel="noopener noreferrer" className="text-[10px] text-green-600 hover:text-green-400 transition-colors">💬 Suporte</a>
                </div>
              </div>
            )}
          </div>
          <button onClick={handleSignOut} title="Sair"
            className="text-gray-600 hover:text-red-400 transition-colors text-xs font-bold px-1">
            Sair
          </button>
        </div>
      </div>
    </aside>

    </>
  );
}
