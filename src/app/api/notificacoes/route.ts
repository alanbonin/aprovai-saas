import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan, db } from "@/lib/db";

const READ_PREFIX = "__NOTIF_READ__";
const ADMIN_PREFIX = "__ADMIN_NOTIF__";
const SIMULADO_NOTIF_PREFIX = "__SIMULADO_NOTIF__";

/** Busca IDs de notificações já lidas pelo aluno */
async function getReadIds(userId: string): Promise<Set<string>> {
  const { data } = await db.from("Note").select("content")
    .eq("userId", userId).eq("subjectId", READ_PREFIX).single();
  try {
    const ids: string[] = data?.content ? JSON.parse(data.content) : [];
    return new Set(ids);
  } catch { return new Set(); }
}

async function saveReadIds(userId: string, ids: string[], existingNoteId?: string) {
  const content = JSON.stringify(ids);
  if (existingNoteId) {
    await db.from("Note").update({ content }).eq("id", existingNoteId);
  } else {
    await db.from("Note").insert({ userId, subjectId: READ_PREFIX, content });
  }
}

/**
 * GET /api/notificacoes
 * Retorna notificações geradas dinamicamente + anúncios admin.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const [profile, flashcardSets, readNote, adminNotes, totalProgress, simuladoNote] = await Promise.all([
    db.from("StudentProfile").select("streak, xp, lastStudyDate, dataProva, cargo").eq("userId", dbUser.id).single(),
    db.from("FlashcardSet").select("cards").eq("userId", dbUser.id),
    db.from("Note").select("id, content").eq("userId", dbUser.id).eq("subjectId", READ_PREFIX).single(),
    db.from("Note").select("id, content, updatedAt").eq("subjectId", ADMIN_PREFIX).order("updatedAt", { ascending: false }).limit(5),
    db.from("Progress").select("id", { count: "exact" }).eq("userId", dbUser.id),
    db.from("Note").select("id, content, updatedAt").eq("userId", dbUser.id).eq("subjectId", SIMULADO_NOTIF_PREFIX).single(),
  ]);

  const readIds = await getReadIds(dbUser.id);
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  type Notification = {
    id: string; type: string; title: string; message: string;
    createdAt: string; read: boolean; icon: string;
  };
  const notifs: Notification[] = [];

  const prof = profile.data;

  // --- Streak milestones ---
  const streak = prof?.streak ?? 0;
  const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100];
  for (const m of STREAK_MILESTONES) {
    if (streak >= m) {
      const id = `streak_${m}`;
      notifs.push({
        id, type: "streak", icon: "🔥",
        title: `${m} dias de sequência!`,
        message: `Você está estudando há ${m} dias seguidos. Continue assim!`,
        createdAt: now.toISOString(),
        read: readIds.has(id),
      });
    }
  }

  // --- XP level notifications ---
  const xp = prof?.xp ?? 0;
  const XP_LEVELS = [
    { xp: 200,   name: "Estudioso" },
    { xp: 600,   name: "Comprometido" },
    { xp: 1200,  name: "Dedicado" },
    { xp: 2500,  name: "Avançado" },
    { xp: 5000,  name: "Expert" },
    { xp: 9000,  name: "Mestre" },
    { xp: 15000, name: "Aprovado" },
  ];
  for (const lvl of XP_LEVELS) {
    if (xp >= lvl.xp) {
      const id = `level_${lvl.name}`;
      notifs.push({
        id, type: "level", icon: "⭐",
        title: `Nível ${lvl.name} desbloqueado!`,
        message: `Você atingiu ${lvl.xp} XP e avançou para ${lvl.name}. Incrível!`,
        createdAt: now.toISOString(),
        read: readIds.has(id),
      });
    }
  }

  // --- Flashcards vencendo hoje ---
  let flashcardsDue = 0;
  for (const set of flashcardSets.data ?? []) {
    const cards = Array.isArray(set.cards) ? set.cards as { nextReview?: string }[] : [];
    for (const c of cards) {
      if (!c.nextReview || new Date(c.nextReview) <= now) flashcardsDue++;
    }
  }
  if (flashcardsDue > 0) {
    const id = "flashcards_due_today";
    notifs.push({
      id, type: "reminder", icon: "🃏",
      title: `${flashcardsDue} flashcard${flashcardsDue > 1 ? "s" : ""} para revisar`,
      message: "Você tem revisões pendentes hoje. Revise agora para não perder seu progresso de memorização!",
      createdAt: now.toISOString(),
      read: readIds.has(id),
    });
  }

  // --- Lembrete de descanso (sem estudo hoje) ---
  const lastStudy = prof?.lastStudyDate as string | null;
  if (lastStudy && lastStudy < todayStr) {
    const daysDiff = Math.floor((now.getTime() - new Date(lastStudy).getTime()) / 86400000);
    if (daysDiff >= 2) {
      const id = `study_reminder_${lastStudy}`;
      notifs.push({
        id, type: "reminder", icon: "📚",
        title: `${daysDiff} dias sem estudar`,
        message: `Sua última sessão foi há ${daysDiff} dias. Volte a estudar para manter seu ritmo!`,
        createdAt: now.toISOString(),
        read: readIds.has(id),
      });
    }
  }

  // --- Countdown para a prova ---
  if (prof?.dataProva) {
    const daysToProva = Math.ceil((new Date(prof.dataProva).getTime() - now.getTime()) / 86400000);
    if (daysToProva > 0 && daysToProva <= 30) {
      const id = `prova_countdown_${daysToProva <= 7 ? "week" : "month"}`;
      notifs.push({
        id, type: "prova", icon: "🎯",
        title: daysToProva <= 7 ? `Prova em ${daysToProva} dias!` : `${daysToProva} dias para sua prova`,
        message: daysToProva <= 7
          ? "Intensifique seus estudos! Foque nos pontos mais cobrados."
          : "Mantenha o ritmo e revise os conteúdos mais importantes.",
        createdAt: now.toISOString(),
        read: readIds.has(id),
      });
    }
  }

  // --- Conquista de questões ---
  const totalQ = totalProgress.count ?? 0;
  const Q_MILESTONES = [10, 50, 100, 250, 500, 1000];
  for (const m of Q_MILESTONES) {
    if (totalQ >= m) {
      const id = `questions_${m}`;
      notifs.push({
        id, type: "achievement", icon: "🏆",
        title: `${m} questões respondidas!`,
        message: `Você já respondeu ${m} questões. Continue praticando para dominar o edital!`,
        createdAt: now.toISOString(),
        read: readIds.has(id),
      });
    }
  }

  // --- Simulado concluído ---
  if (simuladoNote.data) {
    try {
      type SimuladoPayload = { correct: number; total: number; score: number; at: string };
      const payload = JSON.parse(simuladoNote.data.content ?? "{}") as SimuladoPayload;
      if (payload.total > 0) {
        // Só exibe se o simulado foi nas últimas 24h
        const simuladoAt = new Date(payload.at);
        const hoursDiff = (now.getTime() - simuladoAt.getTime()) / 3600000;
        if (hoursDiff <= 24) {
          const id = `simulado_${simuladoNote.data.id}`;
          notifs.push({
            id, type: "achievement", icon: "🏆",
            title: "Simulado concluído!",
            message: `Você acertou ${payload.correct}/${payload.total} questões (${payload.score}%). ${payload.score >= 70 ? "Ótimo resultado! 🎉" : "Continue praticando! 💪"}`,
            createdAt: payload.at,
            read: readIds.has(id),
          });
        }
      }
    } catch { /* skip malformed */ }
  }

  // --- Admin announcements ---
  for (const note of adminNotes.data ?? []) {
    try {
      const payload = JSON.parse(note.content ?? "{}") as { title?: string; message?: string };
      if (!payload.title) continue;
      const id = `admin_${note.id}`;
      notifs.push({
        id, type: "announcement", icon: "📢",
        title: payload.title,
        message: payload.message ?? "",
        createdAt: note.updatedAt as string,
        read: readIds.has(id),
      });
    } catch { /* skip malformed */ }
  }

  // Sort: unread first, then by most recent type priority
  const TYPE_ORDER: Record<string, number> = {
    prova: 0, announcement: 1, streak: 2, level: 3, achievement: 4, reminder: 5,
  };
  notifs.sort((a, b) => {
    if (a.read !== b.read) return a.read ? 1 : -1;
    return (TYPE_ORDER[a.type] ?? 9) - (TYPE_ORDER[b.type] ?? 9);
  });

  const unread = notifs.filter(n => !n.read).length;

  return NextResponse.json({
    notifs,
    unread,
    readNoteId: (readNote.data as { id?: string } | null)?.id,
  });
}

