"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Brain, BookOpen, FileText, CreditCard,
  Users, Settings, LogOut, Trophy, Target
} from "lucide-react";

const navItems = [
  { href: "/dashboard",  label: "Dashboard",  icon: LayoutDashboard },
  { href: "/mentor",     label: "Mentores IA", icon: Brain },
  { href: "/questoes",   label: "Questões",   icon: Target },
  { href: "/simulado",   label: "Simulado",   icon: Trophy },
  { href: "/materiais",  label: "Materiais",  icon: FileText },
  { href: "/planos",     label: "Planos",     icon: CreditCard },
];

const adminItems = [
  { href: "/admin",          label: "Admin",    icon: Settings },
  { href: "/admin/alunos",   label: "Alunos",   icon: Users },
  { href: "/admin/questoes", label: "Questões", icon: BookOpen },
];

interface SidebarProps {
  isAdmin?: boolean;
  userName?: string;
  planName?: string;
  aiCreditsLeft?: number;
  aiCreditsTotal?: number;
}

export function Sidebar({ isAdmin, userName, planName, aiCreditsLeft = 0, aiCreditsTotal = 10 }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex flex-col w-64 min-h-screen bg-[#0d1117] border-r border-white/5">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-white/5">
        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
          <Trophy className="w-4 h-4 text-white" />
        </div>
        <span className="text-white font-bold text-lg">Aprovai</span>
      </div>

      {/* Nav principal */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
              pathname === href || pathname.startsWith(href + "/")
                ? "bg-indigo-600/20 text-indigo-400 font-medium"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </Link>
        ))}

        {isAdmin && (
          <>
            <div className="pt-4 pb-1 px-3">
              <span className="text-xs text-gray-600 uppercase tracking-wider">Admin</span>
            </div>
            {adminItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                  pathname.startsWith(href)
                    ? "bg-orange-600/20 text-orange-400 font-medium"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}
          </>
        )}
      </nav>

      {/* Cota de IA */}
      <div className="px-4 py-3 mx-3 mb-3 rounded-lg bg-white/5 border border-white/5">
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>Mentoria IA esta semana</span>
          <span>{aiCreditsLeft}/{aiCreditsTotal}</span>
        </div>
        <div className="h-1.5 rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-indigo-500 transition-all"
            style={{ width: `${Math.min(100, (aiCreditsLeft / aiCreditsTotal) * 100)}%` }}
          />
        </div>
      </div>

      {/* User */}
      <div className="flex items-center gap-3 px-4 py-4 border-t border-white/5">
        <div className="w-8 h-8 rounded-full bg-indigo-600/30 flex items-center justify-center">
          <span className="text-indigo-400 text-xs font-bold">
            {userName?.charAt(0).toUpperCase() ?? "U"}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white truncate">{userName ?? "Aluno"}</p>
          <p className="text-xs text-gray-500 truncate">{planName ?? "Gratuito"}</p>
        </div>
        <form action="/api/auth/logout" method="POST">
          <button type="submit" className="text-gray-600 hover:text-gray-400 transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </form>
      </div>
    </aside>
  );
}
