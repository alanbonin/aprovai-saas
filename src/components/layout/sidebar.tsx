"use client";
import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
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
  // Limpa flag de sessão — logout voluntário não mostra aviso
  try { localStorage.removeItem("was_logged_in"); localStorage.removeItem("kicked_out"); } catch {}
  window.location.href = "/login";
}

/* ── Tipos ─────────────────────────────────────────────────────────────── */
interface NavItem { href: string; label: string; icon: string; badge?: boolean; comingSoon?: boolean }
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
      { href: "/biblioteca",    label: "Biblioteca PDF",   icon: "📰", comingSoon: true },
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
    ],
  },
  {
    id: "analise", title: "Análise", color: "#8b5cf6", defaultOpen: false,
    items: [
      { href: "/relatorio",       label: "Relatório",      icon: "📊" },
      { href: "/resumo-semanal",  label: "Resumo Semanal", icon: "📋" },
      { href: "/diagnostico",     label: "Diagnóstico",    icon: "🩺" },
      { href: "/nivel",           label: "Por Nível",      icon: "📶" },
      { href: "/comparar",        label: "Vs. Média",      icon: "📊", comingSoon: true },
    ],
  },
  {
    id: "social", title: "Social", color: "#f97316", defaultOpen: false,
    items: [
      { href: "/ranking",      label: "Ranking",        icon: "🏆", comingSoon: true },
      { href: "/arena",        label: "Arena",          icon: "⚔️", comingSoon: true },
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
      { href: "/calculadora", label: "Calculadora",icon: "🧮", comingSoon: true },
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
  { href: "/hoje",      label: "Briefing",  icon: "☀️" },
  { href: "/semana",    label: "Semana",   icon: "📅" },
  { href: "/workspace", label: "Estudar",  icon: "📚" },
  { href: "/simulado",  label: "Simulado", icon: "🎯" },
];

function MobileBottomNav({ pathname, sections, unreadNotifs, mobileOpen, setMobileOpen, usageLimits, isPremium, trialDaysLeft }: {
  pathname: string;
  sections: NavSection[];
  unreadNotifs: number;
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
  usageLimits?: UsageLimits;
  isPremium?: boolean;
  trialDaysLeft?: number | null;
}) {
  const { theme, setTheme } = useTheme();
  const touchStartY = React.useRef<number>(0);
  const [dragY, setDragY] = React.useState(0);
  const [dragging, setDragging] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  useEffect(() => { setMounted(true); }, []);

  function handleTouchStart(e: React.TouchEvent) {
    touchStartY.current = e.touches[0].clientY;
    setDragging(true);
    setDragY(0);
  }

  function handleTouchMove(e: React.TouchEvent) {
    const dy = e.touches[0].clientY - touchStartY.current;
    if (dy > 0) setDragY(dy); // só deixa arrastar para baixo
  }

  function handleTouchEnd(e: React.TouchEvent) {
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    setDragging(false);
    if (dy > 80) {
      setDragY(600); // anima para fora
      setTimeout(() => { setMobileOpen(false); setDragY(0); }, 280);
    } else {
      setDragY(0); // volta suavemente
    }
  }

  if (!mounted) return null;

  return createPortal(
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
          "fixed bottom-16 left-0 right-0 z-[160] lg:hidden",
          !mobileOpen && "pointer-events-none"
        )}
        style={{
          maxHeight: "70vh",
          transform: mobileOpen ? `translateY(${dragY}px)` : "translateY(100%)",
          transition: dragging ? "none" : "transform 0.3s ease-out, opacity 0.3s ease-out",
          opacity: mobileOpen ? Math.max(0, 1 - dragY / 300) : 0,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="mx-2 rounded-2xl overflow-hidden border border-white/10"
          style={{ backgroundColor: "var(--bg-surface)" }}
        >
          {/* Handle — arraste para baixo para fechar */}
          <div className="flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing">
            <div className="w-10 h-1 rounded-full bg-white/30" />
          </div>

          {/* Banner de upgrade — trial ou sem plano */}
          {!isPremium && (
            <Link
              href="/planos"
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 mx-3 mt-3 mb-1 px-4 py-3 rounded-2xl border text-sm font-semibold transition-all",
                trialDaysLeft !== null && trialDaysLeft !== undefined
                  ? trialDaysLeft <= 3
                    ? "bg-red-500 border-red-600 text-white"
                    : "bg-amber-500 border-amber-600 text-white"
                  : "bg-indigo-600 border-indigo-700 text-white"
              )}
            >
              <span className="text-xl">⚡</span>
              <div className="flex-1 min-w-0">
                <p className="font-bold leading-tight">
                  {trialDaysLeft !== null && trialDaysLeft !== undefined
                    ? trialDaysLeft === 0 ? "Trial expirado!" : `${trialDaysLeft} dia${trialDaysLeft !== 1 ? "s" : ""} de trial restante${trialDaysLeft !== 1 ? "s" : ""}`
                    : "Fazer upgrade agora"}
                </p>
                <p className="text-[11px] opacity-80 font-normal">Ver planos e assinar →</p>
              </div>
              <span className="text-lg">→</span>
            </Link>
          )}

          {/* Seletor de Perfil no mobile */}
          <div className="px-3 pt-1 pb-2 border-b border-white/[0.06]">
            <ProfileSwitcher compact />
          </div>

          {/* Seções do menu */}
          <div className="overflow-y-auto p-2.5 space-y-2" style={{ maxHeight: "calc(70vh - 80px)" }}>
            {sections.map(section => (
              <div key={section.id}>
                <p className="text-[9px] font-bold uppercase tracking-widest px-2 mb-1"
                  style={{ color: section.color + "99" }}>
                  {section.title}
                </p>
                <div className="grid grid-cols-3 gap-1">
                  {section.items.map(item => {
                    const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href + "/"));
                    const hasNotif = item.href === "/notificacoes" && unreadNotifs > 0;
                    const usageEntry = usageLimits && HREF_RESOURCE[item.href] ? usageLimits[HREF_RESOURCE[item.href]] : null;
                    const usage = usageEntry ? { used: usageEntry.used, max: usageEntry.total } : null;
                    const isLocked = !isPremium && TRIAL_LOCKED_HREFS.has(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          "flex flex-col items-center gap-0.5 px-1.5 py-2 rounded-xl border text-center transition-all relative",
                          active ? "bg-indigo-600/25 border-indigo-500/40" : "bg-white/[0.03] border-white/8 hover:bg-white/8"
                        )}
                      >
                        <span className="text-lg leading-none">{item.icon}</span>
                        <span className={cn("text-[9px] font-medium leading-none", active ? "text-indigo-300" : "text-gray-400")}>
                          {item.label}
                        </span>
                        {/* Badge: notif, em breve, contador, locked */}
                        {hasNotif && <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />}
                        {(item as NavItem).comingSoon && (
                          <span className="text-[8px] font-bold px-1 py-0.5 rounded-full bg-white/10 text-gray-500 border border-white/10 leading-none mt-0.5">em breve</span>
                        )}
                        {!isLocked && !((item as NavItem).comingSoon) && usage && (
                          <span className="text-[8px] text-gray-600 leading-none">{usage.used}/{usage.max}</span>
                        )}
                        {isLocked && !((item as NavItem).comingSoon) && (
                          <span className="text-[8px] text-gray-600 leading-none">🔒</span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Config + Tema + Suporte + Sair */}
            <div className="grid grid-cols-2 gap-1 pt-1 border-t border-white/8">
              <Link href="/configuracoes" onClick={() => setMobileOpen(false)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/8 text-xs text-gray-400">
                ⚙️ <span>Config.</span>
              </Link>
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.03] border border-white/8 text-xs text-gray-400"
              >
                <span>{theme === "dark" ? "☀️" : "🌙"} Tema</span>
                <span className={cn(
                  "relative w-8 h-4 rounded-full transition-all duration-300 ml-2 flex-shrink-0",
                  theme === "light" ? "bg-amber-400" : "bg-indigo-500"
                )}>
                  <span className={cn(
                    "absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-all duration-300",
                    theme === "light" ? "left-0.5" : "left-[17px]"
                  )} />
                </span>
              </button>
              <a href="https://wa.me/5571983434291" target="_blank" rel="noopener noreferrer"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-500/[0.08] border border-green-500/20 text-xs text-green-400">
                💬 <span>Suporte</span>
              </a>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/[0.08] border border-red-500/20 text-xs text-red-400">
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
          paddingBottom: "env(safe-area-inset-bottom, 0px)", // suporte iPhone + Android gesture nav
          isolation: "isolate", // evita stacking context quebrado no Android com transform filhos
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
                <span className={cn("text-xl leading-none transition-transform emoji-icon", active && "scale-110")}>
                  {item.icon}
                </span>
                <span className={cn("text-[10px] font-medium", active ? "text-[#0ab5bd]" : "text-gray-600")}>
                  {item.label}
                </span>
              </Link>
            );
          })}

          {/* Botão upgrade rápido — só aparece quando não é premium (substitui um slot) */}
          {!isPremium && (
            <Link
              href="/planos"
              className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-all relative"
            >
              <span className="text-xl leading-none">⚡</span>
              <span className="text-[10px] font-bold text-amber-400">Upgrade</span>
              {trialDaysLeft !== null && trialDaysLeft !== undefined && trialDaysLeft <= 3 && (
                <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              )}
            </Link>
          )}

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
    </>,
    document.body
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
          {section.items.map(({ href, label, icon, badge, comingSoon }) => {
            const siblingHrefs = new Set(section.items.map(i => i.href));
            const active = pathname === href || (
              href !== "/" &&
              pathname.startsWith(href + "/") &&
              !section.items.some(i => i.href !== href && pathname.startsWith(i.href))
            );
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
                  "flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border",
                  active
                    ? isAdmin
                      ? "bg-orange-600/20 text-orange-300 border-orange-500/25"
                      : "bg-indigo-600/20 text-indigo-300 border-indigo-500/25"
                    : "text-gray-400 hover:text-white hover:bg-white/[0.05] border-transparent"
                )}
              >
                <span className="text-xs leading-none flex-shrink-0">{icon}</span>
                <span className="flex-1 truncate">{label}</span>
                {comingSoon ? (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 bg-white/[0.07] text-gray-500 border border-white/10">em breve</span>
                ) : showCounter ? (
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
  isAdmin?: boolean; userName?: string; planName?: string; avatarUrl?: string | null;
  aiCreditsLeft?: number; aiCreditsTotal?: number; isPremium?: boolean;
  trialDaysLeft?: number | null;
  usageLimits?: UsageLimits;
}

/* ── Componente principal ───────────────────────────────────────────────── */
export function Sidebar({ isAdmin, userName, planName, avatarUrl, aiCreditsLeft = 0, aiCreditsTotal = 10, isPremium, trialDaysLeft, usageLimits }: SidebarProps) {
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
        className="lg:hidden fixed top-0 left-0 right-0 z-[90] flex items-center justify-between px-4 border-b mobile-header-safe"
        style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-color)" }}
      >
        <a href={isAdmin ? "/admin" : "/hoje"} className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-icon.svg" alt="AprovAI360" className="w-7 h-7" />
          <p className="font-bold text-sm">
            <span style={{ color: "var(--text-primary)" }}>Aprov</span>
            <span style={{ color: "#0ab5bd" }}>AI</span>
            <span style={{ color: "var(--text-primary)" }}>360</span>
          </p>
        </a>
        {isAdmin && (
          <button
            onClick={() => setMobileOpen(o => !o)}
            className="p-2 rounded-lg text-gray-400 hover:text-white transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <rect y="2" width="18" height="2" rx="1" fill="currentColor"/>
              <rect y="8" width="18" height="2" rx="1" fill="currentColor"/>
              <rect y="14" width="18" height="2" rx="1" fill="currentColor"/>
            </svg>
          </button>
        )}
      </div>

      {/* ── Drawer lateral mobile para Admin ─────────────────────── */}
      {isAdmin && mobileOpen && (
        <div
          className="fixed inset-0 z-[150] bg-black/70 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Bottom Nav mobile (apenas alunos, não admin) ─────────── */}
      {!isAdmin && (
        <MobileBottomNav
          pathname={pathname}
          sections={sections}
          unreadNotifs={unreadNotifs}
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
          usageLimits={usageLimits}
          isPremium={isPremium}
          trialDaysLeft={trialDaysLeft}
        />
      )}

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
        "flex flex-col flex-shrink-0 z-[160]",
        // Mobile admin: drawer lateral fixo quando aberto
        isAdmin
          ? cn("fixed top-0 left-0 h-full w-64 transition-transform duration-300 lg:relative lg:translate-x-0 lg:h-screen lg:sticky lg:top-0",
              mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0")
          : "hidden",
        // Desktop: sticky, largura controlada por desktopOpen
        "lg:flex lg:relative lg:translate-x-0 lg:transition-none lg:h-screen lg:sticky lg:top-0",
        desktopOpen ? "lg:w-56" : "lg:w-0 lg:overflow-hidden lg:border-r-0",
        "border-r border-white/[0.06]"
      )}
      style={{ backgroundColor: "var(--bg-surface)" }}
    >

      {/* ── Logo + Briefing do Dia ──────────────────────────────── */}
      <div className="px-3 py-3 border-b border-white/[0.06] flex-shrink-0 space-y-1.5">
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
                ? "bg-amber-500/20 text-amber-300 border-amber-500/30 [html.light_&]:text-amber-700 [html.light_&]:bg-amber-100 [html.light_&]:border-amber-300"
                : "bg-amber-500/[0.07] text-amber-400/80 border-amber-500/15 hover:bg-amber-500/15 hover:text-amber-300 [html.light_&]:text-amber-700 [html.light_&]:bg-amber-50 [html.light_&]:border-amber-200 [html.light_&]:hover:bg-amber-100 [html.light_&]:hover:text-amber-800"
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
      <div className="border-t border-white/[0.06] p-2.5 space-y-2 flex-shrink-0">

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

        {/* Toggle dark/light — dijuntor visual */}
        {mounted && (
          <div id="tour-theme-toggle" className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-white/[0.05] transition-all">
            <div className="flex items-center gap-2">
              {theme === "light"
                ? <Sun className="w-3.5 h-3.5 text-amber-400" />
                : <Moon className="w-3.5 h-3.5 text-indigo-400" />
              }
              <span className="text-[11px] text-gray-400">
                {theme === "light" ? "Modo Claro" : "Modo Escuro"}
              </span>
            </div>
            {/* Switch toggle */}
            <button
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              title={theme === "light" ? "Mudar para escuro" : "Mudar para claro"}
              className={cn(
                "relative w-9 h-5 rounded-full transition-all duration-300 flex-shrink-0",
                theme === "light" ? "bg-amber-400" : "bg-indigo-500"
              )}
            >
              <span className={cn(
                "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-300",
                theme === "light" ? "left-0.5" : "left-[18px]"
              )} />
            </button>
          </div>
        )}

        {/* User card */}
        <div className="flex items-center gap-1.5 pt-0.5">
          <div className={cn(
            "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden",
            isAdmin ? "bg-orange-600/30" : "bg-indigo-600/30"
          )}>
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className={cn("text-xs font-bold", isAdmin ? "text-orange-400" : "text-indigo-400")}>
                {userName?.charAt(0).toUpperCase() ?? (isAdmin ? "A" : "U")}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-white truncate font-medium leading-tight">
              {userName ?? (isAdmin ? "Admin" : "Aluno")}
            </p>
            {!isAdmin && (
              <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                <Link href="/configuracoes" className="text-[9px] text-gray-500 hover:text-gray-300 transition-colors">Config.</Link>
                <span className="text-[9px] text-gray-700">·</span>
                <Link href="/planos" className="text-[9px] text-gray-500 hover:text-gray-300 transition-colors">Planos</Link>
                <span className="text-[9px] text-gray-700">·</span>
                <a href="/termos" target="_blank" className="text-[9px] text-gray-600 hover:text-gray-400 transition-colors">Termos</a>
                <span className="text-[9px] text-gray-700">·</span>
                <a href="https://wa.me/5571983434291" target="_blank" rel="noopener noreferrer" className="text-[9px] text-green-700 hover:text-green-500 transition-colors">Suporte</a>
              </div>
            )}
          </div>
          <button onClick={handleSignOut} title="Sair"
            className="text-gray-600 hover:text-red-400 transition-colors text-[10px] font-bold px-1 flex-shrink-0">
            Sair
          </button>
        </div>
      </div>
    </aside>

    </>
  );
}
