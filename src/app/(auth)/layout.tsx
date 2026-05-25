// Impede prerender estático das páginas de auth — o Supabase browser client
// valida a URL durante o render do servidor e lança erro sem as env vars.
export const dynamic = "force-dynamic";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
