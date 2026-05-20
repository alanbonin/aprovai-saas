import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { createWithCache, MODELS, extractJSON } from "@/lib/anthropic";
import { renderToBuffer, Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

// ── Auth ─────────────────────────────────────────────────────────────────────
async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await db.from("User").select("id, role").eq("supabaseId", user.id).single();
  return data?.role === "ADMIN" ? data : null;
}

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface SecaoTeoria      { tipo: "teoria";         titulo: string; texto: string; }
interface SecaoLista       { tipo: "lista";           titulo: string; itens: string[]; }
interface SecaoTabela      { tipo: "tabela";          titulo: string; colunas: string[]; linhas: string[][]; }
interface SecaoAtencao     { tipo: "atencao";         texto: string; }
interface SecaoExempl      { tipo: "exemplificando";  titulo?: string; texto: string; }
interface SecaoCodigo      { tipo: "codigo";          titulo?: string; codigo: string; }
interface SecaoQuestao     { tipo: "questao";         banca: string; ano: string; orgao?: string; enunciado: string; gabarito: string; comentario: string; }
interface SecaoDestaque    { tipo: "destaque";        titulo: string; texto: string; }

type Secao = SecaoTeoria | SecaoLista | SecaoTabela | SecaoAtencao | SecaoExempl | SecaoCodigo | SecaoQuestao | SecaoDestaque;

interface QuestaoFinal {
  numero: number;
  banca: string;
  ano: string;
  orgao?: string;
  enunciado: string;
  gabarito: string;
  comentario: string;
}

interface AulaContent {
  titulo: string;
  subtitulo: string;
  cargo: string;
  materia: string;
  banca: string;
  numero_aula: string;
  introducao: string;
  secoes: Secao[];
  questoes_lista?: QuestaoFinal[];
}

// ── Cores ─────────────────────────────────────────────────────────────────────
const C = {
  dark:        "#1e1b4b",
  purple:      "#6d28d9",
  purpleLight: "#ede9fe",
  amber:       "#d97706",
  amberLight:  "#fef3c7",
  teal:        "#0d9488",
  tealLight:   "#ccfbf1",
  codeBg:      "#1e293b",
  codeText:    "#e2e8f0",
  gray:        "#374151",
  grayLight:   "#f3f4f6",
  white:       "#ffffff",
  border:      "#e5e7eb",
  muted:       "#9ca3af",
};

