/**
 * student-context.ts
 *
 * Monta o "dossiê do aluno" — bloco de contexto completo injetado no system
 * prompt de TODA conversa com a IA, para que ela nunca precise perguntar
 * informações básicas e possa personalizar cada resposta automaticamente.
 */

import { db } from "@/lib/db";

const MEMORY_PREFIX = "__MENTOR_MEMORY__";

interface ProgressRow {
  correct: boolean;
  Question: { subjectId: string } | { subjectId: string }[] | null;
}

interface SubjectRow {
  Subject: { id: string; name: string } | { id: string; name: string }[] | null;
}

interface SimuladoRow {
  total: number;
  correct: number;
  createdAt: string;
}

interface ProfileRow {
  nomePreferido: string | null;
  cargo: string | null;
  orgao: string | null;
  dataProva: string | null;
  dificuldades: string | null;
  horasEstudo: number | null;
  nivelAtual: string | null;
  disponibilidade: string | null;
  onboardingDone: boolean;
  updatedAt: string | null;
}

// ── Formata data brasileira ───────────────────────────────────────────────────
function fmtDate(iso: string | null): string {
  if (!iso) return "não informada";
  try {
    return new Date(iso).toLocaleDateString("pt-BR");
  } catch {
    return iso;
  }
}

// ── Dias até a prova ──────────────────────────────────────────────────────────
function diasAteProva(dataProva: string | null): string {
  if (!dataProva) return "";
  const diff = Math.ceil((new Date(dataProva).getTime() - Date.now()) / 86_400_000);
  if (diff < 0) return " (já passou)";
  if (diff === 0) return " (HOJE!)";
  if (diff <= 7) return ` (⚠️ URGENTE — faltam ${diff} dias!)`;
  if (diff <= 30) return ` (faltam ${diff} dias — fase final!)`;
  return ` (faltam ${diff} dias)`;
}

