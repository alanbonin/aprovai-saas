export const dynamic = "force-dynamic";
import { db } from "@/lib/db";
import { FlashcardsAdmin } from "./flashcards-client";

export default async function FlashcardsAdminPage() {
  const [{ data: sets }, { data: subjects }, { data: agents }] = await Promise.all([
    db.from("FlashcardSet").select("id, name, subjectId, cards, createdAt").order("createdAt", { ascending: false }),
    db.from("Subject").select("id, name, categoria").order("categoria").order("name"),
    db.from("Agent").select("id, name, banca, area, description, color").eq("active", true).order("name"),
  ]);

  const totalCards = (sets ?? []).reduce((sum, s) => {
    const cards = Array.isArray(s.cards) ? s.cards : [];
    return sum + cards.length;
  }, 0);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Flashcards</h1>
        <p className="text-slate-400 text-sm mt-1">
          {sets?.length ?? 0} decks · {totalCards.toLocaleString("pt-BR")} cards no total
        </p>
      </div>
      <FlashcardsAdmin sets={sets ?? []} subjects={subjects ?? []} agents={agents ?? []} />
    </div>
  );
}
