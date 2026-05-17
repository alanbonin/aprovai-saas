import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan, db } from "@/lib/db";

/**
 * GET /api/plano-estudos/export
 * Gera arquivo ICS (iCalendar) do cronograma semanal para importação
 * no Google Calendar, Apple Calendar, Outlook, etc.
 */

const NOTE_PREFIX = "__PLANO_ESTUDOS__";

const DIA_OFFSET: Record<string, number> = {
  dom: 0, seg: 1, ter: 2, qua: 3, qui: 4, sex: 5, sab: 6,
};

function icsDate(date: Date): string {
  // Format: 20240517T090000Z
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function escapeIcs(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Não autorizado", { status: 401 });

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) return new Response("Não encontrado", { status: 404 });

  // Carrega plano
  const { data: note } = await db.from("Note").select("content")
    .eq("userId", dbUser.id).eq("subjectId", NOTE_PREFIX).single();

  interface Bloco {
    dia: string; hora: string; durMin: number;
    atividade: string; subjectId: string | null;
  }
  let blocos: Bloco[] = [];
  try {
    const plano = note?.content ? JSON.parse(note.content) : null;
    blocos = plano?.blocos ?? [];
  } catch { /* no data */ }

  // Busca nomes das matérias se houver subjectIds
  const subjectIds = [...new Set(blocos.map(b => b.subjectId).filter(Boolean))] as string[];
  const subjectNames: Record<string, string> = {};
  if (subjectIds.length > 0) {
    const { data: subjects } = await db.from("Subject").select("id, name").in("id", subjectIds);
    for (const s of subjects ?? []) subjectNames[s.id] = s.name;
  }

  // Determina início da semana atual (domingo)
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setUTCHours(0, 0, 0, 0);
  weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay());

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Aprovai//Cronograma de Estudos//PT",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Cronograma Aprovai",
    "X-WR-TIMEZONE:America/Sao_Paulo",
  ];

  for (const bloco of blocos) {
    const offset = DIA_OFFSET[bloco.dia] ?? 0;
    const [hStr, mStr] = bloco.hora.split(":");
    const h = parseInt(hStr) || 0;
    const m = parseInt(mStr) || 0;

    const dtStart = new Date(weekStart);
    dtStart.setUTCDate(weekStart.getUTCDate() + offset);
    dtStart.setUTCHours(h + 3, m, 0, 0); // UTC-3 → UTC

    const dtEnd = new Date(dtStart.getTime() + (bloco.durMin ?? 60) * 60000);

    const subjectName = bloco.subjectId ? (subjectNames[bloco.subjectId] ?? "") : "";
    const summary = subjectName ? `${bloco.atividade} — ${subjectName}` : bloco.atividade;
    const uid = `aprovai-${dbUser.id}-${bloco.dia}-${bloco.hora.replace(":", "")}@aprovai.app`;

    lines.push(
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTART:${icsDate(dtStart)}`,
      `DTEND:${icsDate(dtEnd)}`,
      `SUMMARY:📚 ${escapeIcs(summary)}`,
      `DESCRIPTION:${escapeIcs(`Bloco de estudo - ${bloco.atividade}${subjectName ? ` em ${subjectName}` : ""} (${bloco.durMin} min)`)}`,
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");
  const icsContent = lines.join("\r\n");

  return new Response(icsContent, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="cronograma-aprovai.ics"`,
      "Cache-Control": "no-cache",
    },
  });
}
