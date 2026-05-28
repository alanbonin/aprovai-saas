/**
 * seed-subjects-novas-categorias.mjs
 * Cria matérias para as 8 novas categorias de agentes:
 *   bancos-publicos, petrobras-estatais, tecnologia-informacao,
 *   controle-auditoria, previdencia-social, militar, diplomacia, ambiental-agro
 *
 * Uso: node --env-file=.env scripts/seed-subjects-novas-categorias.mjs
 */
import { createClient } from "@supabase/supabase-js";
try { const { config } = await import("dotenv"); config({ path: ".env.local" }); } catch {}

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

function toSlug(name) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const MATERIAS = [

  // ══════════════════════════════════════════════════════════════════════════
  // BANCOS PÚBLICOS — BB, CEF, BNB, BASA, BRDE, Banrisul, etc.
  // ══════════════════════════════════════════════════════════════════════════
  {
    name: "Língua Portuguesa (Bancos)",
    categoria: "bancos-publicos",
    ordem: 200,
    description: "Interpretação de texto, gramática, ortografia, morfologia, sintaxe — cobrado em todos os concursos bancários.",
  },
  {
    name: "Raciocínio Lógico e Quantitativo",
    categoria: "bancos-publicos",
    ordem: 201,
    description: "Lógica proposicional, sequências, probabilidade, combinatória e estatística descritiva — peso alto no CESGRANRIO e FCC.",
  },
  {
    name: "Matemática Financeira (Bancos)",
    categoria: "bancos-publicos",
    ordem: 202,
    description: "Juros simples e compostos, desconto, amortização (SAC, SAF, SAM), TIR, VPL e análise de investimentos.",
  },
  {
    name: "Conhecimentos Bancários e SFN",
    categoria: "bancos-publicos",
    ordem: 203,
    description: "Sistema Financeiro Nacional, CMN, BACEN, Resolução BCB, produtos bancários, crédito, câmbio, Pix e open banking.",
  },
  {
    name: "Mercado de Capitais e Investimentos",
    categoria: "bancos-publicos",
    ordem: 204,
    description: "Ações, debêntures, fundos de investimento (CVM/ANBIMA), CDB, LCA, LCI, COE, tesouro direto e previdência privada.",
  },
  {
    name: "Legislação Bancária e Compliance",
    categoria: "bancos-publicos",
    ordem: 205,
    description: "Lei de sigilo bancário (LC 105/2001), lavagem de dinheiro (Lei 9.613/98), prevenção à fraude, KYC e LGPD no setor bancário.",
  },
  {
    name: "Atendimento e Técnicas de Vendas",
    categoria: "bancos-publicos",
    ordem: 206,
    description: "Relacionamento com o cliente, cross-selling, up-selling, qualidade no atendimento, SAC e ouvidoria.",
  },
  {
    name: "Noções de Informática (Bancos)",
    categoria: "bancos-publicos",
    ordem: 207,
    description: "Segurança digital bancária, internet banking, aplicativos financeiros, pacote Office e conceitos básicos de redes.",
  },
  {
    name: "Atualidades do Mercado Financeiro",
    categoria: "bancos-publicos",
    ordem: 208,
    description: "Open finance, fintechs, criptoativos, ESG bancário, Drex (CBDC), regulação recente do BACEN e tendências do setor.",
  },

  // ══════════════════════════════════════════════════════════════════════════
  // PETROBRAS E ESTATAIS FEDERAIS
  // ══════════════════════════════════════════════════════════════════════════
  {
    name: "Língua Portuguesa (Estatais)",
    categoria: "petrobras-estatais",
    ordem: 210,
    description: "Interpretação de texto, gramática e redação — cobrado em todos os concursos das estatais federais.",
  },
  {
    name: "Inglês Técnico",
    categoria: "petrobras-estatais",
    ordem: 211,
    description: "Leitura e interpretação de textos técnicos em inglês, vocabulário da área, gramática aplicada.",
  },
  {
    name: "Raciocínio Lógico (Estatais)",
    categoria: "petrobras-estatais",
    ordem: 212,
    description: "Lógica proposicional, sequências, conjuntos, probabilidade e estatística.",
  },
  {
    name: "Lei das Estatais (Lei 13.303/2016)",
    categoria: "petrobras-estatais",
    ordem: 213,
    description: "Estatuto jurídico das empresas estatais, governança corporativa, licitações específicas, programa de integridade (compliance).",
  },
  {
    name: "Ética e Compliance Corporativo",
    categoria: "petrobras-estatais",
    ordem: 214,
    description: "Código de ética das estatais, programa anticorrupção (Lei 12.846/2013), conflito de interesses e canal de denúncias.",
  },
  {
    name: "Conhecimentos de Petróleo e Gás",
    categoria: "petrobras-estatais",
    ordem: 215,
    description: "Cadeia produtiva do petróleo, exploração, refino, distribuição, pré-sal, legislação do setor (ANP) e biocombustíveis.",
  },
  {
    name: "Engenharia de Petróleo (Específico)",
    categoria: "petrobras-estatais",
    ordem: 216,
    description: "Reservatórios, perfuração, completação, produção, escoamento e processamento — para cargos técnicos de Engenharia.",
  },
  {
    name: "Administração e Gestão Empresarial",
    categoria: "petrobras-estatais",
    ordem: 217,
    description: "Planejamento estratégico, gestão de processos, balanced scorecard, gestão de contratos e governança corporativa.",
  },
  {
    name: "Contabilidade e Finanças (Estatais)",
    categoria: "petrobras-estatais",
    ordem: 218,
    description: "Contabilidade societária, IFRS, análise financeira, demonstrações contábeis e CVM/Lei das S.A.",
  },
  {
    name: "Segurança, Saúde e Meio Ambiente (HSE)",
    categoria: "petrobras-estatais",
    ordem: 219,
    description: "NRs aplicáveis ao setor de energia, SMS (segurança, meio ambiente e saúde), OHSAS 18001 e gestão de riscos operacionais.",
  },
  {
    name: "TI para Estatais",
    categoria: "petrobras-estatais",
    ordem: 220,
    description: "Segurança da informação, LGPD, sistemas de gestão ERP (SAP), arquitetura de dados e governança de TI corporativa.",
  },

  // ══════════════════════════════════════════════════════════════════════════
  // TECNOLOGIA DA INFORMAÇÃO — concursos TI: STJ, TCU, Receita, Banco Central…
  // ══════════════════════════════════════════════════════════════════════════
  {
    name: "Algoritmos e Estruturas de Dados (TI)",
    categoria: "tecnologia-informacao",
    ordem: 230,
    description: "Lógica de programação, arrays, listas ligadas, pilhas, filas, árvores, grafos, ordenação e complexidade algorítmica (Big-O).",
  },
  {
    name: "Banco de Dados e SQL",
    categoria: "tecnologia-informacao",
    ordem: 231,
    description: "Modelagem relacional, normalização, SQL (DDL/DML/DCL), índices, transações ACID, NoSQL (MongoDB, Redis, Cassandra).",
  },
  {
    name: "Redes de Computadores (TI)",
    categoria: "tecnologia-informacao",
    ordem: 232,
    description: "Modelo OSI e TCP/IP, endereçamento IP (IPv4/IPv6), sub-redes, protocolos (HTTP/S, DNS, SMTP, SSH, FTP), roteamento e switching.",
  },
  {
    name: "Segurança da Informação (TI)",
    categoria: "tecnologia-informacao",
    ordem: 233,
    description: "Criptografia (simétrica, assimétrica, hashing), PKI, autenticação multifator, firewall, IDS/IPS, OWASP, pentest e LGPD.",
  },
  {
    name: "Engenharia de Software (TI)",
    categoria: "tecnologia-informacao",
    ordem: 234,
    description: "Ciclo de vida (cascata, espiral, ágil), Scrum, Kanban, UML, padrões de projeto (GoF), arquitetura de software e testes.",
  },
  {
    name: "Sistemas Operacionais",
    categoria: "tecnologia-informacao",
    ordem: 235,
    description: "Linux (administração, shell script, permissões), Windows Server, gerenciamento de processos, memória, sistemas de arquivos e virtualização.",
  },
  {
    name: "Arquitetura e Infraestrutura de TI",
    categoria: "tecnologia-informacao",
    ordem: 236,
    description: "Servidores, storage, virtualização (VMware, Hyper-V), contêineres (Docker, Kubernetes), cloud computing (AWS, Azure, GCP) e alta disponibilidade.",
  },
  {
    name: "Governança e Gestão de TI",
    categoria: "tecnologia-informacao",
    ordem: 237,
    description: "ITIL v4 (gestão de serviços), COBIT 2019, PMBOK, gestão de riscos de TI, auditoria de TI e controles internos.",
  },
  {
    name: "Desenvolvimento e APIs",
    categoria: "tecnologia-informacao",
    ordem: 238,
    description: "Desenvolvimento web (HTML/CSS/JS), APIs REST/GraphQL, microsserviços, DevOps (CI/CD), controle de versão (Git) e testes automatizados.",
  },
  {
    name: "Inteligência Artificial e Dados",
    categoria: "tecnologia-informacao",
    ordem: 239,
    description: "Machine learning, deep learning, big data (Hadoop, Spark), ETL, data warehouse, Business Intelligence e análise estatística.",
  },
  {
    name: "LGPD e Conformidade Digital",
    categoria: "tecnologia-informacao",
    ordem: 240,
    description: "Lei 13.709/2018 (LGPD), bases legais de tratamento, ANPD, direitos dos titulares, DPO, privacy by design e incidentes de segurança.",
  },
  {
    name: "Raciocínio Lógico (TI)",
    categoria: "tecnologia-informacao",
    ordem: 241,
    description: "Lógica proposicional e predicativa, tabelas-verdade, equivalências lógicas, grafos e teoria dos conjuntos — cobrado em concursos de TI.",
  },

  // ══════════════════════════════════════════════════════════════════════════
  // CONTROLE E AUDITORIA — TCU, TCE, CGU, ANATEL, AGU fiscalização
  // ══════════════════════════════════════════════════════════════════════════
  {
    name: "Direito Constitucional (Controle)",
    categoria: "controle-auditoria",
    ordem: 250,
    description: "CF/88 aplicada ao controle externo: arts. 70–75, competência do TCU, Tribunal de Contas e o princípio da moralidade.",
  },
  {
    name: "Direito Administrativo (Controle)",
    categoria: "controle-auditoria",
    ordem: 251,
    description: "Atos administrativos, licitações (Lei 14.133/21), contratos, concessões, servidores e improbidade — foco em controle.",
  },
  {
    name: "Controle Externo e TCU",
    categoria: "controle-auditoria",
    ordem: 252,
    description: "Competências do TCU (Lei 8.443/92), fiscalização de contratos e concessões, tomada e prestação de contas, sanções e julgamento.",
  },
  {
    name: "Auditoria Governamental",
    categoria: "controle-auditoria",
    ordem: 253,
    description: "ISSAI, INTOSAI, normas de auditoria pública, auditoria de conformidade, operacional e de avaliação de programas de governo.",
  },
  {
    name: "Auditoria de TI (Governamental)",
    categoria: "controle-auditoria",
    ordem: 254,
    description: "Auditoria de sistemas, controles de TI, COBIT, ITIL, governança de TI no setor público e riscos digitais.",
  },
  {
    name: "Contabilidade Pública (Controle)",
    categoria: "controle-auditoria",
    ordem: 255,
    description: "PCASP, MCASP, SIAFI, reconhecimento de receitas e despesas, balanços públicos, dívida pública e prestação de contas.",
  },
  {
    name: "Finanças Públicas e Orçamento",
    categoria: "controle-auditoria",
    ordem: 256,
    description: "PPA, LDO, LOA, ciclo orçamentário, execução da despesa, controle fiscal, Lei de Responsabilidade Fiscal (LC 101/2000).",
  },
  {
    name: "Licitações e Contratos (Controle)",
    categoria: "controle-auditoria",
    ordem: 257,
    description: "Lei 14.133/21 — modalidades, fases, irregularidades mais cobradas em fiscalização, subdivisão e fracionamento ilegal.",
  },
  {
    name: "Controle Interno e Compliance Público",
    categoria: "controle-auditoria",
    ordem: 258,
    description: "COSO ERM, controle interno governamental, CGU, LAI (Lei 12.527/2011), LGPD na administração pública e governança.",
  },
  {
    name: "Língua Portuguesa (Controle)",
    categoria: "controle-auditoria",
    ordem: 259,
    description: "Interpretação e produção textual, gramática, redação de pareceres e relatórios de auditoria.",
  },
  {
    name: "Raciocínio Lógico (Controle)",
    categoria: "controle-auditoria",
    ordem: 260,
    description: "Lógica proposicional, argumentação, diagramas lógicos e raciocínio estatístico aplicado à análise de dados públicos.",
  },

  // ══════════════════════════════════════════════════════════════════════════
  // PREVIDÊNCIA SOCIAL — INSS, DATAPREV, MPS
  // ══════════════════════════════════════════════════════════════════════════
  {
    name: "Direito Previdenciário (INSS)",
    categoria: "previdencia-social",
    ordem: 270,
    description: "RGPS, RPPS, RPC; benefícios por incapacidade, aposentadorias, salário-maternidade, pensão por morte — Lei 8.213/91.",
  },
  {
    name: "Custeio da Previdência Social",
    categoria: "previdencia-social",
    ordem: 271,
    description: "Lei 8.212/91 — contribuições previdenciárias, INSS empregado e empregador, autônomos, empresas, tabelas e alíquotas.",
  },
  {
    name: "Reforma da Previdência (EC 103/2019)",
    categoria: "previdencia-social",
    ordem: 272,
    description: "Emenda Constitucional 103/2019 — novas regras de aposentadoria, pontos de transição, benefício de prestação continuada.",
  },
  {
    name: "Legislação Previdenciária Especial",
    categoria: "previdencia-social",
    ordem: 273,
    description: "LOAS (Lei 8.742/93), BPC, segurado especial, trabalhador rural, doméstico, MEI e regras de carência.",
  },
  {
    name: "Direito Administrativo (INSS)",
    categoria: "previdencia-social",
    ordem: 274,
    description: "Atos administrativos, processo administrativo (Lei 9.784/99), recursos no INSS e PAD — foco nas atividades do INSS.",
  },
  {
    name: "Língua Portuguesa (INSS)",
    categoria: "previdencia-social",
    ordem: 275,
    description: "Interpretação de texto, gramática, ortografia e redação oficial — cobrado pelo CESPE/CEBRASPE nas provas do INSS.",
  },
  {
    name: "Raciocínio Lógico (INSS)",
    categoria: "previdencia-social",
    ordem: 276,
    description: "Lógica proposicional, sequências, raciocínio analítico — cobrado no concurso do INSS (Técnico do Seguro Social).",
  },
  {
    name: "Informática (INSS)",
    categoria: "previdencia-social",
    ordem: 277,
    description: "Sistema operacional (Windows/Linux básico), pacote Office, internet, e-mail e noções de segurança da informação.",
  },
  {
    name: "Saúde e Segurança do Trabalho",
    categoria: "previdencia-social",
    ordem: 278,
    description: "NR-15 (insalubridade), NR-16 (periculosidade), PPP, nexo causal, acidente de trabalho e aposentadoria especial.",
  },

  // ══════════════════════════════════════════════════════════════════════════
  // MILITAR — Exército, Marinha, Aeronáutica, PMDF, Bombeiros
  // ══════════════════════════════════════════════════════════════════════════
  {
    name: "Matemática (Militar)",
    categoria: "militar",
    ordem: 280,
    description: "Aritmética, álgebra, geometria plana e espacial, trigonometria, análise combinatória, probabilidade e estatística.",
  },
  {
    name: "Física (Militar)",
    categoria: "militar",
    ordem: 281,
    description: "Mecânica (cinemática, dinâmica, gravitação), termodinâmica, eletromagnetismo, óptica e ondulatória — peso alto no EsPCEx e AFA.",
  },
  {
    name: "Química (Militar)",
    categoria: "militar",
    ordem: 282,
    description: "Química geral e inorgânica, química orgânica, físico-química, estequiometria e soluções.",
  },
  {
    name: "Biologia (Militar)",
    categoria: "militar",
    ordem: 283,
    description: "Citologia, genética, ecologia, fisiologia humana, evolução — cobrado em concursos da Marinha e Aeronáutica.",
  },
  {
    name: "Língua Portuguesa (Militar)",
    categoria: "militar",
    ordem: 284,
    description: "Interpretação de texto, gramática normativa, redação dissertativa — cobrado em todos os concursos militares.",
  },
  {
    name: "Língua Inglesa (Militar)",
    categoria: "militar",
    ordem: 285,
    description: "Inglês instrumental e técnico — leitura, gramática e vocabulário, com foco em textos militares e científicos.",
  },
  {
    name: "História e Geografia do Brasil (Militar)",
    categoria: "militar",
    ordem: 286,
    description: "História do Brasil (Colônia ao contemporâneo), geopolítica, fronteiras, Amazônia e regiões estratégicas.",
  },
  {
    name: "Legislação Militar",
    categoria: "militar",
    ordem: 287,
    description: "Estatuto dos Militares (Lei 6.880/80), RDE (Regulamento Disciplinar do Exército), regulamentos da Marinha e Aeronáutica, deveres e direitos.",
  },
  {
    name: "Direito Constitucional (Militar)",
    categoria: "militar",
    ordem: 288,
    description: "CF/88 aplicada às Forças Armadas, defesa nacional, estado de defesa e de sítio, forças auxiliares e Justiça Militar.",
  },
  {
    name: "Conhecimentos Gerais e Atualidades (Militar)",
    categoria: "militar",
    ordem: 289,
    description: "Conjuntura nacional e internacional, segurança pública, defesa nacional, questões ambientais e geopolítica global.",
  },

  // ══════════════════════════════════════════════════════════════════════════
  // DIPLOMACIA — CACD / Instituto Rio Branco
  // ══════════════════════════════════════════════════════════════════════════
  {
    name: "Língua Portuguesa (CACD)",
    categoria: "diplomacia",
    ordem: 290,
    description: "Interpretação de texto, gramática, redação dissertativa e relatório — avaliado em todas as fases do CACD.",
  },
  {
    name: "Língua Inglesa (CACD)",
    categoria: "diplomacia",
    ordem: 291,
    description: "Inglês avançado — leitura e interpretação de textos políticos, econômicos e jurídicos; gramática e vocabulário diplomático.",
  },
  {
    name: "Língua Espanhola (CACD)",
    categoria: "diplomacia",
    ordem: 292,
    description: "Espanhol avançado — leitura, interpretação e produção textual com foco em textos de política exterior e relações internacionais.",
  },
  {
    name: "Língua Francesa (CACD)",
    categoria: "diplomacia",
    ordem: 293,
    description: "Francês — leitura e compreensão de textos diplomáticos e jornalísticos; gramática e vocabulário de política internacional.",
  },
  {
    name: "História do Brasil (CACD)",
    categoria: "diplomacia",
    ordem: 294,
    description: "Formação do Brasil, política externa brasileira, Barão do Rio Branco, Itamaraty, relações internacionais históricas e contemporâneas.",
  },
  {
    name: "História Mundial e Relações Internacionais",
    categoria: "diplomacia",
    ordem: 295,
    description: "Ordem internacional pós-1945, Guerra Fria, pós-bipolarismo, ONU, G20, BRICS, conflitos atuais e geopolítica contemporânea.",
  },
  {
    name: "Política Internacional e Teoria das RI",
    categoria: "diplomacia",
    ordem: 296,
    description: "Teoria das Relações Internacionais (realismo, liberalismo, construtivismo), multilateralismo, soft power e diplomacia preventiva.",
  },
  {
    name: "Direito Internacional Público",
    categoria: "diplomacia",
    ordem: 297,
    description: "Fontes do DI, sujeitos, responsabilidade internacional, tratados (Convenção de Viena), solução de controvérsias e direito humanitário.",
  },
  {
    name: "Direito Internacional Privado",
    categoria: "diplomacia",
    ordem: 298,
    description: "LINDB, conflitos de leis no espaço, nacionalidade, domicílio, cooperação jurídica internacional e MCCA.",
  },
  {
    name: "Economia Política Internacional",
    categoria: "diplomacia",
    ordem: 299,
    description: "Comércio internacional (OMC, acordos bilaterais), finanças internacionais (FMI, Banco Mundial), desenvolvimento e integração regional.",
  },
  {
    name: "Direito Constitucional (CACD)",
    categoria: "diplomacia",
    ordem: 300,
    description: "CF/88 — especialmente direitos fundamentais, organização do Estado, competências da União e tratados internacionais.",
  },
  {
    name: "Noções de Economia (CACD)",
    categoria: "diplomacia",
    ordem: 301,
    description: "Microeconomia, macroeconomia, política fiscal e monetária, indicadores econômicos, balanço de pagamentos.",
  },

  // ══════════════════════════════════════════════════════════════════════════
  // AMBIENTAL E AGRONEGÓCIO — IBAMA, ICMBio, MAPA, EMBRAPA, FUNAI
  // ══════════════════════════════════════════════════════════════════════════
  {
    name: "Legislação Ambiental",
    categoria: "ambiental-agro",
    ordem: 310,
    description: "Código Florestal (Lei 12.651/2012), PNMA (Lei 6.938/81), crimes ambientais (Lei 9.605/98), licenciamento ambiental e EIA/RIMA.",
  },
  {
    name: "Sistema Nacional de Unidades de Conservação (SNUC)",
    categoria: "ambiental-agro",
    ordem: 311,
    description: "Lei 9.985/2000 — categorias de UCs, plano de manejo, zonas de amortecimento, mosaicos e corredores ecológicos.",
  },
  {
    name: "Ciências Ambientais e Ecologia",
    categoria: "ambiental-agro",
    ordem: 312,
    description: "Ecologia de ecossistemas, biomas brasileiros, biodiversidade, mudanças climáticas, pegada de carbono, Acordo de Paris e Convenção da Biodiversidade.",
  },
  {
    name: "Recursos Hídricos e Saneamento",
    categoria: "ambiental-agro",
    ordem: 313,
    description: "Política Nacional de Recursos Hídricos (Lei 9.433/97), ANA, outorga, cobrança pelo uso, saneamento básico (Lei 11.445/07).",
  },
  {
    name: "Defesa Agropecuária e Sanidade Animal",
    categoria: "ambiental-agro",
    ordem: 314,
    description: "Vigilância agropecuária, controle de pragas e doenças animais, inspeção de produtos de origem animal (SIF) e MAPA.",
  },
  {
    name: "Agronegócio e Política Agrícola",
    categoria: "ambiental-agro",
    ordem: 315,
    description: "Cadeia produtiva do agronegócio, crédito rural (PRONAF, PRONAMP), seguro rural, CONAB, política de preços mínimos e reforma agrária.",
  },
  {
    name: "Agroquímica e Defensivos Agrícolas",
    categoria: "ambiental-agro",
    ordem: 316,
    description: "Registro e uso de agrotóxicos (Lei 7.802/89), MIP (manejo integrado de pragas), fertilizantes, solos e nutrição de plantas.",
  },
  {
    name: "Fiscalização Ambiental e Licenciamento",
    categoria: "ambiental-agro",
    ordem: 317,
    description: "Atuação do IBAMA e órgãos estaduais, auto de infração ambiental, embargos, TAC e termos de compromisso.",
  },
  {
    name: "Direito Administrativo (Ambiental)",
    categoria: "ambiental-agro",
    ordem: 318,
    description: "Atos e processos administrativos no âmbito do IBAMA, MAPA, ICMBio e FUNAI — licitações, contratos e servidores.",
  },
  {
    name: "Língua Portuguesa (Ambiental)",
    categoria: "ambiental-agro",
    ordem: 319,
    description: "Interpretação de texto, gramática, redação oficial e relatórios técnicos ambientais.",
  },
  {
    name: "Raciocínio Lógico (Ambiental)",
    categoria: "ambiental-agro",
    ordem: 320,
    description: "Lógica proposicional, conjuntos, análise estatística de dados ambientais e probabilidade.",
  },
  {
    name: "Noções de Informática (Ambiental)",
    categoria: "ambiental-agro",
    ordem: 321,
    description: "Geoprocessamento básico, SIG/GIS, sensoriamento remoto, uso de sistemas de informação ambiental e Office.",
  },
];

// ── Execução ─────────────────────────────────────────────────────────────────
async function main() {
  console.log("🌱 Seed de Matérias — Novas 8 Categorias\n");
  console.log(`   Total a processar: ${MATERIAS.length} matérias\n`);

  let criadas = 0;
  let atualizadas = 0;
  let erros = 0;

  for (const materia of MATERIAS) {
    const slug = toSlug(materia.name);

    const { data: existing } = await db
      .from("Subject")
      .select("id, name, categoria")
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
  Object.entries(porCategoria).forEach(([cat, count]) =>
    console.log(`   ${cat.padEnd(24)} ${count} matérias`)
  );

  console.log(`\n✅ ${criadas} criadas  ♻️  ${atualizadas} atualizadas  ❌ ${erros} erros`);

  // Total no banco
  const { count } = await db
    .from("Subject")
    .select("id", { count: "exact", head: true });
  console.log(`\n📚 Total de matérias no banco agora: ${count}`);
}

main().catch(console.error);
