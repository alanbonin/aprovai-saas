/**
 * seed-subjects.mjs — Popula o banco com as matérias dos principais concursos públicos brasileiros
 *
 * Organizado por categoria:
 *   geral       — matérias exigidas em quase todos os concursos
 *   direito     — ramos do Direito
 *   fiscal      — área fiscal e tributária
 *   policial    — área policial e segurança pública
 *   judicial    — área judicial e cartórios
 *   bancario    — Banco do Brasil, CEF, BNB, etc.
 *   ti          — TI/Informática para concursos de tecnologia
 *   gestao      — gestão pública e administração
 *
 * Uso: node scripts/seed-subjects.mjs
 */
import { createClient } from "@supabase/supabase-js";
try { const { config } = await import("dotenv"); config({ path: ".env.local" }); } catch {}

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

/**
 * Converte nome em slug: "Direito Administrativo" → "direito-administrativo"
 */
function toSlug(name) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const MATERIAS = [
  // ── Conhecimentos Gerais (transversais) ──────────────────────────────────────
  {
    name: "Língua Portuguesa",
    categoria: "geral",
    ordem: 1,
    description: "Gramática, interpretação de texto, ortografia, morfologia, sintaxe e redação oficial.",
  },
  {
    name: "Raciocínio Lógico",
    categoria: "geral",
    ordem: 2,
    description: "Lógica proposicional, silogismos, sequências numéricas, diagramas lógicos e problemas de raciocínio.",
  },
  {
    name: "Matemática",
    categoria: "geral",
    ordem: 3,
    description: "Aritmética, álgebra, geometria, porcentagem, regra de três, progressões e probabilidade.",
  },
  {
    name: "Informática",
    categoria: "geral",
    ordem: 4,
    description: "Sistema operacional, pacote Office, Internet, segurança da informação e conceitos básicos de redes.",
  },
  {
    name: "Atualidades",
    categoria: "geral",
    ordem: 5,
    description: "Fatos recentes nacionais e internacionais, conjuntura econômica, política e social.",
  },
  {
    name: "Geografia do Brasil",
    categoria: "geral",
    ordem: 6,
    description: "Regiões brasileiras, clima, vegetação, relevo, hidrografia e geopolítica.",
  },
  {
    name: "História do Brasil",
    categoria: "geral",
    ordem: 7,
    description: "Período colonial, Império, República Velha, Era Vargas, Ditadura Militar e redemocratização.",
  },
  {
    name: "Redação Oficial",
    categoria: "geral",
    ordem: 8,
    description: "Manual de redação da Presidência da República, elaboração de ofícios, memorandos e atas.",
  },

  // ── Direito ─────────────────────────────────────────────────────────────────
  {
    name: "Direito Constitucional",
    categoria: "direito",
    ordem: 10,
    description: "Constituição Federal de 1988: princípios fundamentais, direitos e garantias, organização do Estado e dos Poderes.",
  },
  {
    name: "Direito Administrativo",
    categoria: "direito",
    ordem: 11,
    description: "Atos administrativos, licitações (Lei 14.133/21), contratos, servidor público, improbidade e controle da administração.",
  },
  {
    name: "Direito Civil",
    categoria: "direito",
    ordem: 12,
    description: "Código Civil: pessoas, bens, fatos jurídicos, obrigações, contratos, família e sucessões.",
  },
  {
    name: "Direito Penal",
    categoria: "direito",
    ordem: 13,
    description: "Código Penal: teoria do crime, culpabilidade, extinção da punibilidade e crimes em espécie.",
  },
  {
    name: "Direito Processual Civil",
    categoria: "direito",
    ordem: 14,
    description: "CPC/2015: competência, petição inicial, provas, recursos, execução e procedimentos especiais.",
  },
  {
    name: "Direito Processual Penal",
    categoria: "direito",
    ordem: 15,
    description: "CPP: inquérito policial, ação penal, provas, prisões, recursos e execução penal.",
  },
  {
    name: "Direito Tributário",
    categoria: "direito",
    ordem: 16,
    description: "CTN: obrigação tributária, lançamento, crédito tributário, impostos, taxas e contribuições.",
  },
  {
    name: "Direito Trabalhista",
    categoria: "direito",
    ordem: 17,
    description: "CLT e legislação trabalhista: contrato de trabalho, FGTS, previdência e reforma trabalhista.",
  },
  {
    name: "Direito Financeiro",
    categoria: "direito",
    ordem: 18,
    description: "Lei de Responsabilidade Fiscal, orçamento público, receita e despesa pública.",
  },
  {
    name: "Direito Empresarial",
    categoria: "direito",
    ordem: 19,
    description: "Sociedades empresariais, títulos de crédito, falência e recuperação judicial.",
  },
  {
    name: "Direito Previdenciário",
    categoria: "direito",
    ordem: 20,
    description: "RGPS, benefícios (aposentadoria, auxílio-doença, salário-maternidade), custeio e contribuições.",
  },
  {
    name: "Direito Internacional",
    categoria: "direito",
    ordem: 21,
    description: "Tratados internacionais, organizações internacionais, direito consular e diplomático.",
  },

  // ── Área Fiscal e Tributária ─────────────────────────────────────────────────
  {
    name: "Administração Tributária",
    categoria: "fiscal",
    ordem: 30,
    description: "Fiscalização, lançamento tributário, autolançamento, substituição tributária e obrigações acessórias.",
  },
  {
    name: "Contabilidade Geral",
    categoria: "fiscal",
    ordem: 31,
    description: "Patrimônio, balanço patrimonial, DRE, lançamentos contábeis, depreciação e estoques.",
  },
  {
    name: "Contabilidade Pública",
    categoria: "fiscal",
    ordem: 32,
    description: "PCASP, MCASP, reconhecimento de receitas e despesas públicas, SIAFI e prestação de contas.",
  },
  {
    name: "Legislação Tributária Federal",
    categoria: "fiscal",
    ordem: 33,
    description: "IRPF, IRPJ, IPI, IOF, Cofins, PIS/Pasep e Simples Nacional.",
  },
  {
    name: "Auditoria Fiscal",
    categoria: "fiscal",
    ordem: 34,
    description: "Técnicas de auditoria, planejamento, execução e elaboração de relatórios fiscais.",
  },
  {
    name: "Economia",
    categoria: "fiscal",
    ordem: 35,
    description: "Microeconomia, macroeconomia, política fiscal e monetária, indicadores econômicos e PIB.",
  },

  // ── Área Policial / Segurança Pública ────────────────────────────────────────
  {
    name: "Legislação Policial",
    categoria: "policial",
    ordem: 40,
    description: "Estatutos das polícias Civil e Militar, Lei de Abuso de Autoridade (Lei 13.869/19) e direitos humanos.",
  },
  {
    name: "Criminologia",
    categoria: "policial",
    ordem: 41,
    description: "Teorias criminológicas, vitimologia, prevenção criminal e política de segurança pública.",
  },
  {
    name: "Medicina Legal",
    categoria: "policial",
    ordem: 42,
    description: "Tanatologia, lesões corporais, toxicologia forense, sexologia forense e documentos médico-legais.",
  },
  {
    name: "Criminalística",
    categoria: "policial",
    ordem: 43,
    description: "Local de crime, vestígios, cadeia de custódia, balística, documentoscopia e informática forense.",
  },
  {
    name: "Legislação Penal Especial",
    categoria: "policial",
    ordem: 44,
    description: "Lei de Drogas (11.343/06), Estatuto do Desarmamento, Lei Maria da Penha, ECA e estatuto do idoso.",
  },

  // ── Área Judicial / Cartórios ─────────────────────────────────────────────────
  {
    name: "Direito Notarial e Registral",
    categoria: "judicial",
    ordem: 50,
    description: "Serventias extrajudiciais, atos notariais, registro de imóveis, nascimento, casamento e óbito.",
  },
  {
    name: "Organização Judiciária",
    categoria: "judicial",
    ordem: 51,
    description: "Estrutura do Poder Judiciário, competência dos tribunais, STF, STJ, TJ e Juizados Especiais.",
  },
  {
    name: "Ética no Serviço Público",
    categoria: "judicial",
    ordem: 52,
    description: "Código de Ética do Servidor Público (Decreto 1.171/94), deveres e proibições.",
  },
  {
    name: "Estatuto dos Servidores",
    categoria: "judicial",
    ordem: 53,
    description: "Lei 8.112/90: provimento, vacância, direitos, deveres, responsabilidades e processo administrativo disciplinar.",
  },

  // ── Área Bancária ─────────────────────────────────────────────────────────────
  {
    name: "Conhecimentos Bancários",
    categoria: "bancario",
    ordem: 60,
    description: "Sistema Financeiro Nacional, produtos bancários, crédito, câmbio, mercado de capitais e compliance.",
  },
  {
    name: "Matemática Financeira",
    categoria: "bancario",
    ordem: 61,
    description: "Juros simples e compostos, desconto, amortização, TIR, VPL e análise de investimentos.",
  },
  {
    name: "Mercado de Capitais",
    categoria: "bancario",
    ordem: 62,
    description: "Bolsa de valores, ações, debêntures, fundos de investimento, CVM e regulação.",
  },
  {
    name: "Política Monetária e Câmbio",
    categoria: "bancario",
    ordem: 63,
    description: "Banco Central, COPOM, SELIC, PIX, câmbio, reservas internacionais e inflação.",
  },
  {
    name: "Vendas e Atendimento Bancário",
    categoria: "bancario",
    ordem: 64,
    description: "Técnicas de vendas, relacionamento com cliente, produtos e serviços bancários.",
  },

  // ── Área de TI ────────────────────────────────────────────────────────────────
  {
    name: "Algoritmos e Estruturas de Dados",
    categoria: "ti",
    ordem: 70,
    description: "Lógica de programação, arrays, listas, árvores, grafos, ordenação e complexidade.",
  },
  {
    name: "Banco de Dados",
    categoria: "ti",
    ordem: 71,
    description: "SQL, modelagem relacional, normalização, índices, transações e noSQL.",
  },
  {
    name: "Redes de Computadores",
    categoria: "ti",
    ordem: 72,
    description: "Modelo OSI/TCP-IP, protocolos (HTTP, DNS, SMTP), roteamento, switching e Wi-Fi.",
  },
  {
    name: "Segurança da Informação",
    categoria: "ti",
    ordem: 73,
    description: "Criptografia, autenticação, firewall, VPN, LGPD e normas ISO 27001/27002.",
  },
  {
    name: "Engenharia de Software",
    categoria: "ti",
    ordem: 74,
    description: "Ciclo de vida, metodologias ágeis (Scrum, Kanban), UML, padrões de projeto e testes.",
  },
  {
    name: "Arquitetura de Computadores",
    categoria: "ti",
    ordem: 75,
    description: "Processadores, memória, armazenamento, sistemas operacionais e virtualização.",
  },
  {
    name: "Governança de TI",
    categoria: "ti",
    ordem: 76,
    description: "ITIL v4, COBIT, gestão de projetos (PMI/Scrum), arquitetura corporativa e gestão de riscos de TI.",
  },
  {
    name: "Desenvolvimento Web",
    categoria: "ti",
    ordem: 77,
    description: "HTML, CSS, JavaScript, APIs REST, microsserviços, contêineres (Docker/Kubernetes) e cloud.",
  },

  // ── Gestão Pública ────────────────────────────────────────────────────────────
  {
    name: "Administração Geral",
    categoria: "gestao",
    ordem: 80,
    description: "Funções administrativas, teorias da administração, estruturas organizacionais e liderança.",
  },
  {
    name: "Administração Pública",
    categoria: "gestao",
    ordem: 81,
    description: "Princípios, modelos (burocrático, gerencial, societal), reforma do Estado e governança.",
  },
  {
    name: "Gestão de Pessoas",
    categoria: "gestao",
    ordem: 82,
    description: "Recrutamento, seleção, avaliação de desempenho, capacitação e clima organizacional.",
  },
  {
    name: "Gestão de Projetos",
    categoria: "gestao",
    ordem: 83,
    description: "PMBOK, iniciação, planejamento, execução, monitoramento e encerramento de projetos.",
  },
  {
    name: "Controle e Auditoria Governamental",
    categoria: "gestao",
    ordem: 84,
    description: "Controle interno, externo (TCU/TCE), auditoria governamental e accountability.",
  },
  {
    name: "Orçamento Público",
    categoria: "gestao",
    ordem: 85,
    description: "PPA, LDO, LOA, ciclo orçamentário, receitas e despesas públicas e execução orçamentária.",
  },
  {
    name: "Licitações e Contratos",
    categoria: "gestao",
    ordem: 86,
    description: "Lei 14.133/21 (Nova Lei de Licitações): modalidades, fases, dispensa, inexigibilidade e contratos administrativos.",
  },
  {
    name: "Gestão da Qualidade",
    categoria: "gestao",
    ordem: 87,
    description: "ISO 9001, ferramentas da qualidade (PDCA, 5S, diagrama de Ishikawa) e gestão por resultados.",
  },

  // ── ENEM ─────────────────────────────────────────────────────────────────────
  {
    name: "Linguagens e Códigos (ENEM)",
    categoria: "enem",
    ordem: 90,
    description: "Língua Portuguesa, Literatura, Língua Estrangeira (Inglês/Espanhol), Artes e Tecnologias — 45 questões + Redação.",
  },
  {
    name: "Ciências Humanas (ENEM)",
    categoria: "enem",
    ordem: 91,
    description: "História, Geografia, Filosofia e Sociologia — 45 questões. Interdisciplinar com foco em interpretação.",
  },
  {
    name: "Ciências da Natureza (ENEM)",
    categoria: "enem",
    ordem: 92,
    description: "Biologia, Física e Química — 45 questões. Foco em experimentação e aplicação cotidiana.",
  },
  {
    name: "Matemática e suas Tecnologias (ENEM)",
    categoria: "enem",
    ordem: 93,
    description: "Matemática — 45 questões. Inclui estatística, probabilidade, funções, geometria e matemática financeira.",
  },
  {
    name: "Redação ENEM",
    categoria: "enem",
    ordem: 94,
    description: "Dissertação argumentativa — proposta de intervenção social respeitando Direitos Humanos. Avaliada em 5 competências (200 pts cada).",
  },

  // ── Vestibular ────────────────────────────────────────────────────────────────
  {
    name: "Biologia (Vestibular)",
    categoria: "vestibular",
    ordem: 100,
    description: "Genética, ecologia, citologia, anatomia, evolução, fisiologia — exigida em FUVEST, UNICAMP, UNESP, UERJ para Medicina e Biológicas.",
  },
  {
    name: "Química (Vestibular)",
    categoria: "vestibular",
    ordem: 101,
    description: "Química orgânica, inorgânica, físico-química — com foco em FUVEST Medicina e UNICAMP.",
  },
  {
    name: "Física (Vestibular)",
    categoria: "vestibular",
    ordem: 102,
    description: "Mecânica, termodinâmica, eletromagnetismo, óptica e ondulatória — exigida em Engenharia e Medicina.",
  },
  {
    name: "Matemática (Vestibular)",
    categoria: "vestibular",
    ordem: 103,
    description: "Álgebra, geometria, análise combinatória, probabilidade, cálculo elementar — peso máximo em Engenharia.",
  },
  {
    name: "Português e Literatura (Vestibular)",
    categoria: "vestibular",
    ordem: 104,
    description: "Interpretação textual, gramática, literatura brasileira e portuguesa — peso alto em Direito/Humanas.",
  },
  {
    name: "História (Vestibular)",
    categoria: "vestibular",
    ordem: 105,
    description: "História do Brasil e Geral — exigida em Direito, Ciências Sociais e Humanas.",
  },
  {
    name: "Geografia (Vestibular)",
    categoria: "vestibular",
    ordem: 106,
    description: "Geopolítica, cartografia, geomorfologia, clima, urbanização — base de Humanas/Direito.",
  },
  {
    name: "Redação Vestibular",
    categoria: "vestibular",
    ordem: 107,
    description: "Dissertação argumentativa ou discursiva — avaliada em FUVEST 2ª fase, UNICAMP (discursivas), UNESP, UERJ.",
  },

  // ── OAB ───────────────────────────────────────────────────────────────────────
  {
    name: "Ética e Estatuto da OAB",
    categoria: "oab",
    ordem: 110,
    description: "Código de Ética e Disciplina, Estatuto da Advocacia (Lei 8.906/94), regulamentos OAB — ~8% das questões.",
  },
  {
    name: "Direito Constitucional (OAB)",
    categoria: "oab",
    ordem: 111,
    description: "Direitos fundamentais, controle de constitucionalidade, organização do Estado — ~10% das questões FGV.",
  },
  {
    name: "Direito Civil (OAB)",
    categoria: "oab",
    ordem: 112,
    description: "Pessoas, negócios jurídicos, responsabilidade civil, contratos, família e sucessões — ~12%, maior peso.",
  },
  {
    name: "Direito Processual Civil (OAB)",
    categoria: "oab",
    ordem: 113,
    description: "CPC/2015 — processo de conhecimento, execução, cautelares, recursos — ~9%.",
  },
  {
    name: "Direito Penal (OAB)",
    categoria: "oab",
    ordem: 114,
    description: "Parte geral e especial do CP, legislação penal extravagante — ~8%.",
  },
  {
    name: "Direito Processual Penal (OAB)",
    categoria: "oab",
    ordem: 115,
    description: "CPP — inquérito, ação penal, provas, prisões, recursos — ~6%.",
  },
  {
    name: "Direito do Trabalho (OAB)",
    categoria: "oab",
    ordem: 116,
    description: "CLT, jornada, férias, FGTS, rescisão, negociação coletiva — ~8%.",
  },
  {
    name: "Direito Tributário (OAB)",
    categoria: "oab",
    ordem: 117,
    description: "CTN, espécies tributárias, obrigação, crédito tributário, ICMS, ISS, IR — ~8%.",
  },
  {
    name: "Direito Empresarial (OAB)",
    categoria: "oab",
    ordem: 118,
    description: "Direito societário, falência, recuperação judicial, títulos de crédito — ~7%.",
  },
  {
    name: "Direito Administrativo (OAB)",
    categoria: "oab",
    ordem: 119,
    description: "Atos administrativos, licitações, servidores, responsabilidade do Estado — ~8%.",
  },
  {
    name: "Peça Processual OAB 2ª Fase",
    categoria: "oab",
    ordem: 120,
    description: "Elaboração de peças: petição inicial, contestação, recurso, habeas corpus, mandado de segurança — área escolhida pelo candidato.",
  },

  // ── REVALIDA ──────────────────────────────────────────────────────────────────
  {
    name: "Clínica Médica (REVALIDA)",
    categoria: "revalida",
    ordem: 130,
    description: "Cardiologia, pneumologia, endocrinologia, gastroenterologia, nefrologia, doenças infecciosas — maior peso.",
  },
  {
    name: "Cirurgia Geral (REVALIDA)",
    categoria: "revalida",
    ordem: 131,
    description: "Abdome agudo, trauma, cirurgia digestiva, hérnias, pré e pós-operatório.",
  },
  {
    name: "Pediatria (REVALIDA)",
    categoria: "revalida",
    ordem: 132,
    description: "Crescimento e desenvolvimento, neonatologia, doenças prevalentes na infância, imunizações.",
  },
  {
    name: "Ginecologia e Obstetrícia (REVALIDA)",
    categoria: "revalida",
    ordem: 133,
    description: "Pré-natal, parto, puerpério, doenças ginecológicas, planejamento familiar.",
  },
  {
    name: "Saúde Coletiva e MFC (REVALIDA)",
    categoria: "revalida",
    ordem: 134,
    description: "Medicina de Família e Comunidade, epidemiologia, vigilância em saúde, SUS, PNAB.",
  },
  {
    name: "OSCE — Estações Práticas (REVALIDA)",
    categoria: "revalida",
    ordem: 135,
    description: "Etapa 2: anamnese, exame físico, comunicação médico-paciente, conduta diagnóstica e terapêutica em estações simuladas.",
  },

  // ── CFC ───────────────────────────────────────────────────────────────────────
  {
    name: "Contabilidade Geral (CFC)",
    categoria: "cfc",
    ordem: 140,
    description: "Plano de contas, lançamentos, balanço patrimonial, DRE, demonstrações contábeis — base do exame.",
  },
  {
    name: "Análise das Demonstrações Contábeis (CFC)",
    categoria: "cfc",
    ordem: 141,
    description: "Índices de liquidez, endividamento, rentabilidade, EBITDA — interpretação econômico-financeira.",
  },
  {
    name: "Teoria da Contabilidade (CFC)",
    categoria: "cfc",
    ordem: 142,
    description: "Postulados, princípios, convenções contábeis, estrutura conceitual CPC.",
  },
  {
    name: "Contabilidade de Custos (CFC)",
    categoria: "cfc",
    ordem: 143,
    description: "Custeio por absorção, variável, ABC, ponto de equilíbrio, margem de contribuição.",
  },
  {
    name: "Auditoria Contábil (CFC)",
    categoria: "cfc",
    ordem: 144,
    description: "NBC TA — planejamento, execução, evidências, risco de auditoria, parecer.",
  },
  {
    name: "Perícia Contábil (CFC)",
    categoria: "cfc",
    ordem: 145,
    description: "NBC TP — perícia judicial e extrajudicial, laudo, arbitragem.",
  },
  {
    name: "Normas Brasileiras de Contabilidade (CFC)",
    categoria: "cfc",
    ordem: 146,
    description: "NBCs profissionais e técnicas, CPCs (Pronunciamentos Contábeis), convergência ao IFRS.",
  },
  {
    name: "Ética Profissional Contábil (CFC)",
    categoria: "cfc",
    ordem: 147,
    description: "Código de Ética do Contabilista, deveres e proibições, penalidades.",
  },
];