// ── Estilos PDF ───────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  // Capa
  cover:            { backgroundColor: C.dark, flex: 1, padding: 50 },
  coverTopRow:      { flexDirection: "row", justifyContent: "space-between", marginBottom: 60 },
  coverLogo:        { fontSize: 22, fontWeight: "bold", color: C.white },
  coverLogoSub:     { fontSize: 9, color: "#a78bfa", marginTop: 3 },
  coverNumLabel:    { fontSize: 11, color: "#a78bfa", textAlign: "right" },
  coverNum:         { fontSize: 52, fontWeight: "bold", color: C.white, textAlign: "right", lineHeight: 1.1 },
  coverTitle:       { fontSize: 24, fontWeight: "bold", color: C.white, marginTop: 60, lineHeight: 1.3 },
  coverSubtitle:    { fontSize: 13, color: "#c4b5fd", marginTop: 12, lineHeight: 1.4 },
  coverDivider:     { height: 2, backgroundColor: C.purple, marginTop: 30, marginBottom: 20, width: 80 },
  coverMeta:        { marginTop: "auto" as unknown as number },
  coverMetaItem:    { fontSize: 10, color: "#a78bfa", marginBottom: 4 },
  coverMetaValue:   { fontSize: 12, color: C.white, fontWeight: "bold", marginBottom: 10 },
  coverDate:        { fontSize: 9, color: "#6d4ed8", marginTop: 20 },

  // Páginas de conteúdo
  page:             { backgroundColor: C.white, paddingBottom: 65 },
  pageHeader:       { backgroundColor: C.dark, paddingHorizontal: 40, paddingVertical: 9, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  pageHeaderLeft:   { fontSize: 8, color: "#a78bfa", fontWeight: "bold" },
  pageHeaderRight:  { fontSize: 8, color: "#6d4ed8" },
  body:             { paddingHorizontal: 40, paddingTop: 18 },

  // Introdução
  introBox:         { backgroundColor: C.purpleLight, borderLeftWidth: 4, borderLeftColor: C.purple, padding: 14, marginBottom: 18, borderRadius: 3 },
  introText:        { fontSize: 10, color: C.dark, lineHeight: 1.65, fontStyle: "italic" },

  // Teoria
  sectionTitle:     { fontSize: 13, fontWeight: "bold", color: C.dark, marginBottom: 8, marginTop: 20, paddingBottom: 5, borderBottomWidth: 2, borderBottomColor: C.purple },
  paragraph:        { fontSize: 10, color: C.gray, lineHeight: 1.68, marginBottom: 8 },

  // Lista
  listItem:         { flexDirection: "row", marginBottom: 5, paddingLeft: 4 },
  listBullet:       { fontSize: 10, color: C.purple, marginRight: 8, fontWeight: "bold" },
  listText:         { fontSize: 10, color: C.gray, lineHeight: 1.5, flex: 1 },

  // Tabela
  table:            { marginBottom: 12, borderWidth: 1, borderColor: C.border, overflow: "hidden" },
  tableRow:         { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: C.border },
  tableHead:        { backgroundColor: C.dark },
  tableHeadCell:    { fontSize: 9, fontWeight: "bold", color: C.white, padding: 8, flex: 1 },
  tableCell:        { fontSize: 9, color: C.gray, padding: 8, flex: 1, lineHeight: 1.4 },
  tableAlt:         { backgroundColor: C.grayLight },

  // FIQUE ATENTO
  atencaoWrap:      { marginVertical: 10, borderWidth: 1, borderColor: C.amber, overflow: "hidden", borderRadius: 4 },
  atencaoHeader:    { backgroundColor: C.amber, paddingHorizontal: 12, paddingVertical: 5, flexDirection: "row", alignItems: "center", gap: 6 },
  atencaoHeaderTxt: { fontSize: 9, fontWeight: "bold", color: C.white },
  atencaoBody:      { backgroundColor: C.amberLight, padding: 12 },
  atencaoText:      { fontSize: 10, color: "#78350f", lineHeight: 1.55 },

  // EXEMPLIFICANDO
  exemplWrap:       { marginVertical: 10, borderWidth: 1, borderColor: C.teal, overflow: "hidden", borderRadius: 4 },
  exemplHeader:     { backgroundColor: C.teal, paddingHorizontal: 12, paddingVertical: 5 },
  exemplHeaderTxt:  { fontSize: 9, fontWeight: "bold", color: C.white },
  exemplTitle:      { fontSize: 10, fontWeight: "bold", color: C.teal, paddingHorizontal: 12, paddingTop: 10 },
  exemplBody:       { backgroundColor: C.tealLight, padding: 12, paddingTop: 6 },
  exemplText:       { fontSize: 10, color: "#134e4a", lineHeight: 1.55 },

  // Código
  codeWrap:         { backgroundColor: C.codeBg, borderRadius: 4, marginVertical: 10, padding: 14 },
  codeTitle:        { fontSize: 8, color: "#94a3b8", marginBottom: 8, fontWeight: "bold" },
  codeText:         { fontSize: 9, color: C.codeText, fontFamily: "Courier", lineHeight: 1.65 },

  // Questão inline
  questaoWrap:      { borderWidth: 1, borderColor: C.border, borderRadius: 4, marginVertical: 10, overflow: "hidden" },
  questaoBancaBar:  { backgroundColor: C.purpleLight, paddingHorizontal: 10, paddingVertical: 5 },
  questaoBancaTxt:  { fontSize: 8, color: C.purple, fontWeight: "bold" },
  questaoEnunc:     { fontSize: 10, color: C.gray, padding: 10, lineHeight: 1.55 },
  questaoSep:       { height: 1, backgroundColor: C.border, marginHorizontal: 10 },
  questaoGabRow:    { flexDirection: "row", padding: 10, gap: 6 },
  questaoGabLabel:  { fontSize: 9, fontWeight: "bold", color: C.purple },
  questaoGabText:   { fontSize: 9, color: C.gray, flex: 1, lineHeight: 1.4 },

  // Destaque
  destacWrap:       { backgroundColor: C.purpleLight, borderLeftWidth: 4, borderLeftColor: C.purple, padding: 12, marginVertical: 10, borderRadius: 3 },
  destacTitle:      { fontSize: 10, fontWeight: "bold", color: C.purple, marginBottom: 5 },
  destacText:       { fontSize: 10, color: C.gray, lineHeight: 1.55 },

  // Seção de questões finais
  questoesHeader:   { backgroundColor: C.dark, padding: 14, borderRadius: 4, marginTop: 28, marginBottom: 16 },
  questoesHeaderTx: { fontSize: 14, fontWeight: "bold", color: C.white },
  questaoFinalBox:  { borderWidth: 1, borderColor: C.border, borderRadius: 4, marginBottom: 14, overflow: "hidden" },
  questaoFinalNum:  { backgroundColor: C.grayLight, paddingHorizontal: 10, paddingVertical: 5 },
  questaoFinalNumTx:{ fontSize: 9, fontWeight: "bold", color: C.purple },
  questaoFinalEnunc:{ fontSize: 10, color: C.gray, padding: 10, lineHeight: 1.55 },
  questaoFinalGab:  { backgroundColor: C.purpleLight, padding: 10 },
  questaoFinalGabTx:{ fontSize: 9, color: C.dark, lineHeight: 1.5 },

  // Footer
  footer:           { position: "absolute", bottom: 20, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: C.border, paddingTop: 8 },
  footerLeft:       { fontSize: 8, color: C.muted },
  footerRight:      { fontSize: 8, color: C.muted },
});

