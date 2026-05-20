import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { createWithCache, MODELS, extractJSON } from "@/lib/anthropic";
import { renderToBuffer, Document, Page, Text, View, StyleSheet, Font, Image } from "@react-pdf/renderer";

// ── Auth ─────────────────────────────────────────────────────────────────────
async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await db.from("User").select("id, role").eq("supabaseId", user.id).single();
  return data?.role === "ADMIN" ? data : null;
}

// ── Tipos de conteúdo do material ────────────────────────────────────────────
type Secao =
  | { tipo: "texto";   titulo: string; conteudo: string }
  | { tipo: "lista";   titulo: string; itens: string[] }
  | { tipo: "tabela";  titulo: string; colunas: string[]; linhas: string[][] }
  | { tipo: "destaque"; titulo: string; conteudo: string; cor?: string };

interface MaterialContent {
  titulo: string;
  subtitulo: string;
  cargo: string;
  materia: string;
  banca: string;
  secoes: Secao[];
  resumo: string;
  questoes?: { enunciado: string; gabarito: string; explicacao: string }[];
}

// ── Estilos PDF ──────────────────────────────────────────────────────────────
Font.register({
  family: "Helvetica",
  fonts: [
    { src: "Helvetica" },
    { src: "Helvetica-Bold", fontWeight: "bold" },
  ],
});

const BRAND_PURPLE = "#6d28d9";
const BRAND_DARK   = "#1e1b4b";
const BRAND_LIGHT  = "#ede9fe";
const GRAY_TEXT    = "#374151";
const GRAY_LIGHT   = "#f3f4f6";

