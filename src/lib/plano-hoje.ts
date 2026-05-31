import { db } from "@/lib/db";

const DIAS_PT = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

/**
 * Retorna os nomes das matérias do plano semanal IA para o dia de hoje.
 * Retorna null se não houver plano da semana atual.
 */
export async function getMateriasPlanoHoje(
  userId: string,
  profileId: string | null
): Promise<string[] | null> {
  try {
    const weekStart = getWeekStart();
    const query = db
      .from("Note")
      .select("content")
      .eq("userId", userId)
      .is("subjectId", null)
      .limit(10);

    const { data: notes } = profileId
      ? await query.eq("profileId", profileId)
      : await query;

    if (!notes?.length) return null;

    let planNote: { cronograma: { semana: { dia: string; materias: { nome: string }[] }[] }; weekStart: string } | null = null;
    for (const note of notes) {
      try {
        const parsed = JSON.parse(note.content as string);
        if (parsed.__key === "plano_semanal" && parsed.weekStart === weekStart) {
          planNote = parsed;
          break;
        }
      } catch { /* skip */ }
    }

    if (!planNote) return null;

    // Dia de hoje em português
    const todayIdx = new Date().getDay(); // 0=Dom, 1=Seg, etc.
    const todayName = DIAS_PT[todayIdx];

    const todaySchedule = planNote.cronograma.semana.find(
      d => d.dia.toLowerCase() === todayName.toLowerCase() ||
           d.dia.toLowerCase().startsWith(todayName.toLowerCase().slice(0, 4))
    );

    if (!todaySchedule || todaySchedule.materias.length === 0) return null;

    return todaySchedule.materias.map((m: { nome: string }) => m.nome);
  } catch {
    return null;
  }
}

function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return monday.toISOString().split("T")[0];
}
