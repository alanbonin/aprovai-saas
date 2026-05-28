import { db } from "@/lib/db";
import { BibliotecaAdmin } from "./biblioteca-client";

export const dynamic = "force-dynamic";

export default async function BibliotecaAdminPage() {
  const [{ data: docs }, { data: subjects }] = await Promise.all([
    db.from("PdfDocument")
      .select("id, title, description, subjectId, topicId, fileSize, pageCount, planLevel, createdAt")
      .order("createdAt", { ascending: false })
      .limit(200),
    db.from("Subject").select("id, name, categoria").order("categoria").order("name"),
  ]);

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Biblioteca de PDFs</h1>
        <p className="text-gray-500 text-sm mt-1">{docs?.length ?? 0} documentos cadastrados</p>
      </div>
      <BibliotecaAdmin docs={docs ?? []} subjects={subjects ?? []} />
    </div>
  );
}
