import { BibliotecaAdminClient } from "./biblioteca-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Biblioteca PDF — Admin AprovAI360" };

export default function BibliotecaAdminPage() {
  return <BibliotecaAdminClient />;
}