// ── Função principal ─────────────────────────────────────────────────────────
export async function buildStudentContext(userId: string, agentId?: string): Promise<string> {
  const hoje = new Date().toLocaleDateString("pt-BR");

  // 1. Perfil
  const { data: profile } = await db
    .from("StudentProfile")
    .select("nomePreferido, cargo, orgao, dataProva, dificuldades, horasEstudo, nivelAtual, disponibilidade, onboardingDone, updatedAt")
    .eq("userId", userId)
    .maybeSingle() as { data: ProfileRow | null };

  // 2. Matérias do aluno
  const { data: studentSubjects } = await db
    .from("StudentSubject")
    .select("Subject(id, name)")
    .eq("userId", userId)
    .limit(20) as { data: SubjectRow[] | null };

  const subjectNames = (studentSubjects ?? [])
    .map(ss => {
      const s = ss.Subject;
      if (!s) return null;
      return Array.isArray(s) ? s[0]?.name : (s as { name: string }).name;
    })
    .filter(Boolean) as string[];

  // 3. Desempenho por matéria (Progress)
  const { data: progressRows } = await db
    .from("Progress")
    .select("correct, Question(subjectId)")
    .eq("userId", userId)
    .limit(500) as { data: ProgressRow[] | null };

  // Agrupa por matéria
  const bySubject: Record<string, { correct: number; total: number }> = {};
  for (const row of progressRows ?? []) {
    const q = row.Question;
    const subId = q ? (Array.isArray(q) ? q[0]?.subjectId : (q as { subjectId: string }).subjectId) : null;
    if (!subId) continue;
    if (!bySubject[subId]) bySubject[subId] = { correct: 0, total: 0 };
    bySubject[subId].total++;
    if (row.correct) bySubject[subId].correct++;
  }

  const totalQuestoes = Object.values(bySubject).reduce((s, v) => s + v.total, 0);
  const totalAcertos  = Object.values(bySubject).reduce((s, v) => s + v.correct, 0);
  const taxaGeral = totalQuestoes > 0 ? Math.round((totalAcertos / totalQuestoes) * 100) : null;

  // Matérias com pior desempenho (min 5 questões)
  const subjectPerfList = Object.entries(bySubject)
    .filter(([, v]) => v.total >= 5)
    .map(([id, v]) => ({ id, pct: Math.round((v.correct / v.total) * 100), total: v.total }))
    .sort((a, b) => a.pct - b.pct);

  // Resolve nomes das matérias fracas via banco
  const weakIds = subjectPerfList.slice(0, 3).map(s => s.id);
  let weakNames: string[] = [];
  if (weakIds.length > 0) {
    const { data: weakSubjects } = await db
      .from("Subject")
      .select("id, name")
      .in("id", weakIds);
    const nameMap = Object.fromEntries((weakSubjects ?? []).map((s: { id: string; name: string }) => [s.id, s.name]));
    weakNames = subjectPerfList.slice(0, 3).map(s => {
      const name = nameMap[s.id] ?? s.id;
      return `${name} (${s.pct}% de acerto)`;
    });
  }

  // Matérias com melhor desempenho
  const strongNames: string[] = [];
  if (subjectPerfList.length > 3) {
    const strongIds = subjectPerfList.slice(-2).map(s => s.id);
    const { data: strongSubjects } = await db
      .from("Subject")
      .select("id, name")
      .in("id", strongIds);
    const nameMap = Object.fromEntries((strongSubjects ?? []).map((s: { id: string; name: string }) => [s.id, s.name]));
    subjectPerfList.slice(-2).forEach(s => {
      const name = nameMap[s.id] ?? s.id;
      strongNames.push(`${name} (${s.pct}% de acerto)`);
    });
  }

  // 4. Histórico de simulados (últimos 5)
  const { data: simulados } = await db
    .from("SimuladoHistory")
    .select("total, correct, createdAt")
    .eq("userId", userId)
    .order("createdAt", { ascending: false })
    .limit(5) as { data: SimuladoRow[] | null };

  const simuladoResumo = (simulados ?? []).map(s => {
    const pct = Math.round((s.correct / s.total) * 100);
    return `${pct}% (${s.correct}/${s.total}) em ${fmtDate(s.createdAt)}`;
  });

  // 5. Memória de sessões anteriores com este mentor específico
  let memory: string | null = null;
  if (agentId) {
    const { data: note } = await db
      .from("Note")
      .select("content")
      .eq("userId", userId)
      .like("content", `${MEMORY_PREFIX}:${agentId}:%`)
      .order("updatedAt", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (note) {
      memory = note.content.replace(`${MEMORY_PREFIX}:${agentId}:`, "").trim();
    }
  }

  // ── Monta o bloco de contexto ─────────────────────────────────────────────
  const lines: string[] = [];

  lines.push("## CONTEXTO COMPLETO DO ALUNO");
  lines.push(`Data de hoje: ${hoje}`);
  lines.push("");

  // Perfil
  lines.push("### Perfil");
  if (profile?.nomePreferido) {
    lines.push(`- Nome preferido: **${profile.nomePreferido}** ← USE SEMPRE este nome ao se dirigir ao aluno`);
  }
  lines.push(`- Cargo alvo: ${profile?.cargo ?? "não informado"}`);
  lines.push(`- Órgão: ${profile?.orgao ?? "não informado"}`);
  if (profile?.dataProva) {
    lines.push(`- Data da prova: ${fmtDate(profile.dataProva)}${diasAteProva(profile.dataProva)}`);
  }
  if (profile?.horasEstudo) {
    lines.push(`- Horas de estudo por dia: ${profile.horasEstudo}h`);
  }
  if (profile?.nivelAtual) {
    const nivelLabel: Record<string, string> = {
      iniciante: "Iniciante (nunca estudou para concurso)",
      intermediario: "Intermediário (já estudou um pouco)",
      avancado: "Avançado (estuda há mais de 6 meses)",
    };
    lines.push(`- Nível atual: ${nivelLabel[profile.nivelAtual] ?? profile.nivelAtual}`);
  }
  if (profile?.disponibilidade) {
    const dispLabel: Record<string, string> = {
      manha: "Manhã",
      tarde: "Tarde",
      noite: "Noite",
      variado: "Varia (sem horário fixo)",
    };
    lines.push(`- Horário preferido de estudo: ${dispLabel[profile.disponibilidade] ?? profile.disponibilidade}`);
  }
  if (profile?.dificuldades) {
    lines.push(`- Dificuldades relatadas: ${profile.dificuldades}`);
  }

  // Matérias
  if (subjectNames.length > 0) {
    lines.push("");
    lines.push("### Matérias em estudo");
    lines.push(subjectNames.join(", "));
  }

  // Desempenho
  if (totalQuestoes > 0) {
    lines.push("");
    lines.push("### Desempenho geral");
    lines.push(`- Questões respondidas: ${totalQuestoes}`);
    if (taxaGeral !== null) lines.push(`- Taxa de acerto geral: ${taxaGeral}%`);
    if (weakNames.length > 0) {
      lines.push(`- Matérias mais fracas (prioridade de estudo): ${weakNames.join(" | ")}`);
    }
    if (strongNames.length > 0) {
      lines.push(`- Matérias mais fortes: ${strongNames.join(" | ")}`);
    }
  }

  // Simulados
  if (simuladoResumo.length > 0) {
    lines.push("");
    lines.push("### Simulados recentes");
    simuladoResumo.forEach(s => lines.push(`- ${s}`));
  }

  // Memória de sessões anteriores
  if (memory) {
    lines.push("");
    lines.push("### Memória de conversas anteriores com você");
    lines.push(memory);
  }

  lines.push("");
  lines.push("### INSTRUÇÃO CRÍTICA");
  if (profile?.nomePreferido) {
    lines.push(`NOME DO ALUNO: "${profile.nomePreferido}" — chame-o SEMPRE por este nome. Nunca use "você" genérico quando puder usar o nome.`);
  }
  lines.push("Você JÁ CONHECE o aluno. NUNCA pergunte cargo, órgão, nível ou horário — essas informações estão acima.");
  if (profile?.cargo) {
    const bancaInfo = profile?.orgao ? ` no ${profile.orgao}` : "";
    lines.push(`EDITAL: Use seu conhecimento de editais históricos para ${profile.cargo}${bancaInfo}. Se o aluno mencionar que saiu edital novo, peça para colar o conteúdo programático para análise precisa e atualização do plano.`);
  }
  lines.push("Use os dados de desempenho para personalizar cada resposta sem precisar perguntar.");
  if (profile?.horasEstudo) {
    lines.push(`O aluno tem ${profile.horasEstudo}h/dia disponíveis — calibre recomendações de estudo dentro desse limite.`);
  }
  if (profile?.nivelAtual) {
    lines.push(`Nível ${profile.nivelAtual} — ajuste a profundidade das explicações e o volume de conteúdo accordingly.`);
  }
  if (profile?.disponibilidade && profile.disponibilidade !== "variado") {
    lines.push(`Prefere estudar no período da ${profile.disponibilidade === "manha" ? "manhã" : profile.disponibilidade === "tarde" ? "tarde" : "noite"} — mencione isso ao sugerir rotinas.`);
  }
  if (weakNames.length > 0) {
    lines.push(`Priorize reforço nas matérias fracas. Seja proativo — sugira focar em ${weakNames[0].split(" (")[0]} quando relevante.`);
  }
  lines.push("Comporte-se como um coach que acompanha este aluno há meses — direto, personalizado, estratégico.");

  return lines.join("\n");
}
