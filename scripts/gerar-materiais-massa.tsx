#!/usr/bin/env tsx
/**
 * gerar-materiais-massa.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Gera PDFs de apostila para cada tópico de cada matéria — mesmo layout do admin.
 *
 * Uso:
 *   npx tsx --env-file=.env scripts/gerar-materiais-massa.tsx
 *   npx tsx --env-file=.env scripts/gerar-materiais-massa.tsx --subject "Língua Portuguesa"
 *   npx tsx --env-file=.env scripts/gerar-materiais-massa.tsx --dry
 *   npx tsx --env-file=.env scripts/gerar-materiais-massa.tsx --reset
 *   npx tsx --env-file=.env scripts/gerar-materiais-massa.tsx --only-first  (1 tópico por matéria)
 */

import React from "react";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { renderToBuffer, Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { readFileSync, writeFileSync, existsSync, unlinkSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

// ── Carrega .env manualmente (tsx não repassa --env-file corretamente) ────────
function loadEnv() {
  const envPath = join(dirname(fileURLToPath(import.meta.url)), "../.env");
  if (!existsSync(envPath)) return;
  const lines = readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    const key = t.slice(0, eq).trim();
    const val = t.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
}
loadEnv();

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROGRESS_FILE = join(__dirname, ".gerar-materiais-progress.json");

// ── Args ─────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const DRY        = args.includes("--dry");
const RESET      = args.includes("--reset");
const ONLY_FIRST = args.includes("--only-first");
const FILTER     = (() => { const i = args.indexOf("--subject"); return i >= 0 ? args[i+1] : null; })();

// ── Clientes ──────────────────────────────────────────────────────────────────
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ── Tipos ──────────────────────────────────────────────────────────────────────
interface SecaoTeoria     { tipo: "teoria";        titulo: string; texto: string; }
interface SecaoLista      { tipo: "lista";          titulo: string; itens: string[]; }
interface SecaoTabela     { tipo: "tabela";         titulo: string; colunas: string[]; linhas: string[][]; }
interface SecaoAtencao    { tipo: "atencao";        texto: string; }
interface SecaoExempl     { tipo: "exemplificando"; titulo?: string; texto: string; }
interface SecaoCodigo     { tipo: "codigo";         titulo?: string; codigo: string; }
interface SecaoDestaque   { tipo: "destaque";       titulo: string; texto: string; }
type Secao = SecaoTeoria | SecaoLista | SecaoTabela | SecaoAtencao | SecaoExempl | SecaoCodigo | SecaoDestaque;

interface AulaContent {
  titulo: string; subtitulo: string; cargo: string;
  materia: string; banca: string; numero_aula: string;
  introducao: string; secoes: Secao[];
}

// ── Cores ─────────────────────────────────────────────────────────────────────
const C = {
  dark: "#1e1b4b", purple: "#6d28d9", purpleLight: "#ede9fe",
  amber: "#d97706", amberLight: "#fef3c7", teal: "#0d9488", tealLight: "#ccfbf1",
  codeBg: "#1e293b", codeText: "#e2e8f0", gray: "#374151", grayLight: "#f3f4f6",
  white: "#ffffff", border: "#e5e7eb", muted: "#9ca3af",
};

const s = StyleSheet.create({
  cover: { backgroundColor: C.dark, flex: 1, padding: 50 },
  coverTopRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 60 },
  coverLogo: { fontSize: 22, fontWeight: "bold", color: C.white },
  coverLogoSub: { fontSize: 9, color: "#a78bfa", marginTop: 3 },
  coverNumLabel: { fontSize: 11, color: "#a78bfa", textAlign: "right" },
  coverNum: { fontSize: 52, fontWeight: "bold", color: C.white, textAlign: "right", lineHeight: 1.1 },
  coverTitle: { fontSize: 24, fontWeight: "bold", color: C.white, marginTop: 60, lineHeight: 1.3 },
  coverSubtitle: { fontSize: 13, color: "#c4b5fd", marginTop: 12, lineHeight: 1.4 },
  coverDivider: { height: 2, backgroundColor: C.purple, marginTop: 30, marginBottom: 20, width: 80 },
  coverMeta: { marginTop: "auto" as unknown as number },
  coverMetaItem: { fontSize: 10, color: "#a78bfa", marginBottom: 4 },
  coverMetaValue: { fontSize: 12, color: C.white, fontWeight: "bold", marginBottom: 10 },
  coverDate: { fontSize: 9, color: "#6d4ed8", marginTop: 20 },
  page: { backgroundColor: C.white, paddingBottom: 65 },
  pageHeader: { backgroundColor: C.dark, paddingHorizontal: 40, paddingVertical: 9, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  pageHeaderLeft: { fontSize: 8, color: "#a78bfa", fontWeight: "bold" },
  pageHeaderRight: { fontSize: 8, color: "#6d4ed8" },
  body: { paddingHorizontal: 40, paddingTop: 18 },
  introBox: { backgroundColor: C.purpleLight, borderLeftWidth: 4, borderLeftColor: C.purple, padding: 14, marginBottom: 18, borderRadius: 3 },
  introText: { fontSize: 10, color: C.dark, lineHeight: 1.65, fontStyle: "italic" },
  sectionTitle: { fontSize: 13, fontWeight: "bold", color: C.dark, marginBottom: 8, marginTop: 20, paddingBottom: 5, borderBottomWidth: 2, borderBottomColor: C.purple },
  paragraph: { fontSize: 10, color: C.gray, lineHeight: 1.68, marginBottom: 8 },
  listItem: { flexDirection: "row", marginBottom: 5, paddingLeft: 4 },
  listBullet: { fontSize: 10, color: C.purple, marginRight: 8, fontWeight: "bold" },
  listText: { fontSize: 10, color: C.gray, lineHeight: 1.5, flex: 1 },
  table: { marginBottom: 12, borderWidth: 1, borderColor: C.border, overflow: "hidden" },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: C.border },
  tableHead: { backgroundColor: C.dark },
  tableHeadCell: { fontSize: 9, fontWeight: "bold", color: C.white, padding: 8, flex: 1 },
  tableCell: { fontSize: 9, color: C.gray, padding: 8, flex: 1, lineHeight: 1.4 },
  tableAlt: { backgroundColor: C.grayLight },
  atencaoWrap: { marginVertical: 10, borderWidth: 1, borderColor: C.amber, overflow: "hidden", borderRadius: 4 },
  atencaoHeader: { backgroundColor: C.amber, paddingHorizontal: 12, paddingVertical: 5 },
  atencaoHeaderTxt: { fontSize: 9, fontWeight: "bold", color: C.white },
  atencaoBody: { backgroundColor: C.amberLight, padding: 12 },
  atencaoText: { fontSize: 10, color: "#78350f", lineHeight: 1.55 },
  exemplWrap: { marginVertical: 10, borderWidth: 1, borderColor: C.teal, overflow: "hidden", borderRadius: 4 },
  exemplHeader: { backgroundColor: C.teal, paddingHorizontal: 12, paddingVertical: 5 },
  exemplHeaderTxt: { fontSize: 9, fontWeight: "bold", color: C.white },
  exemplTitle: { fontSize: 10, fontWeight: "bold", color: C.teal, paddingHorizontal: 12, paddingTop: 10 },
  exemplBody: { backgroundColor: C.tealLight, padding: 12, paddingTop: 6 },
  exemplText: { fontSize: 10, color: "#134e4a", lineHeight: 1.55 },
  codeWrap: { backgroundColor: C.codeBg, borderRadius: 4, marginVertical: 10, padding: 14 },
  codeTitle: { fontSize: 8, color: "#94a3b8", marginBottom: 8, fontWeight: "bold" },
  codeText: { fontSize: 9, color: C.codeText, fontFamily: "Courier", lineHeight: 1.65 },
  destacWrap: { backgroundColor: C.purpleLight, borderLeftWidth: 4, borderLeftColor: C.purple, padding: 12, marginVertical: 10, borderRadius: 3 },
  destacTitle: { fontSize: 10, fontWeight: "bold", color: C.purple, marginBottom: 5 },
  destacText: { fontSize: 10, color: C.gray, lineHeight: 1.55 },
  footer: { position: "absolute", bottom: 20, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: C.border, paddingTop: 8 },
  footerLeft: { fontSize: 8, color: C.muted },
  footerRight: { fontSize: 8, color: C.muted },
});

// ── Componente Seção ──────────────────────────────────────────────────────────
function RenderSecao({ secao, idx }: { secao: Secao; idx: number }) {
  switch (secao.tipo) {
    case "teoria":
      return (
        <View key={idx}>
          <Text style={s.sectionTitle}>{secao.titulo}</Text>
          <Text style={s.paragraph}>{secao.texto}</Text>
        </View>
      );
    case "lista":
      return (
        <View key={idx}>
          <Text style={s.sectionTitle}>{secao.titulo}</Text>
          {secao.itens.map((item, i) => (
            <View key={i} style={s.listItem}>
              <Text style={s.listBullet}>{">"}</Text>
              <Text style={s.listText}>{item}</Text>
            </View>
          ))}
        </View>
      );
    case "tabela":
      return (
        <View key={idx}>
          <Text style={s.sectionTitle}>{secao.titulo}</Text>
          <View style={s.table}>
            <View style={[s.tableRow, s.tableHead]}>
              {secao.colunas.map((col, c) => <Text key={c} style={s.tableHeadCell}>{col}</Text>)}
            </View>
            {secao.linhas.map((linha, r) => (
              <View key={r} style={[s.tableRow, r % 2 === 1 ? s.tableAlt : {}]}>
                {linha.map((cel, c) => <Text key={c} style={s.tableCell}>{cel}</Text>)}
              </View>
            ))}
          </View>
        </View>
      );
    case "atencao":
      return (
        <View key={idx} style={s.atencaoWrap}>
          <View style={s.atencaoHeader}><Text style={s.atencaoHeaderTxt}>! FIQUE ATENTO !</Text></View>
          <View style={s.atencaoBody}><Text style={s.atencaoText}>{secao.texto}</Text></View>
        </View>
      );
    case "exemplificando":
      return (
        <View key={idx} style={s.exemplWrap}>
          <View style={s.exemplHeader}><Text style={s.exemplHeaderTxt}>EXEMPLIFICANDO</Text></View>
          <View style={s.exemplBody}>
            {secao.titulo ? <Text style={s.exemplTitle}>{secao.titulo}</Text> : null}
            <Text style={s.exemplText}>{secao.texto}</Text>
          </View>
        </View>
      );
    case "codigo":
      return (
        <View key={idx} style={s.codeWrap}>
          {secao.titulo ? <Text style={s.codeTitle}>{secao.titulo}</Text> : null}
          <Text style={s.codeText}>{secao.codigo}</Text>
        </View>
      );
    case "destaque":
      return (
        <View key={idx} style={s.destacWrap}>
          <Text style={s.destacTitle}>{secao.titulo}</Text>
          <Text style={s.destacText}>{secao.texto}</Text>
        </View>
      );
    default: return null;
  }
}

// ── Componente PDF ─────────────────────────────────────────────────────────────
function AulaPDF({ content }: { content: AulaContent }) {
  const hoje = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  const aulaLabel = `Aula ${content.numero_aula.padStart(2, "0")}`;

  return (
    <Document title={content.titulo} author="Aprovai360" subject={content.materia}>
      <Page size="A4" style={s.cover}>
        <View style={s.coverTopRow}>
          <View>
            <Text style={s.coverLogo}>Aprovai360</Text>
            <Text style={s.coverLogoSub}>Plataforma de Preparacao para Concursos</Text>
          </View>
          <View>
            <Text style={s.coverNumLabel}>{aulaLabel}</Text>
            <Text style={s.coverNum}>{content.numero_aula.padStart(2, "0")}</Text>
          </View>
        </View>
        <Text style={s.coverTitle}>{content.titulo}</Text>
        <Text style={s.coverSubtitle}>{content.subtitulo}</Text>
        <View style={s.coverDivider} />
        <View style={s.coverMeta}>
          <Text style={s.coverMetaItem}>Materia</Text>
          <Text style={s.coverMetaValue}>{content.materia}</Text>
          <Text style={s.coverDate}>{hoje}</Text>
        </View>
      </Page>

      <Page size="A4" style={s.page}>
        <View style={s.pageHeader} fixed>
          <Text style={s.pageHeaderLeft}>Aprovai360  |  {content.materia}  |  {aulaLabel}</Text>
          <Text style={s.pageHeaderRight}>Concursos Publicos</Text>
        </View>
        <View style={s.body}>
          {content.introducao ? (
            <View style={s.introBox}>
              <Text style={s.introText}>{content.introducao}</Text>
            </View>
          ) : null}
          {content.secoes.map((secao, idx) => <RenderSecao key={idx} secao={secao} idx={idx} />)}
        </View>
        <View style={s.footer} fixed>
          <Text style={s.footerLeft}>Aprovai360 — {hoje}</Text>
          <Text style={s.footerRight} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

// ── Progresso ──────────────────────────────────────────────────────────────────
function loadProgress() {
  if (!existsSync(PROGRESS_FILE)) return { done: {} as Record<string, boolean>, stats: { gerados: 0, erros: 0 } };
  try { return JSON.parse(readFileSync(PROGRESS_FILE, "utf-8")); }
  catch { return { done: {} as Record<string, boolean>, stats: { gerados: 0, erros: 0 } }; }
}
function saveProgress(p: ReturnType<typeof loadProgress>) { writeFileSync(PROGRESS_FILE, JSON.stringify(p, null, 2)); }

// ── Extrai JSON ───────────────────────────────────────────────────────────────
function extractJSON(text: string): AulaContent | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (match) { try { return JSON.parse(match[0]); } catch {} }
  try { return JSON.parse(text); } catch {}
  return null;
}

// ── Gera conteúdo com Claude ──────────────────────────────────────────────────
async function gerarConteudo(subjectName: string, topicName: string, categoria: string, aulaNum: number): Promise<AulaContent | null> {
  const isTI = ["ti", "tecnologia-informacao"].includes(categoria);

  const tipoInstrucao = isTI
    ? `Gere aula COMPLETA com 12-14 seções: 4 "teoria" (200 palavras cada), 2 "lista" (10 itens), 2 "tabela" (4col x 6lin), 2 "atencao", 1 "codigo" (max 15 linhas), 2 "exemplificando", 1 "destaque"`
    : `Gere aula COMPLETA com 12-14 seções: 4-5 "teoria" numeradas (200 palavras cada), 2 "lista" (10 itens), 2 "tabela" (4col x 6lin), 2 "atencao", 2 "exemplificando", 1 "destaque" final`;

  const prompt = `Você é um professor especialista em ${subjectName} para concursos públicos brasileiros.
Gere a Aula ${aulaNum} sobre: ${topicName}

${tipoInstrucao}

TIPOS:
- {"tipo":"teoria","titulo":"1. Titulo","texto":"..."} — 180-250 palavras, cite artigos de lei
- {"tipo":"lista","titulo":"...","itens":["..."]} — 8-10 itens, até 25 palavras cada
- {"tipo":"tabela","titulo":"...","colunas":["A","B","C","D"],"linhas":[["v1","v2","v3","v4"]]} — 5-7 linhas
- {"tipo":"atencao","texto":"..."} — 60-90 palavras, pegadinha específica
- {"tipo":"exemplificando","titulo":"...","texto":"..."} — 100-140 palavras, caso real
- {"tipo":"codigo","titulo":"...","codigo":"..."} — apenas TI, max 15 linhas
- {"tipo":"destaque","titulo":"...","texto":"..."} — 60-100 palavras

REGRAS: Nunca duas "teoria" seguidas. Último elemento = "destaque". Cite artigos de lei, prazos, valores.
introducao: 2-3 frases conectando ao concurso (50-70 palavras).

Retorne APENAS JSON válido sem markdown:
{"titulo":"...","subtitulo":"...","cargo":"Concursos Públicos","materia":"${subjectName}","banca":"","numero_aula":"${aulaNum}","introducao":"...","secoes":[]}`;

  const msg = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 8000,
    system: "Você é professor especialista em concursos públicos. Retorne apenas JSON válido, sem markdown.",
    messages: [{ role: "user", content: prompt }],
  });

  const raw = ((msg.content[0] as { type: string; text: string }).text ?? "").trim();
  return extractJSON(raw);
}

