import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import Link from "next/link";
import { LayoutDashboard, Users, Brain, BookOpen, FileText, Trophy, ArrowLeft, Layers } from "lucide-react";

const adminNav = [
  { href: "/admin",           label: "Visão geral",  icon: LayoutDashboard },
  { href: "/admin/alunos",    label: "Alunos",        icon: Users },
  { href: "/admin/agentes",   label: "Agentes",       icon: Brain },
  { href: "/admin/materias",  label: "Matérias",      icon: Layers },
  { href: "/admin/questoes",  label: "Questões",      icon: BookOpen },
  { href: "/admin/materiais", label: "Materiais",     icon: FileText },
  { href: "/admin/planos",    label: "Planos",        icon: Trophy },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: dbUser } = await db.from("User").select("role").eq("supabaseId", user.id).single();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");

  return (
    <div className="flex min-h-screen bg-[#080c18] text-white">
      <aside className="w-60 min-h-screen bg-[#0d1117] border-r border-white/5 flex flex-col">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5">
          <div className="w-7 h-7 rounded-md bg-orange-500 flex items-center justify-center">
            <Trophy className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-sm">Aprovai Admin</span>
        </div>

        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {adminNav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="p-3 border-t border-white/5">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-500 hover:text-white hover:bg-white/5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao app
          </Link>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