async function main() {
  console.log("🌱 Seed de Matérias — Aprovai\n");
  console.log(`   Total a processar: ${MATERIAS.length} matérias\n`);

  let criadas = 0;
  let atualizadas = 0;
  let erros = 0;

  for (const materia of MATERIAS) {
    const slug = toSlug(materia.name);

    const { data: existing } = await db
      .from("Subject")
      .select("id, name")
      .eq("slug", slug)
      .maybeSingle();

    if (existing) {
      const { error } = await db
        .from("Subject")
        .update({
          name: materia.name,
          description: materia.description,
          categoria: materia.categoria,
          ordem: materia.ordem,
        })
        .eq("id", existing.id);

      if (error) {
        console.error(`  ❌ Erro ao atualizar "${materia.name}": ${error.message}`);
        erros++;
      } else {
        console.log(`  ♻️  Atualizado: ${materia.name} [${materia.categoria}]`);
        atualizadas++;
      }
    } else {
      const { error } = await db.from("Subject").insert({
        id: crypto.randomUUID(),
        name: materia.name,
        slug,
        description: materia.description,
        categoria: materia.categoria,
        ordem: materia.ordem,
        createdAt: new Date().toISOString(),
      });

      if (error) {
        console.error(`  ❌ Erro ao criar "${materia.name}": ${error.message}`);
        erros++;
      } else {
        console.log(`  🆕 Criado:    ${materia.name} [${materia.categoria}]`);
        criadas++;
      }
    }
  }

  // Resumo por categoria
  console.log("\n📊 Resumo por categoria:");
  const porCategoria = MATERIAS.reduce((acc, m) => {
    acc[m.categoria] = (acc[m.categoria] ?? 0) + 1;
    return acc;
  }, {});
  Object.entries(porCategoria)
    .sort(([, a], [, b]) => b - a)
    .forEach(([cat, count]) =>
      console.log(`   ${cat.padEnd(12)} ${count} matérias`)
    );

  console.log(`\n✅ ${criadas} criadas  ♻️  ${atualizadas} atualizadas  ❌ ${erros} erros`);

  // Valida total no banco
  const { count } = await db
    .from("Subject")
    .select("id", { count: "exact", head: true });
  console.log(`\n📚 Total de matérias no banco: ${count}`);
}

main().catch(console.error);
