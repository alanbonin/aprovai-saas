import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { Sidebar } from "@/components/layout/sidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: dbUser } = await db
    .from("User")
    .select("id, name, email, role")
    .eq("supabaseId", user.id)
    .single();

  if (!dbUser || dbUser.role !== "ADMIN") redirect("/hoje");

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: "var(--bg-base)" }}>
      <Sidebar
        isAdmin
        userName={dbUser.name ?? dbUser.email ?? "Admin"}
      />
      <main className="flex-1 min-w-0 overflow-auto">
        {children}
      </main>
    </div>
  );
}