// ── Renderizador de seções ────────────────────────────────────────────────────
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
              {secao.colunas.map((col, c) => (
                <Text key={c} style={s.tableHeadCell}>{col}</Text>
              ))}
            </View>
            {secao.linhas.map((linha, r) => (
              <View key={r} style={[s.tableRow, r % 2 === 1 ? s.tableAlt : {}]}>
                {linha.map((cel, c) => (
                  <Text key={c} style={s.tableCell}>{cel}</Text>
                ))}
              </View>
            ))}
          </View>
        </View>
      );

    case "atencao":
      return (
        <View key={idx} style={s.atencaoWrap}>
          <View style={s.atencaoHeader}>
            <Text style={s.atencaoHeaderTxt}>! FIQUE ATENTO !</Text>
          </View>
          <View style={s.atencaoBody}>
            <Text style={s.atencaoText}>{secao.texto}</Text>
          </View>
        </View>
      );

    case "exemplificando":
      return (
        <View key={idx} style={s.exemplWrap}>
          <View style={s.exemplHeader}>
            <Text style={s.exemplHeaderTxt}>EXEMPLIFICANDO</Text>
          </View>
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

    case "questao": {
      const bancaLabel = [secao.banca, secao.ano, secao.orgao].filter(Boolean).join(" - ");
      return (
        <View key={idx} style={s.questaoWrap}>
          <View style={s.questaoBancaBar}>
            <Text style={s.questaoBancaTxt}>({bancaLabel})</Text>
          </View>
          <Text style={s.questaoEnunc}>{secao.enunciado}</Text>
          <View style={s.questaoSep} />
          <View style={s.questaoGabRow}>
            <Text style={s.questaoGabLabel}>Gabarito: {secao.gabarito}</Text>
            <Text style={s.questaoGabText}>{secao.comentario}</Text>
          </View>
        </View>
      );
    }

    case "destaque":
      return (
        <View key={idx} style={s.destacWrap}>
          <Text style={s.destacTitle}>{secao.titulo}</Text>
          <Text style={s.destacText}>{secao.texto}</Text>
        </View>
      );

    default:
      return null;
  }
}

