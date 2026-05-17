import { db } from "@/lib/db";
import { FlashcardsAdmin } from "./flashcards-client";

export default async function FlashcardsAdminPage() {
  const [{ data: sets }, { data: subjects }, { data: agents }] = await Promise.all([
    db.from("FlashcardSet").select("id, name, subjectId, cards, createdAt").order("createdAt", { ascending: false }),
    db.from("Subject").select("id, name").order("name"),
    db.from("Agent").select("id, name, banca, area, description, color").eq("active", true).order("name"),
  ]);

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Flashcards</h1>
        <p className="text-gray-500 text-sm mt-1">{sets?.length ?? 0} deck(s) cadastrados</p>
      </div>
      <FlashcardsAdmin sets={sets ?? []} subjects={subjects ?? []} agents={agents ?? []} />
    </div>
  );
}
