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
          updatedAt: new Date().toISOString(),
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
        updatedAt: new Date().toISOString(),
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