/**
 * PATCH /api/notificacoes
 * Marca notificações como lidas.
 * Body: { ids: string[] } ou { all: true }
 */
export async function PATCH(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const body = await req.json() as { ids?: string[]; all?: boolean };

  const { data: note } = await db.from("Note").select("id, content")
    .eq("userId", dbUser.id).eq("subjectId", READ_PREFIX).single();

  let current: string[] = [];
  try { current = note?.content ? JSON.parse(note.content) : []; } catch { /* ok */ }

  if (body.all) {
    // Busca IDs de notificações via URL absoluta (NEXT_PUBLIC_APP_URL deve estar configurada)
    // Fallback: tenta derivar do header Host da requisição para evitar falha em produção
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
      (req.headers.get("x-forwarded-proto") && req.headers.get("host")
        ? `${req.headers.get("x-forwarded-proto")}://${req.headers.get("host")}`
        : null);

    if (appUrl) {
      const res = await fetch(
        `${appUrl}/api/notificacoes`,
        { headers: { cookie: req.headers.get("cookie") ?? "" } }
      ).catch(() => null);
      if (res?.ok) {
        const d = await res.json() as { notifs?: { id: string }[] };
        const allIds = (d.notifs ?? []).map((n) => n.id);
        current = [...new Set([...current, ...allIds])];
      }
    }
  } else if (body.ids?.length) {
    current = [...new Set([...current, ...body.ids])];
  }

  await saveReadIds(dbUser.id, current, note?.id);
  return NextResponse.json({ ok: true });
}
