import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import Anthropic from "@anthropic-ai/sdk";
import { extractJSON } from "@/lib/anthropic";
import { getMateriasParaCargo } from "@/lib/materias-por-cargo";
import { resolveCargoId } from "@/lib/cargos";
import { log } from "@/lib/logger";

/**
 * GET /api/cron/renovar-planos
 * Roda toda segunda-feira para renovar os planos semanais de todos os alunos
 * que ainda não têm plano para a semana atual.
 * Protegido por CRON_SECRET.
 */

function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return monday.toISOString().split("T")[0];
}

async function buildAnalysisSummary(userId: string, profileId: string) {
  // Questões dos últimos 14 dias
  const twoWeeksAgo = new Date(Date.now() - 14 * 86400000).toISOString();
  const { data: progress } = await db
    .from("QuestionProgress")
    .select("correct, quality, Question(subjectId, Subject(name))")
    .eq("userId", userId)
    .eq("profileId", profileId)
    .gte("createdAt", twoWeeksAgo)
    .limit(200);

  if (!progress?.length) return null;

  const bySubject: Record<string, { total: number; wrong: number }> = {};
  for (const p of progress) {
    const subName = (p.Question as { Subject?: { name?: string } } | null)?.Subject?.name ?? "Desconhecida";
    if (!bySubject[subName]) bySubject[subName] = { total: 0, wrong: 0 };
    bySubject[subName].total++;
    if (!p.correct) bySubject[subName].wrong++;
  }

  const lines = Object.entries(bySubject)
    .sort((a, b) => b[1].wrong / (b[1].total || 1) - a[1].wrong / (a[1].total || 1))
    .map(([name, { total, wrong }]) =>
      `- ${name}: ${total} questões, ${wrong} erros (${Math.round(wrong / total * 100)}% erro)`
    );

  return `Desempenho últimas 2 semanas:\n${lines.join("\n")}`;
}

function checkAuth(req: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return process.env.NODE_ENV !== "production";
  return req.headers.get("authorization") === `Bearer ${cronSecret}`;
}

export async function GET(req: Request) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const weekStart = getWeekStart();
  let renovados = 0;
  let pulados = 0;
  let erros = 0;

  // Busca todos os alunos com assinatura ativa
  const { data: users } = await db
    .from("User")
    .select("id")
    .eq("role", "STUDENT");

  if (!users?.length) return NextResponse.json({ ok: true, renovados: 0 });

  for (const user of users) {
    try {
      // Busca perfis do usuário
      const { data: profiles } = await db
        .from("StudentProfile")
        .select("id, cargo, banca, dataProva, onboardingDone")
        .eq("userId", user.id)
        .eq("onboardingDone", true);

      if (!profiles?.length) continue;

      for (const profile of profiles) {
        // Verifica se já tem plano desta semana
        const { data: existingNotes } = await db
          .from("Note")
          .select("id, content")
          .eq("userId", user.id)
          .eq("profileId", profile.id)
          .is("subjectId", null)
          .limit(5);

        const hasCurrentWeekPlan = existingNotes?.some(n => {
          try {
            const parsed = JSON.parse(n.content as string);
            return parsed.__key === "plano_semanal" && parsed.weekStart === weekStart;
          } catch { return false; }
        });

        if (hasCurrentWeekPlan) { pulados++; continue; }

        // Gera novo plano
        const cargoId = resolveCargoId(profile.cargo ?? "", "");
        const materias = cargoId?.cargoId ? await getMateriasParaCargo(cargoId.cargoId) : [];
        const materiasStr = materias.slice(0, 15).join(", ");
        const analysisSummary = await buildAnalysisSummary(user.id, profile.id);

        const prompt = `Você é um mentor de concursos públicos. Gere um plano de estudos semanal personalizado.

Cargo: ${profile.cargo ?? "Não informado"}
Banca: ${profile.banca ?? "Não informada"}
Data da prova: ${profile.dataProva ?? "Não informada"}
Matérias do edital: ${materiasStr || "Gerais"}
${analysisSummary ? `\n${analysisSummary}` : ""}

Gere um JSON com o plano da semana (segunda a domingo), priorizando as matérias com mais erros recentes.

Retorne APENAS JSON:
{
  "semana": [
    {
      "dia": "Segunda",
      "materias": [{"nome": "Direito Constitucional", "horas": 2, "prioridade": "alta", "dica": "Foque nos direitos fundamentais"}],
      "totalHoras": 2,
      "folga": false
    }
  ],
  "resumo": "Resumo do plano em 1-2 frases",
  "metaSemanal": "Meta objetiva da semana",
  "horasTotais": 14,
  "geradoEm": "${new Date().toISOString()}"
}`;

        const ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
        const response = await ai.messages.create({
          model: "claude-sonnet-4-5",
          max_tokens: 2000,
          messages: [{ role: "user", content: prompt }],
        });

        const text = response.content[0]?.type === "text" ? response.content[0].text : "";
        const cronograma = extractJSON(text) as { semana?: unknown } | null;
        if (!cronograma?.semana) { erros++; continue; }

        // Salva a nota
        const noteContent = JSON.stringify({
          __key: "plano_semanal",
          weekStart,
          cronograma: { ...cronograma, geradoEm: new Date().toISOString() },
          ajustes: [],
        });

        // Remove plano antigo se existir
        const oldNote = existingNotes?.find(n => {
          try { return JSON.parse(n.content as string).__key === "plano_semanal"; }
          catch { return false; }
        });

        if (oldNote) {
          await db.from("Note").update({ content: noteContent, updatedAt: new Date().toISOString() }).eq("id", oldNote.id);
        } else {
          await db.from("Note").insert({
            userId: user.id,
            profileId: profile.id,
            subjectId: null,
            content: noteContent,
          });
        }

        renovados++;
        log.info("cron.planos.renovado", { userId: user.id, profileId: profile.id });
      }
    } catch (e) {
      erros++;
      log.error("cron.planos.erro", { userId: user.id }, e);
    }
  }

  return NextResponse.json({ ok: true, renovados, pulados, erros, weekStart });
}
