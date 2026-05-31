#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));

// Carrega env
for (const f of ["/Users/alanbonin/aprovai-saas/.env", "/Users/alanbonin/aprovai-saas/.env.local"]) {
  if (!existsSync(f)) continue;
  for (const line of readFileSync(f, "utf-8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    if (!process.env[key]) process.env[key] = val;
  }
}

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Tópicos por matéria
const TOPICOS = {
  "Direito Eleitoral": [
    { name: "Código Eleitoral e Princípios", slug: "codigo-eleitoral-principios", description: "Princípios do direito eleitoral, fontes e aplicação do Código Eleitoral." },
    { name: "Alistamento e Domicílio Eleitoral", slug: "alistamento-domicilio-eleitoral", description: "Alistamento obrigatório/facultativo, domicílio eleitoral e transferência." },
    { name: "Partidos Políticos", slug: "partidos-politicos-lei", description: "Criação, fusão, extinção e financiamento de partidos políticos." },
    { name: "Sistemas Eleitorais", slug: "sistemas-eleitorais", description: "Sistema majoritário, proporcional, misto e suas aplicações no Brasil." },
    { name: "Candidaturas e Inelegibilidades", slug: "candidaturas-inelegibilidades", description: "Condições de elegibilidade, causas de inelegibilidade e registro de candidatura." },
    { name: "Propaganda Eleitoral", slug: "propaganda-eleitoral", description: "Regras de propaganda, crimes eleitorais de propaganda e uso das redes sociais." },
    { name: "Financiamento de Campanhas", slug: "financiamento-campanhas", description: "Doações, arrecadação, fundo eleitoral e prestação de contas." },
    { name: "Crimes Eleitorais", slug: "crimes-eleitorais", description: "Crimes contra a honra, corrupção eleitoral, boca de urna e violência eleitoral." },
    { name: "Justiça Eleitoral e Processo", slug: "justica-eleitoral-processo", description: "TSE, TRE, Juízes Eleitorais, recursos e ação de impugnação de mandato." },
    { name: "Plebiscito, Referendo e Iniciativa Popular", slug: "plebiscito-referendo-iniciativa", description: "Democracia direta: plebiscito, referendo e iniciativa popular de lei." },
  ],
  "Legislação do Distrito Federal": [
    { name: "Lei Orgânica do Distrito Federal", slug: "lodf-principios", description: "Estrutura e princípios da Lei Orgânica do DF." },
    { name: "Organização dos Poderes do DF", slug: "poderes-df", description: "Câmara Legislativa, TJDFT, MPDFT e Governador do DF." },
    { name: "Administração Pública do DF", slug: "administracao-publica-df", description: "Servidores públicos do DF, estatuto e regime jurídico." },
    { name: "Finanças e Orçamento do DF", slug: "financas-orcamento-df", description: "LDO, LOA e fiscalização orçamentária no Distrito Federal." },
    { name: "Segurança Pública do DF", slug: "seguranca-publica-df", description: "PMDF, PCDF, CBMDF e legislação de segurança pública." },
    { name: "Saúde e Educação no DF", slug: "saude-educacao-df", description: "Políticas de saúde e educação no Distrito Federal." },
  ],
  "Legislação Específica": [
    { name: "Lei 8.112/90 — Estatuto dos Servidores Federais", slug: "lei-8112-estatuto-federal", description: "Ingresso, direitos, deveres, vencimentos e disciplina dos servidores federais." },
    { name: "Lei 9.784/99 — Processo Administrativo Federal", slug: "lei-9784-processo-administrativo", description: "Princípios, fases e recursos no processo administrativo federal." },
    { name: "Lei 8.429/92 — Improbidade Administrativa", slug: "lei-8429-improbidade", description: "Atos de improbidade, sanções e procedimento de responsabilização." },
    { name: "Lei 13.709/18 — LGPD", slug: "lgpd-lei-geral-protecao-dados", description: "Proteção de dados pessoais, bases legais, direitos dos titulares e ANPD." },
    { name: "Lei 14.133/21 — Nova Lei de Licitações", slug: "lei-14133-licitacoes", description: "Modalidades, fases, critérios e contratos na nova lei de licitações." },
    { name: "Decreto-Lei 4.657 — LINDB", slug: "lindb-lei-introducao", description: "Lei de Introdução às Normas do Direito Brasileiro e suas aplicações." },
  ],
  "Legislação Estadual": [
    { name: "Constituição Estadual — Parte Geral", slug: "const-estadual-geral", description: "Princípios fundamentais e organização do Estado nas constituições estaduais." },
    { name: "Organização dos Poderes Estaduais", slug: "poderes-estaduais", description: "Governador, Assembleia Legislativa e Tribunal de Justiça estadual." },
    { name: "Administração Pública Estadual", slug: "adm-publica-estadual", description: "Servidores estaduais, estatutos e regime jurídico administrativo." },
    { name: "Finanças Públicas Estaduais", slug: "financas-publicas-estaduais", description: "Orçamento, ICMS, repasses e fiscalização financeira estadual." },
    { name: "Segurança Pública Estadual", slug: "seguranca-publica-estadual", description: "Polícia Civil, Polícia Militar e Corpo de Bombeiros estadual." },
    { name: "Lei Orgânica dos Órgãos Estaduais", slug: "lei-organica-orgaos-estaduais", description: "Lei Orgânica da PC, PM e regulamentos disciplinares estaduais." },
  ],
};

// Para legislações estaduais específicas, usar tópicos padrão com o estado
const ESTADOS_LEGISLACAO = [
  "Legislação Estadual (AC)", "Legislação Estadual (AL)", "Legislação Estadual (AM)",
  "Legislação Estadual (AP)", "Legislação Estadual (BA)", "Legislação Estadual (PR)",
  "Legislação Estadual (RJ)", "Legislação Estadual (RN)", "Legislação Estadual (RO)",
  "Legislação Estadual (RR)", "Legislação Estadual (RS)", "Legislação Estadual (SC)",
  "Legislação Estadual (SE)", "Legislação Estadual (SP)", "Legislação Estadual (TO)",
];

const ESTADOS_SIGLAS = {
  "AC": "Acre", "AL": "Alagoas", "AM": "Amazonas", "AP": "Amapá",
  "BA": "Bahia", "PR": "Paraná", "RJ": "Rio de Janeiro", "RN": "Rio Grande do Norte",
  "RO": "Rondônia", "RR": "Roraima", "RS": "Rio Grande do Sul", "SC": "Santa Catarina",
  "SE": "Sergipe", "SP": "São Paulo", "TO": "Tocantins",
};

function topicosEstado(sigla, nomeEstado) {
  return [
    { name: `Constituição do ${nomeEstado}`, slug: `const-${sigla.toLowerCase()}`, description: `Organização, princípios e poderes do Estado do ${nomeEstado}.` },
    { name: `Lei Orgânica da PC-${sigla}`, slug: `lei-organica-pc-${sigla.toLowerCase()}`, description: `Lei orgânica e regulamento disciplinar da Polícia Civil do ${nomeEstado}.` },
    { name: `Lei Orgânica da PM-${sigla}`, slug: `lei-organica-pm-${sigla.toLowerCase()}`, description: `Lei orgânica e regulamento disciplinar da Polícia Militar do ${nomeEstado}.` },
    { name: `Estatuto dos Servidores de ${sigla}`, slug: `estatuto-servidores-${sigla.toLowerCase()}`, description: `Direitos, deveres e regime jurídico dos servidores do ${nomeEstado}.` },
    { name: `Administração Pública de ${sigla}`, slug: `adm-publica-${sigla.toLowerCase()}`, description: `Organização administrativa, autarquias e fundações do ${nomeEstado}.` },
    { name: `Código Tributário de ${sigla}`, slug: `codigo-tributario-${sigla.toLowerCase()}`, description: `ICMS, IPVA, taxas e tributos estaduais do ${nomeEstado}.` },
  ];
}

async function main() {
  console.log("🔍 Buscando matérias sem tópicos e sem questões...\n");

  const { data: subjects } = await db.from("Subject").select("id, name, slug, categoria").order("name");
  const { data: topics } = await db.from("Topic").select("id, subjectId");
  const { data: qData } = await db.from("Question").select("subjectId").eq("aprovado", true);

  const topicsBySubject = {};
  for (const t of (topics || [])) topicsBySubject[t.subjectId] = (topicsBySubject[t.subjectId] || 0) + 1;
  const questoesBySubject = {};
  for (const q of (qData || [])) questoesBySubject[q.subjectId] = (questoesBySubject[q.subjectId] || 0) + 1;

  const semTudo = (subjects || []).filter(s =>
    !topicsBySubject[s.id] && !questoesBySubject[s.id]
  );

  console.log(`📚 ${semTudo.length} matérias sem tópicos nem questões\n`);

  let totalTopicsCriados = 0;

  for (const subject of semTudo) {
    let topicos = TOPICOS[subject.name];

    // Legislações estaduais específicas
    if (!topicos && ESTADOS_LEGISLACAO.includes(subject.name)) {
      const match = subject.name.match(/\(([A-Z]+)\)/);
      if (match) {
        const sigla = match[1];
        const nomeEstado = ESTADOS_SIGLAS[sigla] || sigla;
        topicos = topicosEstado(sigla, nomeEstado);
      }
    }

    if (!topicos) {
      console.log(`  ⚠️  Sem mapeamento para: ${subject.name}`);
      continue;
    }

    console.log(`\n📖 ${subject.name} (${subject.categoria})`);
    const now = new Date().toISOString();

    for (const t of topicos) {
      // Garante slug único
      const slug = `${t.slug}-${subject.id.slice(0,4)}`;
      const { error } = await db.from("Topic").insert({
        id: crypto.randomUUID(),
        subjectId: subject.id,
        name: t.name,
        slug,
        description: t.description,
        createdAt: now,
        updatedAt: now,
      });
      if (error) {
        console.log(`  ❌ Erro: ${t.name} — ${error.message}`);
      } else {
        console.log(`  ✅ Tópico: ${t.name}`);
        totalTopicsCriados++;
      }
    }
  }

  console.log(`\n✨ ${totalTopicsCriados} tópicos criados em ${semTudo.length} matérias!`);
}

main().catch(console.error);
