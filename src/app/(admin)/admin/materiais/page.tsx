import { db } from "@/lib/db";
import { FileText } from "lucide-react";
import { MateriaisAdmin } from "./materiais-client";

export default async function MateriaisAdminPage() {
  const [{ data: materials }, { data: subjects }] = await Promise.all([
    db.from("Material").select("*").order("createdAt", { ascending: false }).limit(200),
    db.from("Subject").select("id, name").order("name"),
  ]);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Materiais</h1>
          <p className="text-gray-500 text-sm mt-1">{(materials ?? []).length} materiais cadastrados</p>
        </div>
      </div>
      <MateriaisAdmin materials={materials ?? []} subjects={subjects ?? []} />
    </div>
  );
}