// ── Gera e faz upload do PDF → Biblioteca (PdfDocument + bucket pdfs) ────────
async function gerarEUploadarPDF(
  subjectId: string,
  subjectName: string,
  topicId: string,
  topicName: string,
  content: AulaContent,
  aulaNum: number
) {
  // Renderiza PDF
  const pdfBuffer = await renderToBuffer(<AulaPDF content={content} />);

  // Upload para bucket "pdfs" (Biblioteca)
  const BUCKET = "pdfs";
  const storagePath = `${subjectId}/${topicId}-aula${String(aulaNum).padStart(2,"0")}-${Date.now()}.pdf`;

  const { error: uploadErr } = await db.storage
    .from(BUCKET)
    .upload(storagePath, pdfBuffer, { contentType: "application/pdf", upsert: false });

  if (uploadErr) throw new Error(`Upload: ${uploadErr.message}`);

  // Salva em PdfDocument (Biblioteca)
  const title = `${content.titulo} — ${content.subtitulo}`.slice(0, 120);
  const description = `${subjectName} | Tópico: ${topicName}`;

  const { error: dbErr } = await db.from("PdfDocument").insert({
    id: crypto.randomUUID(),
    title,
    description,
    subjectId,
    topicId: topicId || null,
    storagePath,
    fileSize: pdfBuffer.length,
    pageCount: null,     // react-pdf não expõe contagem de páginas no buffer
    planLevel: "trial",  // disponível para todos
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  if (dbErr) throw new Error(`DB: ${dbErr.message}`);

  return { title, size: pdfBuffer.length };
}

// ── Processa uma matéria ──────────────────────────────────────────────────────
async function processarMateria(
  subject: { id: string; name: string; categoria: string },
  topicos: { id: string; name: string; ordem: number }[],
  progress: ReturnType<typeof loadProgress>
) {
  const lista = ONLY_FIRST ? topicos.slice(0, 1) : topicos;
  console.log(`\n📚 ${subject.name} — ${lista.length} tópicos`);

  for (const [i, topico] of lista.entries()) {
    const key = `${subject.id}:${topico.id}`;
    if (progress.done[key]) {
      console.log(`   ⏭️  [${i+1}/${lista.length}] ${topico.name}`);
      continue;
    }

    process.stdout.write(`   📝 [${i+1}/${lista.length}] ${topico.name.slice(0, 40)}... `);

    if (DRY) { console.log(`[DRY]`); continue; }

    try {
      const content = await gerarConteudo(subject.name, topico.name, subject.categoria, topico.ordem || i + 1);
      if (!content) throw new Error("Conteúdo inválido (null)");

      const { title, size } = await gerarEUploadarPDF(
        subject.id, subject.name, topico.id, topico.name, content, topico.ordem || i + 1
      );

      console.log(`✅ ${(size / 1024).toFixed(0)}KB — "${title.slice(0, 45)}"`);
      progress.done[key] = true;
      progress.stats.gerados++;
      saveProgress(progress);

      await new Promise(r => setTimeout(r, 800));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`❌ ${msg.slice(0, 60)}`);
      progress.stats.erros++;
      saveProgress(progress);
    }
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log("📖 Gerador de Materiais PDF — AprovAI360\n");

  if (RESET && existsSync(PROGRESS_FILE)) {
    unlinkSync(PROGRESS_FILE);
    console.log("🗑️  Progresso resetado\n");
  }

  const progress = loadProgress();
  if (DRY) console.log("🟡 MODO DRY — nenhum PDF será gerado\n");
  if (ONLY_FIRST) console.log("🔹 MODO ONLY-FIRST — apenas 1 tópico por matéria\n");

  const PRIORIDADE = ["geral","direito","policial","fiscal","bancario","gestao","ti","previdencia-social","controle-auditoria","militar","judicial","gestao-publica","ministerio-publico"];

  let q = db.from("Subject").select("id, name, categoria").order("name");
  if (FILTER) q = q.ilike("name", `%${FILTER}%`);
  const { data: subjects } = await q;

  const ordered = (subjects ?? []).sort((a, b) => {
    const pa = PRIORIDADE.indexOf(a.categoria);
    const pb = PRIORIDADE.indexOf(b.categoria);
    return (pa < 0 ? 99 : pa) - (pb < 0 ? 99 : pb) || a.name.localeCompare(b.name);
  });

  type TopicRow = { id: string; name: string; subjectId: string; ordem: number };
  const { data: allTopics } = await db.from("Topic").select("id, name, subjectId, ordem").order("ordem");
  const bySubject: Record<string, TopicRow[]> = {};
  for (const t of allTopics ?? []) {
    if (!bySubject[t.subjectId]) bySubject[t.subjectId] = [];
    bySubject[t.subjectId].push(t);
  }

  const comTopicos = ordered.filter(s => (bySubject[s.id]?.length ?? 0) > 0);
  const totalTopicos = comTopicos.reduce((acc, s) => acc + (bySubject[s.id]?.length ?? 0), 0);

  console.log(`📋 ${comTopicos.length} matérias | ${totalTopicos} tópicos no total`);
  console.log(`   Já gerados: ${Object.keys(progress.done).length} | Faltam: ${totalTopicos - Object.keys(progress.done).length}\n`);

  for (const subject of comTopicos) {
    await processarMateria(subject, bySubject[subject.id] ?? [], progress);
  }

  console.log("\n" + "═".repeat(60));
  console.log("✅ Concluído!");
  console.log(`   PDFs gerados: ${progress.stats.gerados.toLocaleString("pt-BR")}`);
  console.log(`   Erros:        ${progress.stats.erros}`);
  console.log("═".repeat(60));
}

main().catch(err => { console.error("\n❌ Erro fatal:", err.message); process.exit(1); });