// ── Componente PDF ────────────────────────────────────────────────────────────
function AulaPDF({ content }: { content: AulaContent }) {
  const hoje = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  const aulaLabel = `Aula ${content.numero_aula.padStart(2, "0")}`;
  const bancaStr = content.banca || "Concursos Públicos";
  const pageHeaderLeft = `Aprovai360  |  ${content.materia}  |  ${aulaLabel}`;

  return (
    <Document title={content.titulo} author="Aprovai360" subject={content.materia}>

      {/* ── Capa ── */}
      <Page size="A4" style={s.cover}>
        {/* Topo */}
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

        {/* Título */}
        <Text style={s.coverTitle}>{content.titulo}</Text>
        <Text style={s.coverSubtitle}>{content.subtitulo}</Text>
        <View style={s.coverDivider} />

        {/* Meta */}
        <View style={s.coverMeta}>
          {content.cargo ? (
            <>
              <Text style={s.coverMetaItem}>Cargo</Text>
              <Text style={s.coverMetaValue}>{content.cargo}</Text>
            </>
          ) : null}
          <Text style={s.coverMetaItem}>Materia</Text>
          <Text style={s.coverMetaValue}>{content.materia}</Text>
          {content.banca ? (
            <>
              <Text style={s.coverMetaItem}>Banca de referencia</Text>
              <Text style={s.coverMetaValue}>{content.banca}</Text>
            </>
          ) : null}
          <Text style={s.coverDate}>{hoje}</Text>
        </View>
      </Page>

      {/* ── Conteúdo ── */}
      <Page size="A4" style={s.page}>
        {/* Header fixo */}
        <View style={s.pageHeader} fixed>
          <Text style={s.pageHeaderLeft}>{pageHeaderLeft}</Text>
          <Text style={s.pageHeaderRight}>{bancaStr}</Text>
        </View>

        {/* Body */}
        <View style={s.body}>
          {/* Introdução */}
          {content.introducao ? (
            <View style={s.introBox}>
              <Text style={s.introText}>{content.introducao}</Text>
            </View>
          ) : null}

          {/* Seções */}
          {content.secoes.map((secao, idx) => (
            <RenderSecao key={idx} secao={secao} idx={idx} />
          ))}

          {/* Lista de Questões Final */}
          {content.questoes_lista && content.questoes_lista.length > 0 ? (
            <View break>
              <View style={s.questoesHeader}>
                <Text style={s.questoesHeaderTx}>Lista de Questoes para Treino</Text>
              </View>
              {content.questoes_lista.map((q, i) => {
                const label = [q.banca, q.ano, q.orgao].filter(Boolean).join(" - ");
                return (
                  <View key={i} style={s.questaoFinalBox}>
                    <View style={s.questaoFinalNum}>
                      <Text style={s.questaoFinalNumTx}>Questao {q.numero}  |  {label}</Text>
                    </View>
                    <Text style={s.questaoFinalEnunc}>{q.enunciado}</Text>
                    <View style={s.questaoFinalGab}>
                      <Text style={s.questaoFinalGabTx}>
                        Gabarito: {q.gabarito}{"  |  "}{q.comentario}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : null}
        </View>

        {/* Footer fixo */}
        <View style={s.footer} fixed>
          <Text style={s.footerLeft}>Aprovai360 — Material gerado por IA em {hoje}</Text>
          <Text
            style={s.footerRight}
            render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}

// ── POST /api/admin/materiais/gerar ──────────────────────────────────────────
export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Sem permissao" }, { status: 403 });

  const { subjectId, subjectName, cargo, banca, topico, tipo, numeroAula } =
    await req.json() as {
      subjectId: string;
      subjectName: string;
      cargo?: string;
      banca?: string;
      topico?: string;
      tipo?: string;
      numeroAula?: string;
    };

  if (!subjectId || !subjectName) {
    return NextResponse.json({ error: "subjectId e subjectName sao obrigatorios" }, { status: 400 });
  }

  const numAula = numeroAula || "1";
  const cargoLine = cargo ? `\nCargo alvo: ${cargo}` : "";
  const bancaLine = banca ? `\nBanca de referencia: ${banca} (use o estilo e nivel dessa banca nas questoes)` : "";
  const topicoLine = topico ? `\nTopico especifico: ${topico}` : "";

  // Instrucoes por tipo
  const tipoInstrucao =
    tipo === "resumo"
      ? "Gere 4 secoes de revisao rapida: 1 teoria principal, 1 lista de pontos-chave, 1 destaque de atencao, 1 tabela comparativa. Sem codigo. 2 questoes_lista."
      : tipo === "exercicios"
      ? "Gere 2 secoes de contexto teorico (teoria + lista) e 5 questoes_lista com gabarito comentado detalhado. Inclua 2 questoes inline no corpo."
      : tipo === "mapa_conceitos"
      ? "Gere 5 secoes: 1 teoria de visao geral, 2 listas de conceitos, 1 tabela comparativa, 1 destaque. 2 questoes_lista."
      : "Gere uma aula completa com 7-8 secoes intercalando: teoria, exemplificando, atencao, lista, tabela, questao inline, destaque. Use 'codigo' se for area de TI. 3 questoes_lista.";

  const prompt = `Voce e um professor especialista em ${subjectName} para concursos publicos brasileiros.
Gere a Aula ${numAula} sobre: ${topico || subjectName}${cargoLine}${bancaLine}${topicoLine}

${tipoInstrucao}

TIPOS DE SECAO DISPONIVEIS:
- {"tipo":"teoria","titulo":"1. Titulo","texto":"..."} - teoria didatica (max 120 palavras)
- {"tipo":"lista","titulo":"...","itens":["..."]} - lista de pontos (max 7 itens, cada um max 20 palavras)
- {"tipo":"tabela","titulo":"...","colunas":["A","B"],"linhas":[["v1","v2"]]} - max 3 colunas x 5 linhas, celulas curtas
- {"tipo":"atencao","texto":"..."} - armadilha comum de prova (max 50 palavras)
- {"tipo":"exemplificando","titulo":"...","texto":"..."} - exemplo pratico contextualizado (max 80 palavras)
- {"tipo":"codigo","titulo":"...","codigo":"..."} - pseudocodigo ou codigo (max 12 linhas, so para TI)
- {"tipo":"questao","banca":"CESPE","ano":"2023","orgao":"TCU","enunciado":"...","gabarito":"Certo","comentario":"..."} - questao real ou no estilo da banca (enunciado max 60 palavras, comentario max 50 palavras)
- {"tipo":"destaque","titulo":"...","texto":"..."} - ponto critico para memorizar (max 60 palavras)

REGRAS DE QUALIDADE:
- Intercale tipos diferentes: nunca duas "teoria" seguidas sem um "exemplificando" ou "atencao" entre elas
- introducao: frase motivadora conectando o topico com a realidade do cargo (max 50 palavras)
- questoes_lista: questoes de banca real no estilo ${banca || "CESPE/CEBRASPE"} com comentario didatico
- Linguagem direta, sem rodeios, focada no que cai em prova
- Artigos de lei e numeros citados quando relevante

Retorne APENAS JSON valido sem markdown:
{"titulo":"...","subtitulo":"...","cargo":"${cargo || "Concursos Publicos"}","materia":"${subjectName}","banca":"${banca || ""}","numero_aula":"${numAula}","introducao":"...","secoes":[...],"questoes_lista":[{"numero":1,"banca":"...","ano":"...","orgao":"...","enunciado":"...","gabarito":"...","comentario":"..."}]}`;

  // ── Gera conteúdo com IA ─────────────────────────────────────────────────────
  let content: AulaContent;
  try {
    const SYSTEM = "Voce e um professor especialista em concursos publicos brasileiros. Gere apenas JSON valido, sem markdown, sem comentarios.";
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
    console.error("[materiais/gerar] stop_reason:", (msg as { stop_reason?: string }).stop_reason, "| chars:", raw.length);
    content = extractJSON<AulaContent>(raw);
  } catch (e) {
    console.error("[materiais/gerar] Erro IA:", e);
    return NextResponse.json({ error: `Erro ao gerar conteudo: ${(e as Error).message}` }, { status: 500 });
  }

  // ── Renderiza PDF ─────────────────────────────────────────────────────────────
  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await renderToBuffer(<AulaPDF content={content} />);
  } catch (e) {
    console.error("[materiais/gerar] Erro PDF:", e);
    return NextResponse.json({ error: `Erro ao renderizar PDF: ${(e as Error).message}` }, { status: 500 });
  }

  // ── Garante bucket ────────────────────────────────────────────────────────────
  const BUCKET = "materiais";
  const { data: buckets } = await db.storage.listBuckets();
  const bucketExists = buckets?.some((b) => b.name === BUCKET);
  if (!bucketExists) {
    const { error: createErr } = await db.storage.createBucket(BUCKET, {
      public: true,
      allowedMimeTypes: ["application/pdf"],
      fileSizeLimit: 52428800,
    });
    if (createErr) {
      return NextResponse.json({ error: `Erro ao criar bucket: ${createErr.message}` }, { status: 500 });
    }
  }

  // ── Upload ────────────────────────────────────────────────────────────────────
  const tipoLabel = tipo === "resumo" ? "resumo" : tipo === "exercicios" ? "exercicios" : tipo === "mapa_conceitos" ? "mapa" : "aula";
  const fileName = `${subjectId}/aula${numAula.padStart(2,"0")}-${tipoLabel}-${Date.now()}.pdf`;
  const { error: uploadError } = await db.storage
    .from(BUCKET)
    .upload(fileName, pdfBuffer, { contentType: "application/pdf", upsert: false });

  if (uploadError) {
    console.error("[materiais/gerar] Upload error:", uploadError);
    return NextResponse.json({ error: `Erro no upload: ${uploadError.message}` }, { status: 500 });
  }

  const { data: { publicUrl } } = db.storage.from(BUCKET).getPublicUrl(fileName);

  // ── Salva no banco ────────────────────────────────────────────────────────────
  const title = `${content.titulo} — ${content.subtitulo}`.slice(0, 120);
  const description = `${tipoLabel.charAt(0).toUpperCase() + tipoLabel.slice(1)} gerado por IA${cargo ? ` para ${cargo}` : ""}${banca ? ` | ${banca}` : ""}. ${content.secoes.length} secoes + ${content.questoes_lista?.length ?? 0} questoes.`;

  const { data: material, error: dbError } = await db.from("Material").insert({
    id: crypto.randomUUID(),
    title,
    description,
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
