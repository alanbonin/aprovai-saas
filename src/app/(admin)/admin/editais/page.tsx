import { db } from "@/lib/db";
import { Newspaper } from "lucide-react";
import { EditaisAdmin } from "./editais-client";

export default async function EditaisAdminPage() {
  const { data: editais } = await db
    .from("Edital")
    .select("*")
    .order("createdAt", { ascending: false })
    .limit(200);

  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
          <Newspaper className="w-5 h-5 text-indigo-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Radar de Editais</h1>
          <p className="text-gray-500 text-sm mt-0.5">{(editais ?? []).length} editais cadastrados</p>
        </div>
      </div>
      <EditaisAdmin editais={editais ?? []} />
    </div>
  );
}