const styles = StyleSheet.create({
  page: { backgroundColor: "#ffffff", paddingTop: 0, paddingBottom: 60, fontFamily: "Helvetica" },

  // Header
  header: { backgroundColor: BRAND_DARK, paddingHorizontal: 40, paddingTop: 30, paddingBottom: 20 },
  headerTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  logoText: { fontSize: 20, fontWeight: "bold", color: "#ffffff" },
  logoSub: { fontSize: 9, color: "#a78bfa", marginTop: 2 },
  headerBadge: { backgroundColor: BRAND_PURPLE, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  headerBadgeText: { color: "#ffffff", fontSize: 8, fontWeight: "bold" },
  headerTitle: { fontSize: 22, fontWeight: "bold", color: "#ffffff", marginBottom: 6, lineHeight: 1.3 },
  headerSub: { fontSize: 11, color: "#c4b5fd", marginBottom: 12 },
  headerMeta: { flexDirection: "row", gap: 16 },
  headerMetaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  headerMetaText: { fontSize: 9, color: "#a78bfa" },
  headerDivider: { height: 2, backgroundColor: BRAND_PURPLE, marginTop: 16, borderRadius: 1 },

  // Body
  body: { paddingHorizontal: 40, paddingTop: 24 },

  // Seção
  sectionTitle: { fontSize: 13, fontWeight: "bold", color: BRAND_DARK, marginBottom: 8, marginTop: 20,
    paddingBottom: 4, borderBottomWidth: 2, borderBottomColor: BRAND_PURPLE },
  paragraph: { fontSize: 10, color: GRAY_TEXT, lineHeight: 1.65, marginBottom: 8 },

  // Lista
  listItem: { flexDirection: "row", marginBottom: 5, paddingLeft: 4 },
  listBullet: { fontSize: 10, color: BRAND_PURPLE, marginRight: 8, fontWeight: "bold" },
  listText: { fontSize: 10, color: GRAY_TEXT, lineHeight: 1.5, flex: 1 },

  // Tabela
  table: { marginBottom: 12, borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 4, overflow: "hidden" },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
  tableHeader: { backgroundColor: BRAND_DARK },
  tableHeaderText: { fontSize: 9, fontWeight: "bold", color: "#ffffff", padding: 8, flex: 1 },
  tableCell: { fontSize: 9, color: GRAY_TEXT, padding: 8, flex: 1 },
  tableAlt: { backgroundColor: GRAY_LIGHT },

  // Destaque
  highlight: { backgroundColor: BRAND_LIGHT, borderLeftWidth: 4, borderLeftColor: BRAND_PURPLE,
    padding: 12, marginVertical: 10, borderRadius: 4 },
  highlightTitle: { fontSize: 10, fontWeight: "bold", color: BRAND_PURPLE, marginBottom: 4 },
  highlightText: { fontSize: 10, color: GRAY_TEXT, lineHeight: 1.5 },

  // Resumo
  resumoBox: { backgroundColor: BRAND_DARK, padding: 16, marginHorizontal: 40, marginTop: 20,
    borderRadius: 8 },
  resumoTitle: { fontSize: 12, fontWeight: "bold", color: "#a78bfa", marginBottom: 8 },
  resumoText: { fontSize: 10, color: "#e5e7eb", lineHeight: 1.6 },

  // Questões
  questaoBox: { backgroundColor: GRAY_LIGHT, borderRadius: 6, padding: 12, marginBottom: 10 },
  questaoNum: { fontSize: 9, fontWeight: "bold", color: BRAND_PURPLE, marginBottom: 4 },
  questaoText: { fontSize: 10, color: GRAY_TEXT, lineHeight: 1.5, marginBottom: 6 },
  gabarito: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  gabaritoLabel: { fontSize: 9, fontWeight: "bold", color: BRAND_PURPLE },
  gabaritoText: { fontSize: 9, color: GRAY_TEXT, flex: 1, lineHeight: 1.4 },

  // Footer
  footer: { position: "absolute", bottom: 20, left: 40, right: 40,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    borderTopWidth: 1, borderTopColor: "#e5e7eb", paddingTop: 8 },
  footerLeft: { fontSize: 8, color: "#9ca3af" },
  footerRight: { fontSize: 8, color: "#9ca3af" },
  pageNumber: { fontSize: 8, color: "#9ca3af" },
});

// ── Renderer do PDF ───────────────────────────────────────────────────────────
function MaterialPDF({ content }: { content: MaterialContent }) {
  const geradoEm = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

  return (
    <Document
      title={content.titulo}
      author="Aprovai360"
      subject={content.materia}
      creator="Aprovai360 — Plataforma de Concursos"
    >
      <Page size="A4" style={styles.page}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.logoText}>Aprovai360</Text>
              <Text style={styles.logoSub}>Plataforma de Preparação para Concursos</Text>
            </View>
            {content.banca ? (
              <View style={styles.headerBadge}>
                <Text style={styles.headerBadgeText}>{content.banca}</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.headerTitle}>{content.titulo}</Text>
          <Text style={styles.headerSub}>{content.subtitulo}</Text>
          <View style={styles.headerMeta}>
            {content.cargo ? (
              <View style={styles.headerMetaItem}>
                <Text style={styles.headerMetaText}>👤 {content.cargo}</Text>
              </View>
            ) : null}
            {content.materia ? (
              <View style={styles.headerMetaItem}>
                <Text style={styles.headerMetaText}>📚 {content.materia}</Text>
              </View>
            ) : null}
            <View style={styles.headerMetaItem}>
              <Text style={styles.headerMetaText}>📅 {geradoEm}</Text>
            </View>
          </View>
          <View style={styles.headerDivider} />
        </View>

        {/* ── Seções ── */}
        <View style={styles.body}>
          {content.secoes.map((secao, idx) => {
            if (secao.tipo === "texto") {
              return (
                <View key={idx}>
                  <Text style={styles.sectionTitle}>{secao.titulo}</Text>
                  <Text style={styles.paragraph}>{secao.conteudo}</Text>
                </View>
              );
            }
            if (secao.tipo === "lista") {
              return (
                <View key={idx}>
                  <Text style={styles.sectionTitle}>{secao.titulo}</Text>
                  {secao.itens.map((item, i) => (
                    <View key={i} style={styles.listItem}>
                      <Text style={styles.listBullet}>▸</Text>
                      <Text style={styles.listText}>{item}</Text>
                    </View>
                  ))}
                </View>
              );
            }
            if (secao.tipo === "tabela") {
              return (
                <View key={idx}>
                  <Text style={styles.sectionTitle}>{secao.titulo}</Text>
                  <View style={styles.table}>
                    <View style={[styles.tableRow, styles.tableHeader]}>
                      {secao.colunas.map((col, c) => (
                        <Text key={c} style={styles.tableHeaderText}>{col}</Text>
                      ))}
                    </View>
                    {secao.linhas.map((linha, r) => (
                      <View key={r} style={[styles.tableRow, r % 2 === 1 ? styles.tableAlt : {}]}>
                        {linha.map((cel, c) => (
                          <Text key={c} style={styles.tableCell}>{cel}</Text>
                        ))}
                      </View>
                    ))}
                  </View>
                </View>
              );
            }
            if (secao.tipo === "destaque") {
              return (
                <View key={idx} style={styles.highlight}>
                  <Text style={styles.highlightTitle}>{secao.titulo}</Text>
                  <Text style={styles.highlightText}>{secao.conteudo}</Text>
                </View>
              );
            }
            return null;
          })}
        </View>

        {/* ── Resumo ── */}
        {content.resumo ? (
          <View style={styles.resumoBox}>
            <Text style={styles.resumoTitle}>📌 Resumo para Fixação</Text>
            <Text style={styles.resumoText}>{content.resumo}</Text>
          </View>
        ) : null}

        {/* ── Questões ── */}
        {content.questoes && content.questoes.length > 0 ? (
          <View style={[styles.body, { marginTop: 16 }]}>
            <Text style={[styles.sectionTitle, { marginTop: 0 }]}>✏️ Questões Práticas</Text>
            {content.questoes.map((q, i) => (
              <View key={i} style={styles.questaoBox}>
                <Text style={styles.questaoNum}>Questão {i + 1}</Text>
                <Text style={styles.questaoText}>{q.enunciado}</Text>
                <View style={styles.gabarito}>
                  <Text style={styles.gabaritoLabel}>Gabarito:</Text>
                  <Text style={styles.gabaritoText}>{q.gabarito} — {q.explicacao}</Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {/* ── Footer ── */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerLeft}>Aprovai360 — Material gerado por IA em {geradoEm}</Text>
          <Text style={styles.footerRight} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

// ── POST /api/admin/materiais/gerar ──────────────────────────────────────────
export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { subjectId, subjectName, cargo, banca, topico, tipo } =
    await req.json() as {
      subjectId: string;
      subjectName: string;
      cargo?: string;
      banca?: string;
      topico?: string;
      tipo?: string; // "apostila" | "resumo" | "mapa_conceitos" | "exercicios"
    };

  if (!subjectId || !subjectName) {
    return NextResponse.json({ error: "subjectId e subjectName são obrigatórios" }, { status: 400 });
  }

  const tipoLabel = tipo === "resumo" ? "Resumo" :
                    tipo === "mapa_conceitos" ? "Mapa de Conceitos" :
                    tipo === "exercicios" ? "Lista de Exercícios" : "Apostila";

  const cargoLine = cargo ? `\nCargo alvo: ${cargo}` : "";
  const bancaLine = banca ? `\nBanca: ${banca}` : "";
  const topicoLine = topico ? `\nTópico específico: ${topico}` : "";

  // Ajusta exigências por tipo para controlar o tamanho da resposta
  const tipoInstrucao =
    tipo === "resumo"
      ? "Crie 3 seções: (1) texto de conceito, (2) lista de pontos-chave, (3) destaque com o que mais cai. Resumo em 2 parágrafos. Sem questões."
      : tipo === "mapa_conceitos"
      ? "Crie 4 seções: (1) texto de definição, (2) lista de conceitos interligados, (3) tabela comparativa, (4) destaque de relações importantes. Resumo curto. 2 questões."
      : tipo === "exercicios"
      ? "Crie 2 seções de contexto (texto + lista). Gere 5 questões práticas com gabarito comentado. Resumo curto."
      : "Crie 4 seções variadas: 1 texto de conceito (máx. 120 palavras), 1 lista de pontos-chave (máx. 6 itens), 1 tabela comparativa (máx. 3 colunas × 4 linhas), 1 destaque. Resumo em 2 parágrafos. 3 questões.";

  const prompt = `Gere um ${tipoLabel} de concurso público sobre: ${subjectName}${topicoLine}${cargoLine}${bancaLine}

${tipoInstrucao}

REGRAS DE CONCISÃO (crítico para caber no JSON):
- Textos de seção: máximo 100 palavras cada
- Itens de lista: máximo 8 itens, cada um com até 15 palavras
- Células de tabela: máximo 20 caracteres por célula
- Resumo: máximo 80 palavras
- Enunciados de questão: máximo 60 palavras

Retorne APENAS o JSON abaixo, sem markdown:
{"titulo":"...","subtitulo":"...","cargo":"${cargo ?? "Concursos Públicos"}","materia":"${subjectName}","banca":"${banca ?? ""}","secoes":[{"tipo":"texto","titulo":"1. Conceito","conteudo":"..."},{"tipo":"lista","titulo":"Pontos-chave","itens":["..."]},{"tipo":"tabela","titulo":"Comparativo","colunas":["A","B"],"linhas":[["v1","v2"]]},{"tipo":"destaque","titulo":"⚠️ Atenção","conteudo":"..."}],"resumo":"...","questoes":[{"enunciado":"...","gabarito":"...","explicacao":"..."}]}`;

  let content: MaterialContent;
  try {
    const SYSTEM = "Você é um professor especialista em concursos públicos. Gere apenas JSON válido, sem markdown, sem explicações.";
    let msg;
    try {
      msg = await createWithCache({
        model: MODELS.sonnet, maxTokens: 8000, systemPrompt: SYSTEM, cacheSystem: false,
        messages: [{ role: "user", content: prompt }],
      });
    } catch (e) {
      console.error("[materiais/gerar] Sonnet falhou, tentando Haiku:", e);
      msg = await createWithCache({
        model: MODELS.haiku, maxTokens: 6000, systemPrompt: SYSTEM, cacheSystem: false,
        messages: [{ role: "user", content: prompt }],
      });
    }
    const raw = (msg.content[0] as { type: string; text: string }).text.trim();
    // Log parcial para diagnóstico
    if (process.env.NODE_ENV !== "production") {
      console.error("[materiais/gerar] stop_reason:", (msg as { stop_reason?: string }).stop_reason, "| chars:", raw.length);
    }
    // Se o modelo parou por maxTokens, o JSON estará incompleto — tente extrair o que há
    content = extractJSON<MaterialContent>(raw);
  } catch (e) {
    console.error("[materiais/gerar] Erro IA:", e);
    return NextResponse.json({ error: `Erro ao gerar conteúdo: ${(e as Error).message}` }, { status: 500 });
  }

  // ── Gera o PDF ───────────────────────────────────────────────────────────────
  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await renderToBuffer(<MaterialPDF content={content} />);
  } catch (e) {
    console.error("[materiais/gerar] Erro PDF:", e);
    return NextResponse.json({ error: `Erro ao gerar PDF: ${(e as Error).message}` }, { status: 500 });
  }

  // ── Garante que o bucket existe ──────────────────────────────────────────────
  const BUCKET = "materiais";
  const { data: buckets } = await db.storage.listBuckets();
  const bucketExists = buckets?.some((b) => b.name === BUCKET);
  if (!bucketExists) {
    const { error: createErr } = await db.storage.createBucket(BUCKET, {
      public: true,
      allowedMimeTypes: ["application/pdf"],
      fileSizeLimit: 52428800, // 50 MB
    });
    if (createErr) {
      console.error("[materiais/gerar] Erro ao criar bucket:", createErr);
      return NextResponse.json({ error: `Erro ao criar bucket: ${createErr.message}` }, { status: 500 });
    }
  }

  // ── Upload para Supabase Storage ─────────────────────────────────────────────
  const fileName = `${subjectId}/${Date.now()}-${tipoLabel.toLowerCase().replace(/\s/g, "-")}.pdf`;
  const { error: uploadError } = await db.storage
    .from(BUCKET)
    .upload(fileName, pdfBuffer, { contentType: "application/pdf", upsert: false });

  if (uploadError) {
    console.error("[materiais/gerar] Upload error:", uploadError);
    return NextResponse.json({ error: `Erro no upload: ${uploadError.message}` }, { status: 500 });
  }

  const { data: { publicUrl } } = db.storage.from(BUCKET).getPublicUrl(fileName);

  // ── Salva registro no banco ──────────────────────────────────────────────────
  const title = topico
    ? `${subjectName} — ${topico} (${tipoLabel})`
    : `${subjectName} — ${tipoLabel}${banca ? ` · ${banca}` : ""}`;

  const { data: material, error: dbError } = await db.from("Material").insert({
    id: crypto.randomUUID(),
    title,
    description: `${tipoLabel} gerado por IA${cargo ? ` para ${cargo}` : ""}${banca ? ` · ${banca}` : ""}. ${content.secoes.length} seções.`,
    type: "PDF",
    subjectId,
    banca: banca ?? null,
    fileUrl: publicUrl,
    fileSize: pdfBuffer.length,
    isPremium: false,
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }).select().single();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  return NextResponse.json(material, { status: 201 });
}
