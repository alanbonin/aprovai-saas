import { db } from "@/lib/db";
import { QuestoesAdmin } from "./questoes-client";

export default async function QuestoesAdminPage() {
  const { data: questions, count } = await db
    .from("Question")
    .select("id, banca, year, level, statement, answer", { count: "exact" })
    .order("id", { ascending: false })
    .limit(100);

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Questões</h1>
        <p className="text-gray-500 text-sm mt-1">{count ?? 0} questões no banco</p>
      </div>
      <QuestoesAdmin questions={questions ?? []} />
    </div>
  );
}
