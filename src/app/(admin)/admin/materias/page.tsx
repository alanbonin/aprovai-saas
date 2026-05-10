import { db } from "@/lib/db";
import { MateriasAdmin } from "./materias-client";
import { CATEGORIAS } from "@/lib/agents";

export default async function MateriasAdminPage() {
  const { data: subjects, count } = await db
    .from("Subject")
    .select("*", { count: "exact" })
    .order("categoria")
    .order("ordem");

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Matérias</h1>
        <p className="text-gray-500 text-sm mt-1">{count ?? 0} matérias cadastradas</p>
      </div>
      <MateriasAdmin subjects={subjects ?? []} categorias={CATEGORIAS} />
    </div>
  );
}
