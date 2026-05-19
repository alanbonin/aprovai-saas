import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await db.from("User").select("role").eq("supabaseId", user.id).single();
  return data?.role === "ADMIN" ? user : null;
}

/**
 * Formato CSV esperado (cabeçalho obrigatório):
 *
 * subjectId,banca,year,level,statement,A,B,C,D,E,answer,explanation
 *
 * - subjectId: UUID da matéria (ou slug) — obrigatório
 * - banca: ex. "CESPE", "FCC", "FGV" — opcional
 * - year: ex. 2023 — opcional
 * - level: "easy" | "medium" | "hard" — opcional (default: medium)
 * - statement: enunciado da questão — obrigatório
 * - A..E: texto de cada alternativa — A e B obrigatórios, C..E opcionais
 * - answer: letra da correta ("A"..E") — obrigatório
 * - explanation: justificativa — opcional
 *
 * Separador: vírgula (,)  — campos com vírgula devem vir entre aspas duplas.
 * Encoding: UTF-8
 */

interface ParsedRow {
  subjectId: string;
  banca: string | null;
  year: number | null;
  level: string;
  statement: string;
  alternatives: string[];
  answer: string;
  explanation: string | null;
}

interface ImportStats {
  total: number;
  inserted: number;
  skipped: number;
  errors: { row: number; reason: string }[];
}

// Parseia uma linha de CSV respeitando aspas
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // aspas escapadas dentro de campo
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCsv(csv: string): { headers: string[]; rows: string[][] } {
  const lines = csv
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter(l => l.trim().length > 0);

  if (lines.length < 2) return { headers: [], rows: [] };

  const headers = parseCsvLine(lines[0]).map(h =>
    h.toLowerCase().replace(/[^a-z0-9]/g, "")
  );
  const rows = lines.slice(1).map(l => parseCsvLine(l));

  return { headers, rows };
}

function mapRow(headers: string[], cols: string[], rowIdx: number): ParsedRow | { error: string } {
  function col(name: string): string {
    const idx = headers.indexOf(name);
    return idx >= 0 ? (cols[idx] ?? "").replace(/^"|"$/g, "").trim() : "";
  }

  const subjectId = col("subjectid") || col("subject_id") || col("materia") || col("materiaId");
  if (!subjectId) return { error: `linha ${rowIdx}: subjectId ausente` };

  const statement = col("statement") || col("enunciado") || col("questao");
  if (!statement) return { error: `linha ${rowIdx}: enunciado ausente` };

  const altA = col("a");
  const altB = col("b");
  if (!altA || !altB) return { error: `linha ${rowIdx}: alternativas A e B obrigatórias` };

  const answer = (col("answer") || col("resposta") || col("gabarito")).toUpperCase();
  if (!["A", "B", "C", "D", "E"].includes(answer)) {
    return { error: `linha ${rowIdx}: answer inválido "${answer}" (esperado A-E)` };
  }

  const alternatives: string[] = [altA, altB];
  for (const letter of ["c", "d", "e"]) {
    const v = col(letter);
    if (v) alternatives.push(v);
  }

  const rawYear = col("year") || col("ano");
  const year = rawYear ? parseInt(rawYear, 10) : null;

  const rawLevel = col("level") || col("nivel") || col("dificuldade");
  const levelMap: Record<string, string> = {
    facil: "easy", easy: "easy", fácil: "easy",
    medio: "medium", medium: "medium", médio: "medium",
    dificil: "hard", hard: "hard", difícil: "hard",
  };
  const level = levelMap[rawLevel.toLowerCase()] ?? "medium";

  const banca = col("banca") || null;
  const explanation = col("explanation") || col("justificativa") || col("gabarito_comentado") || null;

  return { subjectId, banca: banca || null, year, level, statement, alternatives, answer, explanation };
}

// POST /api/admin/questoes/import
export async function POST(req: Request) {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  let csvText: string;
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "Arquivo não enviado" }, { status: 400 });
    csvText = await file.text();
  } else {
    const body = await req.json() as { csv?: string };
    csvText = body.csv ?? "";
  }

  if (!csvText.trim()) {
    return NextResponse.json({ error: "CSV vazio" }, { status: 400 });
  }

  const { headers, rows } = parseCsv(csvText);
  if (!headers.length) {
    return NextResponse.json({ error: "CSV inválido — verifique o cabeçalho" }, { status: 400 });
  }

  // Valida subjects existentes para dar erro claro
  const subjectIds = [...new Set(
    rows.map((r, i) => {
      const sid = headers.indexOf("subjectid") >= 0 ? r[headers.indexOf("subjectid")] :
                  headers.indexOf("subject_id") >= 0 ? r[headers.indexOf("subject_id")] : "";
      return sid?.trim() ?? "";
    }).filter(Boolean)
  )];

  const { data: existingSubjects } = await db
    .from("Subject").select("id").in("id", subjectIds);
  const validSubjectIds = new Set((existingSubjects ?? []).map(s => s.id));

  const stats: ImportStats = { total: rows.length, inserted: 0, skipped: 0, errors: [] };
  const batch: object[] = [];

  for (let i = 0; i < rows.length; i++) {
    const result = mapRow(headers, rows[i], i + 2); // +2 pq linha 1 é cabeçalho
    if ("error" in result) {
      stats.errors.push({ row: i + 2, reason: result.error });
      stats.skipped++;
      continue;
    }

    if (!validSubjectIds.has(result.subjectId)) {
      stats.errors.push({ row: i + 2, reason: `subjectId "${result.subjectId}" não encontrado` });
      stats.skipped++;
      continue;
    }

    batch.push({
      subjectId: result.subjectId,
      banca: result.banca,
      year: result.year,
      level: result.level,
      statement: result.statement,
      optionA: result.alternatives[0] ?? null,
      optionB: result.alternatives[1] ?? null,
      optionC: result.alternatives[2] ?? null,
      optionD: result.alternatives[3] ?? null,
      optionE: result.alternatives[4] ?? null,
      answer: result.answer,
      explanation: result.explanation,
      aprovado: false,
    });
  }

  // Insere em lotes de 100
  const BATCH_SIZE = 100;
  for (let i = 0; i < batch.length; i += BATCH_SIZE) {
    const chunk = batch.slice(i, i + BATCH_SIZE);
    const { error } = await db.from("Question").insert(chunk);
    if (error) {
      stats.errors.push({ row: -1, reason: `Erro ao inserir lote ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}` });
      stats.skipped += chunk.length;
    } else {
      stats.inserted += chunk.length;
    }
  }

  return NextResponse.json(stats);
}
