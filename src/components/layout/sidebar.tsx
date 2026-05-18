"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { ChevronDown, Sun, Moon } from "lucide-react";

/* ── Tipos ─────────────────────────────────────────────────────────────── */
interface NavItem { href: string; label: string; icon: string; badge?: boolean }
interface NavSection { id: string; title: string; color: string; items: NavItem[]; defaultOpen?: boolean }

/* ── Seções do aluno ────────────────────────────────────────────────────── */
const SECTIONS_STUDENT: NavSection[] = [
  {
    id: "praticar", title: "Praticar", color: "#6366f1", defaultOpen: true,
    items: [
      { href: "/workspace",     label: "Estudar",         icon: "📚" },
      { href: "/desafio",       label: "Desafio Diário",  icon: "⚡" },
      { href: "/quiz",          label: "Quiz Rápido",      icon: "🏃" },
      { href: "/desafio-semanal",label: "Desafio Semanal", icon: "⚔️" },
      { href: "/questoes",      label: "Questões",         icon: "📝" },
      { href: "/adaptativo",    label: "Adaptativo",       icon: "🧠" },
    ],
  },
  {
    id: "simulados", title: "Simulados", color: "#f59e0b", defaultOpen: true,
    items: [
      { href: "/simulado",           label: "Clássico",    icon: "🎯" },
      { href: "/simulado/filtrado",  label: "Com Filtros", icon: "🎛️" },
      { href: "/simulado/revisao",   label: "Revisão",     icon: "🔁" },
      { href: "/simulado/exame",     label: "Modo Exame",  icon: "⏱️" },
      { href: "/historico-simulados",label: "Histórico",   icon: "📈" },
    ],
  },
  {
    id: "revisao", title: "Revisão", color: "#10b981", defaultOpen: false,
    items: [
      { href: "/revisao",        label: "Revisão SM-2",    icon: "🔄" },
      { href: "/agenda-revisoes",label: "Agenda SM-2",     icon: "📆" },
      { href: "/caderno-erros",  label: "Caderno de Erros",icon: "📒" },
      { href: "/flashcards",     label: "Flashcards",      icon: "🗂️" },
      { href: "/favoritos",      label: "Favoritos",       icon: "⭐" },
    ],
  },
  {
    id: "aprender", title: "Aprender IA", color: "#06b6d4", defaultOpen: false,
    items: [
      { href: "/mentor",    label: "Mentores",    icon: "🎓" },
      { href: "/glossario", label: "Glossário IA",icon: "📖" },
      { href: "/artigos",   label: "Artigos IA",  icon: "📜" },
      { href: "/caso",      label: "Casos",       icon: "🔍" },
      { href: "/redacao",   label: "Redação",     icon: "✍️" },
      { href: "/materiais", label: "Materiais",   icon: "📄" },
    ],
  },
  {
    id: "analise", title: "Análise", color: "#8b5cf6", defaultOpen: false,
    items: [
      { href: "/relatorio",       label: "Relatório",      icon: "📊" },
      { href: "/resumo-semanal",  label: "Resumo Semanal", icon: "📋" },
      { href: "/diagnostico",     label: "Diagnóstico",    icon: "🩺" },
      { href: "/bancas",          label: "Por Banca",      icon: "🏛️" },
      { href: "/nivel",           label: "Por Nível",      icon: "📶" },
      { href: "/comparar",        label: "Vs. Média",      icon: "📊" },
    ],
  },
  {
    id: "planejar", title: "Planejar", color: "#ec4899", defaultOpen: false,
    items: [
      { href: "/metas",        label: "Metas",       icon: "🎯" },
      { href: "/cronograma",   label: "Cronograma",  icon: "📅" },
      { href: "/plano-semanal",label: "Plano IA",    icon: "🤖" },
      { href: "/edital-watch", label: "Radar Editais",icon: "📡" },
    ],
  },
  {
    id: "social", title: "Social", color: "#f97316", defaultOpen: false,
    items: [
      { href: "/ranking",      label: "Ranking",        icon: "🏆" },
      { href: "/grupos",       label: "Grupos",         icon: "👥" },
      { href: "/conquistas",   label: "Conquistas",     icon: "🎖️" },
      { href: "/timeline",     label: "Linha do Tempo", icon: "🕐" },
      { href: "/notificacoes", label: "Notificações",   icon: "🔔", badge: true },
    ],
  },
  {
    id: "ferramentas", title: "Ferramentas", color: "#94a3b8", defaultOpen: false,
    items: [
      { href: "/pomodoro",    label: "Pomodoro",   icon: "🍅" },
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
      { href: "/admin/alunos",    label: "Alunos",           icon: "👥" },
      { href: "/admin/relatorio", label: "Relatório Alunos", icon: "📉" },
    ],
  },
  {
    id: "admin-conteudo", title: "Conteúdo", color: "#f59e0b", defaultOpen: true,
    items: [
      { href: "/admin/questoes",          label: "Questões",    icon: "📝" },
      { href: "/admin/questoes/gerar",    label: "Gerar com IA",icon: "✨" },
      { href: "/admin/questoes/import",   label: "Import CSV",  icon: "📥" },
      { href: "/admin/questoes/reportes", label: "Reportes",    icon: "🚩" },
      { href: "/admin/flashcards",        label: "Flashcards",  icon: "🗂️" },
      { href: "/admin/materias",          label: "Matérias",    icon: "📚" },
      { href: "/admin/materiais",         label: "Materiais",   icon: "📄" },
      { href: "/admin/simulados",         label: "Simulados",   icon: "🎯" },
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
    id: "admin-comunicacao", title: "Comunicação", color: "#06b6d4", defaultOpen: false,
    items: [
      { href: "/admin/anuncio",        label: "Anúncios",      icon: "📢" },
      { href: "/admin/push",           label: "Push",          icon: "📲" },
      { href: "/admin/reengajamento",  label: "Reengajamento", icon: "🔄" },
    ],
  },
];

/* ── Subcomponente: seção recolhível ────────────────────────────────────── */
function SidebarSection({
  section, isAdmin, open, onToggle, pathname, unreadNotifs,
}: {
  section: NavSection;
  isAdmin: boolean;
  open: boolean;
  onToggle: () => void;
  pathname: string;
  unreadNotifs: number;
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

interface SidebarProps {
  isAdmin?: boolean; userName?: string; planName?: string;
  aiCreditsLeft?: number; aiCreditsTotal?: number;
}

/* ── Componente principal ───────────────────────────────────────────────── */
export function Sidebar({ isAdmin, userName, planName, aiCreditsLeft = 0, aiCreditsTotal = 10 }: SidebarProps) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [unreadNotifs, setUnreadNotifs] = useState(0);

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
      fetch("/api/relatorio")
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

      fetch("/api/notificacoes")
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d) setUnreadNotifs(d.unread ?? 0); })
        .catch(() => {});
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
    <aside className="flex flex-col w-56 min-h-screen border-r border-white/[0.06] flex-shrink-0" style={{ backgroundColor: "var(--bg-surface)" }}>

      {/* ── Logo + Briefing do Dia ──────────────────────────────── */}
      <div className="px-4 py-4 border-b border-white/[0.06] flex-shrink-0 space-y-2">
        <div className="flex items-center gap-3">
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
              <div className="flex gap-2">
                <Link href="/configuracoes" className="text-[10px] text-gray-400 hover:text-gray-200 transition-colors">Config.</Link>
                <Link href="/planos" className="text-[10px] text-gray-400 hover:text-gray-200 transition-colors">Planos</Link>
              </div>
            )}
          </div>
          <form action="/api/auth/logout" method="POST">
            <button type="submit" title="Sair"
              className="text-gray-600 hover:text-red-400 transition-colors text-xs font-bold px-1">
              Sair
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
