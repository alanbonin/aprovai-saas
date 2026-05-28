/**
 * Seed: Tópicos / Assuntos por Matéria
 * Uso: node scripts/seed-topics.mjs
 *
 * Estrutura: Subject (matéria) → Topic (assunto) → Question (questão)
 * Slugs mapeados conforme slugs reais do banco de dados.
 */
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

try { const { config } = await import("dotenv"); config({ path: ".env" }); } catch {}

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ─── Mapa: slug_real_do_banco → lista de tópicos ──────────────────────────────
const TOPICS_BY_SUBJECT = {

  // ══ BANCÁRIO ══════════════════════════════════════════════════════════════
  "conhecimentos-bancarios": [
    { slug: "sfn-estrutura", name: "Estrutura do SFN (CMN, BACEN, CVM, SUSEP)", ordem: 1 },
    { slug: "produtos-bancarios", name: "Produtos e Serviços Bancários", ordem: 2 },
    { slug: "credito-financiamento", name: "Crédito e Financiamento", ordem: 3 },
    { slug: "sigilo-bancario", name: "Sigilo Bancário e LC 105/01", ordem: 4 },
    { slug: "lavagem-dinheiro", name: "Lavagem de Dinheiro (Lei 9.613/98)", ordem: 5 },
    { slug: "lgpd-bancario", name: "LGPD no Setor Financeiro", ordem: 6 },
    { slug: "open-finance-pix", name: "Open Finance e PIX", ordem: 7 },
    { slug: "prevencao-fraude", name: "Prevenção e Combate a Fraudes", ordem: 8 },
  ],
  "matematica-financeira": [
    { slug: "juros-simples", name: "Juros Simples", ordem: 1 },
    { slug: "juros-compostos", name: "Juros Compostos", ordem: 2 },
    { slug: "taxa-equivalente", name: "Taxas Equivalentes e Nominais", ordem: 3 },
    { slug: "amortizacao", name: "Sistemas de Amortização (SAC, Price)", ordem: 4 },
    { slug: "desconto", name: "Desconto Comercial e Racional", ordem: 5 },
    { slug: "vp-vf-tir", name: "VP, VF, TIR e VPL", ordem: 6 },
  ],
  "vendas-e-atendimento-bancario": [
    { slug: "tecnicas-vendas", name: "Técnicas de Vendas e Negociação", ordem: 1 },
    { slug: "atendimento-cliente", name: "Atendimento ao Cliente", ordem: 2 },
    { slug: "marketing-bancario", name: "Marketing Bancário", ordem: 3 },
    { slug: "crm", name: "Gestão do Relacionamento com Cliente (CRM)", ordem: 4 },
  ],
  "politica-monetaria-e-cambio": [
    { slug: "politica-monetaria", name: "Instrumentos de Política Monetária", ordem: 1 },
    { slug: "taxa-selic", name: "Taxa SELIC e Operações de Mercado Aberto", ordem: 2 },
    { slug: "mercado-cambial", name: "Mercado Cambial e Balanço de Pagamentos", ordem: 3 },
    { slug: "inflacao", name: "Inflação e Metas de Inflação", ordem: 4 },
    { slug: "copom", name: "COPOM e Decisões de Política Monetária", ordem: 5 },
  ],
  "mercado-de-capitais": [
    { slug: "bolsa-valores", name: "Bolsa de Valores e Ações", ordem: 1 },
    { slug: "fundos-investimento", name: "Fundos de Investimento", ordem: 2 },
    { slug: "renda-fixa", name: "Renda Fixa (CDB, LCI, Debêntures)", ordem: 3 },
    { slug: "derivativos", name: "Derivativos (Opções, Futuros, Swaps)", ordem: 4 },
    { slug: "cvm-regulacao", name: "CVM e Regulação do Mercado", ordem: 5 },
  ],

  // ══ BANCO CENTRAL ═════════════════════════════════════════════════════════
  "financas-publicas": [
    { slug: "teoria-financas", name: "Teoria das Finanças Públicas", ordem: 1 },
    { slug: "orcamento-uniao", name: "Orçamento da União — PPA, LDO, LOA", ordem: 2 },
    { slug: "divida-publica", name: "Dívida Pública e Política Fiscal", ordem: 3 },
    { slug: "mercado-monetario", name: "Mercado Monetário e Política Monetária", ordem: 4 },
    { slug: "sfn", name: "Sistema Financeiro Nacional — SFN", ordem: 5 },
    { slug: "cambio-bop", name: "Câmbio e Balanço de Pagamentos", ordem: 6 },
    { slug: "lrf", name: "Lei de Responsabilidade Fiscal (LRF)", ordem: 7 },
  ],
  "direito-constitucional-bc": [
    { slug: "principios-fundamentais", name: "Princípios e Direitos Fundamentais", ordem: 1 },
    { slug: "organizacao-estado", name: "Organização do Estado", ordem: 2 },
    { slug: "poder-judiciario", name: "Poder Judiciário e Controle", ordem: 3 },
    { slug: "bacen-cf", name: "BACEN na Constituição Federal", ordem: 4 },
  ],
  "raciocinio-logico-bc": [
    { slug: "logica-proposicional", name: "Lógica Proposicional", ordem: 1 },
    { slug: "logica-quantificadores", name: "Quantificadores e Silogismos", ordem: 2 },
    { slug: "raciocinio-matematico", name: "Raciocínio Matemático", ordem: 3 },
    { slug: "estatistica", name: "Estatística e Probabilidade", ordem: 4 },
    { slug: "diagramas", name: "Diagramas e Conjuntos", ordem: 5 },
  ],
  "lingua-portuguesa-bc": [
    { slug: "interpretacao-texto", name: "Interpretação de Texto", ordem: 1 },
    { slug: "morfologia-sintaxe", name: "Morfologia e Sintaxe", ordem: 2 },
    { slug: "concordancia", name: "Concordância Verbal e Nominal", ordem: 3 },
    { slug: "redacao-oficial", name: "Redação Oficial e Correspondências", ordem: 4 },
  ],

  // ══ CFC ═══════════════════════════════════════════════════════════════════
  "contabilidade-geral-cfc": [
    { slug: "patrimonio", name: "Patrimônio e Equação Patrimonial", ordem: 1 },
    { slug: "escrituracao", name: "Escrituração Contábil", ordem: 2 },
    { slug: "balancete", name: "Balancete de Verificação", ordem: 3 },
    { slug: "balanco-patrimonial", name: "Balanço Patrimonial", ordem: 4 },
    { slug: "dre", name: "DRE — Demonstração do Resultado do Exercício", ordem: 5 },
    { slug: "dlpa-dmpl", name: "DLPA e DMPL", ordem: 6 },
    { slug: "dfc", name: "DFC — Demonstração dos Fluxos de Caixa", ordem: 7 },
  ],
  "auditoria-contabil-cfc": [
    { slug: "tipos-auditoria", name: "Tipos e Modalidades de Auditoria", ordem: 1 },
    { slug: "planejamento", name: "Planejamento da Auditoria", ordem: 2 },
    { slug: "risco-auditoria", name: "Risco de Auditoria e Materialidade", ordem: 3 },
    { slug: "evidencias", name: "Evidências e Procedimentos", ordem: 4 },
    { slug: "relatorio", name: "Relatório do Auditor Independente", ordem: 5 },
    { slug: "controles-internos", name: "Avaliação de Controles Internos", ordem: 6 },
    { slug: "nbc-ta", name: "NBC TA — Normas de Auditoria Independente", ordem: 7 },
  ],
  "etica-profissional-contabil-cfc": [
    { slug: "cfc-estrutura", name: "CFC — Estrutura e Organização", ordem: 1 },
    { slug: "codigo-etica", name: "Código de Ética do Contabilista (Res. 1307/10)", ordem: 2 },
    { slug: "responsabilidade", name: "Responsabilidade do Contabilista", ordem: 3 },
    { slug: "penalidades", name: "Penalidades e Processo Ético", ordem: 4 },
  ],
  "analise-das-demonstracoes-contabeis-cfc": [
    { slug: "indicadores-liquidez", name: "Índices de Liquidez", ordem: 1 },
    { slug: "indicadores-rentabilidade", name: "Índices de Rentabilidade e Lucratividade", ordem: 2 },
    { slug: "indicadores-endividamento", name: "Índices de Endividamento e Estrutura", ordem: 3 },
    { slug: "analise-horizontal-vertical", name: "Análise Horizontal e Vertical", ordem: 4 },
    { slug: "ebitda", name: "EBITDA e Indicadores de Geração de Caixa", ordem: 5 },
  ],
  "contabilidade-de-custos-cfc": [
    { slug: "custeio-absorcao", name: "Custeio por Absorção", ordem: 1 },
    { slug: "custeio-variavel", name: "Custeio Variável e Margem de Contribuição", ordem: 2 },
    { slug: "custeio-abc", name: "Custeio ABC (Activity Based Costing)", ordem: 3 },
    { slug: "ponto-equilibrio", name: "Ponto de Equilíbrio", ordem: 4 },
    { slug: "formacao-preco", name: "Formação de Preço de Venda", ordem: 5 },
  ],
  "normas-brasileiras-de-contabilidade-cfc": [
    { slug: "cpc-conceituais", name: "CPC 00 — Estrutura Conceitual", ordem: 1 },
    { slug: "cpc-receitas", name: "CPC 47 — Receita de Contratos com Clientes", ordem: 2 },
    { slug: "cpc-arrendamento", name: "CPC 06 — Arrendamento Mercantil (IFRS 16)", ordem: 3 },
    { slug: "cpc-estoques", name: "CPC 16 — Estoques", ordem: 4 },
    { slug: "nbc-tg", name: "NBC TG — Normas Técnicas de Contabilidade", ordem: 5 },
  ],
  "pericia-contabil-cfc": [
    { slug: "pericia-judicial", name: "Perícia Judicial e Extrajudicial", ordem: 1 },
    { slug: "laudo-pericial", name: "Laudo Pericial Contábil", ordem: 2 },
    { slug: "quesitos", name: "Quesitos e Assistente Técnico", ordem: 3 },
    { slug: "nbc-pp", name: "NBC PP 01 — Normas de Perícia", ordem: 4 },
  ],
  "teoria-da-contabilidade-cfc": [
    { slug: "postulados", name: "Postulados, Princípios e Convenções", ordem: 1 },
    { slug: "regime-competencia", name: "Regime de Competência e Caixa", ordem: 2 },
    { slug: "conceitos-ativos-passivos", name: "Conceitos de Ativos, Passivos e PL", ordem: 3 },
    { slug: "mensuração", name: "Mensuração e Reconhecimento", ordem: 4 },
  ],

  // ══ DIREITO ═══════════════════════════════════════════════════════════════
  "direito-penal": [
    { slug: "teoria-crime", name: "Teoria do Crime (Tipicidade, Ilicitude, Culpabilidade)", ordem: 1 },
    { slug: "iter-criminis", name: "Iter Criminis — Tentativa, Consumação, Desistência", ordem: 2 },
    { slug: "concurso-pessoas", name: "Concurso de Pessoas (Autoria e Participação)", ordem: 3 },
    { slug: "penas", name: "Penas — Tipos, Dosimetria e Substituição", ordem: 4 },
    { slug: "crimes-pessoa", name: "Crimes Contra a Pessoa", ordem: 5 },
    { slug: "crimes-patrimonio", name: "Crimes Contra o Patrimônio", ordem: 6 },
    { slug: "crimes-administracao", name: "Crimes Contra a Administração Pública", ordem: 7 },
    { slug: "extincao-punibilidade", name: "Extinção da Punibilidade", ordem: 8 },
    { slug: "legislacao-penal-especial", name: "Legislação Penal Especial", ordem: 9 },
  ],
  "direito-civil": [
    { slug: "lei-pessoas", name: "Lei Civil e Pessoas Físicas/Jurídicas", ordem: 1 },
    { slug: "negocios-juridicos", name: "Negócios Jurídicos e Defeitos", ordem: 2 },
    { slug: "obrigacoes", name: "Obrigações — Espécies e Extinção", ordem: 3 },
    { slug: "contratos", name: "Contratos em Espécie", ordem: 4 },
    { slug: "responsabilidade-civil", name: "Responsabilidade Civil", ordem: 5 },
    { slug: "direitos-reais", name: "Direitos Reais — Propriedade e Posse", ordem: 6 },
    { slug: "familia", name: "Direito de Família", ordem: 7 },
    { slug: "sucessoes", name: "Direito das Sucessões", ordem: 8 },
  ],
  "direito-administrativo": [
    { slug: "principios", name: "Princípios Administrativos (LIMPE + implícitos)", ordem: 1 },
    { slug: "atos-administrativos", name: "Atos Administrativos", ordem: 2 },
    { slug: "poderes", name: "Poderes da Administração", ordem: 3 },
    { slug: "licitacoes-14133", name: "Licitações e Contratos — Lei 14.133/21", ordem: 4 },
    { slug: "agentes-publicos", name: "Agentes Públicos e Servidores", ordem: 5 },
    { slug: "responsabilidade-estado", name: "Responsabilidade Civil do Estado", ordem: 6 },
    { slug: "improbidade", name: "Improbidade Administrativa (Lei 8.429/92)", ordem: 7 },
    { slug: "processo-adm", name: "Processo Administrativo (Lei 9.784/99)", ordem: 8 },
    { slug: "bens-publicos", name: "Bens Públicos", ordem: 9 },
  ],
  "direito-constitucional": [
    { slug: "principios-fundamentais", name: "Princípios e Fundamentos da República", ordem: 1 },
    { slug: "direitos-fundamentais", name: "Direitos e Garantias Fundamentais", ordem: 2 },
    { slug: "organizacao-estado", name: "Organização do Estado (art. 18-43)", ordem: 3 },
    { slug: "poder-legislativo", name: "Poder Legislativo", ordem: 4 },
    { slug: "poder-executivo", name: "Poder Executivo", ordem: 5 },
    { slug: "poder-judiciario", name: "Poder Judiciário e MP", ordem: 6 },
    { slug: "controle-constitucionalidade", name: "Controle de Constitucionalidade", ordem: 7 },
    { slug: "ordem-social", name: "Ordem Econômica e Social", ordem: 8 },
  ],
  "direito-tributario": [
    { slug: "conceito-tributo", name: "Conceito e Espécies de Tributos", ordem: 1 },
    { slug: "competencia-tributaria", name: "Competência Tributária", ordem: 2 },
    { slug: "obrigacao-tributaria", name: "Obrigação e Crédito Tributário", ordem: 3 },
    { slug: "exclusao-credito", name: "Exclusão do Crédito (Isenção, Anistia)", ordem: 4 },
    { slug: "impostos-ctn", name: "Impostos em Espécie — CTN", ordem: 5 },
    { slug: "processo-tributario", name: "Processo Tributário Administrativo e Judicial", ordem: 6 },
    { slug: "decadencia-prescricao", name: "Decadência e Prescrição Tributária", ordem: 7 },
  ],
  "direito-processual-civil": [
    { slug: "principios-normas", name: "Princípios e Normas Fundamentais (CPC/2015)", ordem: 1 },
    { slug: "competencia", name: "Competência", ordem: 2 },
    { slug: "partes-procuradores", name: "Partes, Procuradores e Litisconsórcio", ordem: 3 },
    { slug: "provas", name: "Provas", ordem: 4 },
    { slug: "sentenca-coisa-julgada", name: "Sentença e Coisa Julgada", ordem: 5 },
    { slug: "recursos", name: "Recursos no CPC", ordem: 6 },
    { slug: "execucao", name: "Execução e Cumprimento de Sentença", ordem: 7 },
    { slug: "tutelas-provisorias", name: "Tutelas Provisórias (Cautelar e Antecipada)", ordem: 8 },
  ],
  "direito-processual-penal": [
    { slug: "inquerito", name: "Inquérito Policial", ordem: 1 },
    { slug: "acao-penal", name: "Ação Penal e Condições", ordem: 2 },
    { slug: "provas-penal", name: "Provas e Meios de Prova", ordem: 3 },
    { slug: "prisoes", name: "Prisões e Medidas Cautelares", ordem: 4 },
    { slug: "procedimentos", name: "Procedimentos (Comum e Especiais)", ordem: 5 },
    { slug: "recursos-penal", name: "Recursos no CPP", ordem: 6 },
    { slug: "execucao-penal", name: "Lei de Execução Penal (Lei 7.210/84)", ordem: 7 },
  ],
  "direito-empresarial": [
    { slug: "teoria-empresa", name: "Teoria da Empresa e Empresário", ordem: 1 },
    { slug: "sociedades", name: "Tipos de Sociedades Empresariais", ordem: 2 },
    { slug: "titulos-credito", name: "Títulos de Crédito", ordem: 3 },
    { slug: "contratos-empresariais", name: "Contratos Empresariais", ordem: 4 },
    { slug: "falencia-recuperacao", name: "Falência e Recuperação Judicial", ordem: 5 },
    { slug: "propriedade-intelectual", name: "Propriedade Intelectual e Marcas", ordem: 6 },
  ],
  "direito-trabalhista": [
    { slug: "relacao-emprego", name: "Relação de Emprego e Contrato de Trabalho", ordem: 1 },
    { slug: "jornada-remuneracao", name: "Jornada de Trabalho e Remuneração", ordem: 2 },
    { slug: "ferias-licencas", name: "Férias, Licenças e Afastamentos", ordem: 3 },
    { slug: "rescisao", name: "Rescisão do Contrato de Trabalho", ordem: 4 },
    { slug: "processo-trabalho", name: "Processo do Trabalho — CLT e TST", ordem: 5 },
    { slug: "previdencia-trabalhista", name: "Previdência Social e FGTS", ordem: 6 },
  ],
  "direito-previdenciario": [
    { slug: "rgps", name: "RGPS — Regime Geral (Lei 8.213/91)", ordem: 1 },
    { slug: "beneficios", name: "Benefícios Previdenciários", ordem: 2 },
    { slug: "reforma-previdencia", name: "Reforma da Previdência — EC 103/2019", ordem: 3 },
    { slug: "custeio", name: "Custeio da Previdência Social", ordem: 4 },
    { slug: "rpps", name: "RPPS — Regime Próprio dos Servidores", ordem: 5 },
  ],
  "direito-financeiro": [
    { slug: "orcamento-publico", name: "Orçamento Público — PPA, LDO, LOA", ordem: 1 },
    { slug: "receitas-despesas", name: "Receitas e Despesas Públicas", ordem: 2 },
    { slug: "lei-4320", name: "Lei 4.320/64", ordem: 3 },
    { slug: "lrf", name: "Lei de Responsabilidade Fiscal (LRF — LC 101/00)", ordem: 4 },
    { slug: "divida-publica", name: "Dívida Pública e Precatórios", ordem: 5 },
  ],
  "direito-internacional": [
    { slug: "tratados-internacionais", name: "Tratados Internacionais e Convenção de Viena", ordem: 1 },
    { slug: "organizacoes-internacionais", name: "Organismos Internacionais (ONU, OEA, OMC)", ordem: 2 },
    { slug: "relacoes-diplomaticas", name: "Relações Diplomáticas e Consulares", ordem: 3 },
    { slug: "direito-humanitario", name: "Direito Internacional Humanitário", ordem: 4 },
    { slug: "direitos-humanos-int", name: "Sistema Internacional de Direitos Humanos", ordem: 5 },
  ],

  // ══ ENEM ══════════════════════════════════════════════════════════════════
  "linguagens-e-codigos-enem": [
    { slug: "interpretacao-texto", name: "Interpretação de Texto", ordem: 1 },
    { slug: "generos-textuais", name: "Gêneros Textuais e Discursivos", ordem: 2 },
    { slug: "literatura-brasileira", name: "Literatura Brasileira", ordem: 3 },
    { slug: "linguagem-variedades", name: "Linguagem e Variação Linguística", ordem: 4 },
    { slug: "artes-comunicacao", name: "Artes, Tecnologias e Comunicação", ordem: 5 },
  ],
  "redacao-enem": [
    { slug: "estrutura-dissertacao", name: "Estrutura da Dissertação Argumentativa", ordem: 1 },
    { slug: "introducao", name: "Introdução e Tese", ordem: 2 },
    { slug: "desenvolvimento", name: "Desenvolvimento e Argumentos", ordem: 3 },
    { slug: "conclusao-proposta", name: "Conclusão e Proposta de Intervenção", ordem: 4 },
    { slug: "5-competencias", name: "As 5 Competências do ENEM", ordem: 5 },
    { slug: "direitos-humanos", name: "Direitos Humanos na Redação", ordem: 6 },
  ],
  "matematica-e-suas-tecnologias-enem": [
    { slug: "funcoes", name: "Funções (1º e 2º grau, exponencial, logarítmica)", ordem: 1 },
    { slug: "geometria-plana", name: "Geometria Plana e Espacial", ordem: 2 },
    { slug: "estatistica-probabilidade", name: "Estatística e Probabilidade", ordem: 3 },
    { slug: "pa-pg", name: "Progressões Aritméticas e Geométricas", ordem: 4 },
    { slug: "trigonometria", name: "Trigonometria", ordem: 5 },
    { slug: "matematica-financeira", name: "Matemática Financeira", ordem: 6 },
    { slug: "combinatoria", name: "Análise Combinatória", ordem: 7 },
  ],
  "ciencias-humanas-enem": [
    { slug: "historia-brasil", name: "História do Brasil", ordem: 1 },
    { slug: "historia-geral", name: "História Geral (Mundo)", ordem: 2 },
    { slug: "geografia-brasil", name: "Geografia do Brasil", ordem: 3 },
    { slug: "geografia-geral", name: "Geografia Geral e Geopolítica", ordem: 4 },
    { slug: "filosofia", name: "Filosofia", ordem: 5 },
    { slug: "sociologia", name: "Sociologia", ordem: 6 },
  ],
  "ciencias-da-natureza-enem": [
    { slug: "quimica-organica", name: "Química Orgânica", ordem: 1 },
    { slug: "quimica-geral", name: "Química Geral e Inorgânica", ordem: 2 },
    { slug: "fisica-mecanica", name: "Física — Mecânica", ordem: 3 },
    { slug: "fisica-eletricidade", name: "Física — Eletricidade e Ondas", ordem: 4 },
    { slug: "biologia-celular", name: "Biologia Celular e Molecular", ordem: 5 },
    { slug: "genetica", name: "Genética e Evolução", ordem: 6 },
    { slug: "ecologia", name: "Ecologia e Biomas Brasileiros", ordem: 7 },
  ],

  // ══ FISCAL ════════════════════════════════════════════════════════════════
  "legislacao-tributaria-federal": [
    { slug: "ctn", name: "CTN — Código Tributário Nacional", ordem: 1 },
    { slug: "impostos-federais", name: "Impostos Federais (IR, IPI, IOF, ITR)", ordem: 2 },
    { slug: "contribuicoes-sociais", name: "Contribuições Sociais (PIS, COFINS, CSLL)", ordem: 3 },
    { slug: "simples-nacional", name: "Simples Nacional e MEI", ordem: 4 },
    { slug: "processo-adm-fiscal", name: "Processo Administrativo Fiscal", ordem: 5 },
    { slug: "divida-ativa", name: "Dívida Ativa e Execução Fiscal", ordem: 6 },
    { slug: "elisao-evasao", name: "Elisão, Evasão e Planejamento Tributário", ordem: 7 },
    { slug: "refis-parcelamentos", name: "Parcelamentos e Transação Tributária", ordem: 8 },
  ],
  "contabilidade-publica": [
    { slug: "pcasp", name: "PCASP — Plano de Contas do Setor Público", ordem: 1 },
    { slug: "orcamento-publico", name: "Orçamento Público — LOA, LDO, PPA", ordem: 2 },
    { slug: "receita-publica", name: "Receita Pública — Estágios e Classificação", ordem: 3 },
    { slug: "despesa-publica", name: "Despesa Pública — Estágios e Execução", ordem: 4 },
    { slug: "lei-4320", name: "Lei 4.320/64 e MCASP", ordem: 5 },
    { slug: "lrf", name: "Lei de Responsabilidade Fiscal (LRF)", ordem: 6 },
    { slug: "demonstracoes-contabeis", name: "Demonstrações Contábeis Públicas", ordem: 7 },
    { slug: "nbc-tsp", name: "NBC TSP — Normas Contábeis do Setor Público", ordem: 8 },
  ],
  "economia": [
    { slug: "microeconomia", name: "Microeconomia — Oferta, Demanda e Mercados", ordem: 1 },
    { slug: "macroeconomia", name: "Macroeconomia — PIB, Inflação, Desemprego", ordem: 2 },
    { slug: "politica-economica", name: "Política Monetária e Fiscal", ordem: 3 },
    { slug: "sfn-economia", name: "Sistema Financeiro Nacional", ordem: 4 },
    { slug: "comercio-internacional", name: "Comércio Internacional e Câmbio", ordem: 5 },
    { slug: "economia-brasileira", name: "Economia Brasileira — História e Atualidade", ordem: 6 },
    { slug: "crescimento-desenvolvimento", name: "Crescimento e Desenvolvimento Econômico", ordem: 7 },
  ],
  "contabilidade-geral": [
    { slug: "patrimonio-equacao", name: "Patrimônio e Equação Patrimonial", ordem: 1 },
    { slug: "plano-contas", name: "Plano de Contas e Escrituração", ordem: 2 },
    { slug: "balancete-balanco", name: "Balancete e Balanço Patrimonial", ordem: 3 },
    { slug: "dre", name: "DRE e Demonstrações Financeiras", ordem: 4 },
    { slug: "depreciacao", name: "Depreciação, Amortização e Exaustão", ordem: 5 },
    { slug: "estoques", name: "Estoques — PEPS, UEPS, Custo Médio", ordem: 6 },
    { slug: "cpc-ifrs", name: "CPC e Normas IFRS", ordem: 7 },
  ],
  "auditoria-fiscal": [
    { slug: "auditoria-governamental", name: "Auditoria Governamental — Conceitos e Tipos", ordem: 1 },
    { slug: "nao-auditoria", name: "NAO — Normas de Auditoria Operacional", ordem: 2 },
    { slug: "matrix-risco", name: "Matriz de Risco e Materialidade", ordem: 3 },
    { slug: "relatorio-auditoria", name: "Relatório de Auditoria", ordem: 4 },
    { slug: "controle-interno", name: "Avaliação de Controles Internos", ordem: 5 },
  ],
  "administracao-tributaria": [
    { slug: "administracao-fazendaria", name: "Administração Fazendária e SEFAZ", ordem: 1 },
    { slug: "fiscalizacao", name: "Fiscalização e Auto de Infração", ordem: 2 },
    { slug: "credito-tributario", name: "Lançamento e Crédito Tributário", ordem: 3 },
    { slug: "execucao-fiscal", name: "Execução Fiscal (Lei 6.830/80)", ordem: 4 },
    { slug: "nota-fiscal-nfe", name: "NF-e, CT-e e Documentos Fiscais Eletrônicos", ordem: 5 },
  ],

  // ══ GERAL ═════════════════════════════════════════════════════════════════
  "lingua-portuguesa": [
    { slug: "interpretacao-texto", name: "Interpretação de Texto", ordem: 1 },
    { slug: "ortografia-acentuacao", name: "Ortografia e Acentuação", ordem: 2 },
    { slug: "morfologia", name: "Morfologia — Classes de Palavras", ordem: 3 },
    { slug: "sintaxe-concordancia", name: "Sintaxe e Concordância", ordem: 4 },
    { slug: "regencia-crase", name: "Regência e Crase", ordem: 5 },
    { slug: "pontuacao", name: "Pontuação", ordem: 6 },
    { slug: "semantica", name: "Semântica — Sinônimos, Antônimos, Polissemia", ordem: 7 },
    { slug: "redacao-oficial", name: "Redação Oficial (Manual de Redação da Presidência)", ordem: 8 },
  ],
  "raciocinio-logico": [
    { slug: "logica-proposicional", name: "Lógica Proposicional e Conectivos", ordem: 1 },
    { slug: "logica-quantificadores", name: "Quantificadores e Silogismos", ordem: 2 },
    { slug: "sequencias", name: "Sequências e Padrões Numéricos", ordem: 3 },
    { slug: "diagramas-conjuntos", name: "Diagramas de Venn e Conjuntos", ordem: 4 },
    { slug: "raciocinio-matematico", name: "Raciocínio Matemático e Proporcionalidade", ordem: 5 },
    { slug: "probabilidade", name: "Probabilidade e Combinatória", ordem: 6 },
    { slug: "logica-argumentativa", name: "Lógica Argumentativa", ordem: 7 },
  ],
  "matematica": [
    { slug: "porcentagem-proporcao", name: "Porcentagem e Proporção", ordem: 1 },
    { slug: "juros", name: "Juros Simples e Compostos", ordem: 2 },
    { slug: "funcoes", name: "Funções do 1º e 2º grau", ordem: 3 },
    { slug: "geometria", name: "Geometria Plana e Espacial", ordem: 4 },
    { slug: "estatistica", name: "Estatística Descritiva", ordem: 5 },
    { slug: "combinatoria-probabilidade", name: "Combinatória e Probabilidade", ordem: 6 },
    { slug: "equacoes-inequacoes", name: "Equações e Inequações", ordem: 7 },
  ],
  "informatica": [
    { slug: "windows-office", name: "Windows, Word, Excel e Outlook", ordem: 1 },
    { slug: "internet-email", name: "Internet, E-mail e Navegadores", ordem: 2 },
    { slug: "seguranca-informacao", name: "Segurança da Informação", ordem: 3 },
    { slug: "sistemas-operacionais", name: "Sistemas Operacionais — Conceitos", ordem: 4 },
    { slug: "redes-basico", name: "Redes de Computadores — Básico", ordem: 5 },
    { slug: "backup-nuvem", name: "Backup, Armazenamento em Nuvem", ordem: 6 },
  ],
  "atualidades": [
    { slug: "politica-nacional", name: "Política Nacional e Governo", ordem: 1 },
    { slug: "economia-atual", name: "Economia Brasileira Atual", ordem: 2 },
    { slug: "relacoes-internacionais", name: "Relações Internacionais", ordem: 3 },
    { slug: "meio-ambiente", name: "Meio Ambiente e Sustentabilidade", ordem: 4 },
    { slug: "tecnologia", name: "Tecnologia e Inovação", ordem: 5 },
    { slug: "saude-publica", name: "Saúde Pública e Pandemias", ordem: 6 },
    { slug: "seguranca-publica", name: "Segurança Pública", ordem: 7 },
  ],
  "redacao-oficial": [
    { slug: "manual-redacao", name: "Manual de Redação da Presidência da República", ordem: 1 },
    { slug: "oficio", name: "Ofício Padrão — Estrutura e Uso", ordem: 2 },
    { slug: "memorando-despacho", name: "Memorando e Despacho", ordem: 3 },
    { slug: "exposicao-motivos", name: "Exposição de Motivos e Mensagem", ordem: 4 },
    { slug: "lingua-oficial", name: "Linguagem e Pronomes de Tratamento", ordem: 5 },
  ],
  "historia-do-brasil": [
    { slug: "periodo-colonial", name: "Período Colonial (1500–1822)", ordem: 1 },
    { slug: "imperio", name: "Império Brasileiro (1822–1889)", ordem: 2 },
    { slug: "republica-velha", name: "República Velha (1889–1930)", ordem: 3 },
    { slug: "era-vargas", name: "Era Vargas e Estado Novo (1930–1945)", ordem: 4 },
    { slug: "republica-populista", name: "República Populista (1945–1964)", ordem: 5 },
    { slug: "ditadura-militar", name: "Ditadura Militar (1964–1985)", ordem: 6 },
    { slug: "redemocratizacao", name: "Redemocratização e CF/88 (1985–atual)", ordem: 7 },
  ],
  "geografia-do-brasil": [
    { slug: "biomas-brasileiros", name: "Biomas Brasileiros", ordem: 1 },
    { slug: "regioes-brasil", name: "Regiões e Divisão Regional", ordem: 2 },
    { slug: "relevo-hidrografia", name: "Relevo e Hidrografia", ordem: 3 },
    { slug: "clima-vegetacao", name: "Clima e Vegetação", ordem: 4 },
    { slug: "populacao", name: "População e Urbanização", ordem: 5 },
    { slug: "economia-regional", name: "Economia Regional e Agricultura", ordem: 6 },
  ],

  // ══ GESTÃO ════════════════════════════════════════════════════════════════
  "administracao-publica": [
    { slug: "conceitos-principios", name: "Conceitos e Princípios da Adm. Pública", ordem: 1 },
    { slug: "reforma-adm", name: "Reforma Administrativa (Bresser Pereira)", ordem: 2 },
    { slug: "burocracia-gerencialismo", name: "Burocracia e Gerencialismo", ordem: 3 },
    { slug: "planejamento-estrategico", name: "Planejamento Estratégico no Setor Público", ordem: 4 },
    { slug: "adm-indireta", name: "Administração Direta e Indireta", ordem: 5 },
    { slug: "governanca-publica", name: "Governança e Controle Público", ordem: 6 },
    { slug: "transparencia-lai", name: "Transparência e Lei de Acesso à Informação", ordem: 7 },
  ],
  "licitacoes-e-contratos": [
    { slug: "lei-14133", name: "Lei 14.133/21 — Nova Lei de Licitações", ordem: 1 },
    { slug: "modalidades", name: "Modalidades de Licitação", ordem: 2 },
    { slug: "dispensas-inexigibilidade", name: "Dispensas e Inexigibilidade de Licitação", ordem: 3 },
    { slug: "contratos-adm", name: "Contratos Administrativos — Execução e Rescisão", ordem: 4 },
    { slug: "registro-precos", name: "Atas de Registro de Preços", ordem: 5 },
    { slug: "lei-8666-transicao", name: "Lei 8.666/93 e Regras de Transição", ordem: 6 },
  ],
  "orcamento-publico": [
    { slug: "sistema-orcamentario", name: "Sistema Orçamentário Brasileiro", ordem: 1 },
    { slug: "ppa-ldo-loa", name: "PPA, LDO e LOA", ordem: 2 },
    { slug: "execucao-orcamentaria", name: "Execução Orçamentária e Financeira", ordem: 3 },
    { slug: "emendas-parlamentares", name: "Emendas Parlamentares", ordem: 4 },
    { slug: "principios-orcamentarios", name: "Princípios Orçamentários", ordem: 5 },
  ],
  "administracao-geral": [
    { slug: "funcoes-adm", name: "Funções Administrativas (POD&C)", ordem: 1 },
    { slug: "teorias-adm", name: "Teorias da Administração", ordem: 2 },
    { slug: "estrutura-organizacional", name: "Estrutura Organizacional", ordem: 3 },
    { slug: "tomada-decisao", name: "Tomada de Decisão e Planejamento", ordem: 4 },
    { slug: "cultura-organizacional", name: "Cultura e Clima Organizacional", ordem: 5 },
  ],
  "gestao-de-pessoas": [
    { slug: "recrutamento-selecao", name: "Recrutamento e Seleção", ordem: 1 },
    { slug: "treinamento-desenvolvimento", name: "Treinamento e Desenvolvimento", ordem: 2 },
    { slug: "avaliacao-desempenho", name: "Avaliação de Desempenho", ordem: 3 },
    { slug: "motivacao-lideranca", name: "Motivação e Liderança", ordem: 4 },
    { slug: "cargos-salarios", name: "Cargos, Salários e Carreira", ordem: 5 },
  ],
  "gestao-de-projetos": [
    { slug: "pmbok", name: "PMBOK — Grupos e Áreas de Conhecimento", ordem: 1 },
    { slug: "ciclo-vida-projeto", name: "Ciclo de Vida do Projeto", ordem: 2 },
    { slug: "metodologias-ageis", name: "Metodologias Ágeis (SCRUM, Kanban)", ordem: 3 },
    { slug: "risco-projeto", name: "Gestão de Riscos de Projeto", ordem: 4 },
    { slug: "evm", name: "Gerenciamento do Valor Agregado (EVM)", ordem: 5 },
  ],
  "gestao-da-qualidade": [
    { slug: "conceitos-qualidade", name: "Conceitos e Princípios da Qualidade", ordem: 1 },
    { slug: "iso-9001", name: "ISO 9001 — Sistema de Gestão da Qualidade", ordem: 2 },
    { slug: "ferramentas-qualidade", name: "Ferramentas da Qualidade (PDCA, Ishikawa, 5S)", ordem: 3 },
    { slug: "gestao-processos", name: "Gestão de Processos (BPM)", ordem: 4 },
    { slug: "six-sigma", name: "Six Sigma e Lean", ordem: 5 },
  ],
  "controle-e-auditoria-governamental": [
    { slug: "controle-interno-externo", name: "Controle Interno e Externo", ordem: 1 },
    { slug: "tcu-atribuicoes", name: "TCU — Atribuições e Funcionamento", ordem: 2 },
    { slug: "auditorias-gov", name: "Tipos de Auditoria Governamental", ordem: 3 },
    { slug: "improbidade", name: "Improbidade Administrativa", ordem: 4 },
    { slug: "compliance", name: "Compliance e Integridade Pública", ordem: 5 },
  ],

  // ══ GESTÃO PÚBLICA ════════════════════════════════════════════════════════
  "direito-administrativo-gp": [
    { slug: "principios", name: "Princípios Administrativos (LIMPE)", ordem: 1 },
    { slug: "atos-administrativos", name: "Atos Administrativos", ordem: 2 },
    { slug: "agentes-servidores", name: "Agentes e Servidores Públicos", ordem: 3 },
    { slug: "licitacoes", name: "Licitações e Contratos", ordem: 4 },
    { slug: "responsabilidade", name: "Responsabilidade Civil do Estado", ordem: 5 },
    { slug: "improbidade", name: "Improbidade Administrativa", ordem: 6 },
  ],
  "raciocinio-logico-gp": [
    { slug: "logica-proposicional", name: "Lógica Proposicional", ordem: 1 },
    { slug: "silogismos", name: "Silogismos e Argumentação", ordem: 2 },
    { slug: "matematica-basica", name: "Matemática Básica e Proporcionalidade", ordem: 3 },
    { slug: "estatistica-basica", name: "Estatística Básica", ordem: 4 },
  ],
  "politicas-publicas": [
    { slug: "ciclo-politicas", name: "Ciclo de Políticas Públicas", ordem: 1 },
    { slug: "avaliacao-politicas", name: "Avaliação e Monitoramento de Políticas", ordem: 2 },
    { slug: "politicas-sociais", name: "Políticas Sociais (Educação, Saúde, Assistência)", ordem: 3 },
    { slug: "descentralizacao", name: "Descentralização e Federalismo Fiscal", ordem: 4 },
    { slug: "agenda-publica", name: "Agenda Pública e Formulação de Políticas", ordem: 5 },
  ],
  "direito-constitucional-gp": [
    { slug: "principios-fundamentais", name: "Princípios Fundamentais da CF/88", ordem: 1 },
    { slug: "direitos-fundamentais", name: "Direitos e Garantias Fundamentais", ordem: 2 },
    { slug: "organizacao-estado", name: "Organização do Estado e dos Poderes", ordem: 3 },
    { slug: "adm-publica-cf", name: "Administração Pública na CF/88 (art. 37-41)", ordem: 4 },
  ],
  "lingua-portuguesa-gp": [
    { slug: "interpretacao-texto", name: "Interpretação e Compreensão de Textos", ordem: 1 },
    { slug: "gramatica", name: "Gramática — Morfologia e Sintaxe", ordem: 2 },
    { slug: "redacao-oficial", name: "Redação Oficial", ordem: 3 },
    { slug: "coesao-coerencia", name: "Coesão e Coerência Textual", ordem: 4 },
  ],

  // ══ JUDICIAL ══════════════════════════════════════════════════════════════
  "direito-notarial-e-registral": [
    { slug: "lei-8935", name: "Lei 8.935/94 — Serviços Notariais e de Registro", ordem: 1 },
    { slug: "registros-publicos", name: "Lei 6.015/73 — Registros Públicos", ordem: 2 },
    { slug: "tabelionato-notas", name: "Tabelionato de Notas e Protestos", ordem: 3 },
    { slug: "registro-imoveis", name: "Registro de Imóveis", ordem: 4 },
    { slug: "registro-civil", name: "Registro Civil de Pessoas Naturais", ordem: 5 },
  ],
  "estatuto-dos-servidores": [
    { slug: "lei-8112", name: "Lei 8.112/90 — Estatuto Federal", ordem: 1 },
    { slug: "direitos-deveres", name: "Direitos e Deveres do Servidor", ordem: 2 },
    { slug: "processo-adm-disciplinar", name: "Processo Administrativo Disciplinar (PAD)", ordem: 3 },
    { slug: "beneficios-vantagens", name: "Benefícios, Vantagens e Remuneração", ordem: 4 },
    { slug: "vacancia-exoneracao", name: "Vacância, Exoneração e Demissão", ordem: 5 },
  ],
  "etica-no-servico-publico": [
    { slug: "codigo-etica-servidor", name: "Código de Ética do Servidor Público (Dec. 1.171/94)", ordem: 1 },
    { slug: "lei-anticorrupcao", name: "Lei Anticorrupção (Lei 12.846/13)", ordem: 2 },
    { slug: "conflito-interesses", name: "Conflito de Interesses na Adm. Pública", ordem: 3 },
    { slug: "transparencia-integridade", name: "Transparência e Integridade Pública", ordem: 4 },
  ],
  "organizacao-judiciaria": [
    { slug: "estrutura-judiciario", name: "Estrutura do Poder Judiciário Brasileiro", ordem: 1 },
    { slug: "competencias-varas", name: "Competências das Varas e Tribunais", ordem: 2 },
    { slug: "stf-stj", name: "STF e STJ — Competências e Funcionamento", ordem: 3 },
    { slug: "justica-estadual-federal", name: "Justiça Estadual x Federal", ordem: 4 },
    { slug: "cnjt", name: "CNJ — Conselho Nacional de Justiça", ordem: 5 },
  ],

  // ══ JUDICIÁRIO ════════════════════════════════════════════════════════════
  "direito-constitucional-jud": [
    { slug: "direitos-fundamentais", name: "Direitos e Garantias Fundamentais", ordem: 1 },
    { slug: "poder-judiciario", name: "Poder Judiciário na CF/88", ordem: 2 },
    { slug: "controle-constitucionalidade", name: "Controle de Constitucionalidade", ordem: 3 },
    { slug: "organizacao-estado", name: "Organização do Estado", ordem: 4 },
  ],
  "direito-administrativo-jud": [
    { slug: "principios", name: "Princípios Administrativos", ordem: 1 },
    { slug: "atos-adm", name: "Atos Administrativos", ordem: 2 },
    { slug: "licitacoes", name: "Licitações e Contratos", ordem: 3 },
    { slug: "servidores", name: "Servidores Públicos e Lei 8.112/90", ordem: 4 },
    { slug: "improbidade", name: "Improbidade Administrativa", ordem: 5 },
  ],
  "direito-penal-jud": [
    { slug: "teoria-geral", name: "Teoria Geral do Crime", ordem: 1 },
    { slug: "crimes-especiais", name: "Crimes em Espécie Relevantes", ordem: 2 },
    { slug: "penas", name: "Penas e Medidas de Segurança", ordem: 3 },
  ],
  "direito-processual-penal-jud": [
    { slug: "inquerito", name: "Inquérito Policial e Ação Penal", ordem: 1 },
    { slug: "provas", name: "Provas e Sistemas de Avaliação", ordem: 2 },
    { slug: "prisoes", name: "Prisões e Liberdade Provisória", ordem: 3 },
    { slug: "recursos", name: "Recursos no CPP", ordem: 4 },
  ],
  "informatica-jud": [
    { slug: "windows-office", name: "Windows, Word, Excel e PowerPoint", ordem: 1 },
    { slug: "internet-seguranca", name: "Internet, Segurança e E-mail", ordem: 2 },
    { slug: "sistemas-jud", name: "Sistemas Judiciários (e-Proc, PJe)", ordem: 3 },
    { slug: "redes", name: "Redes de Computadores — Noções", ordem: 4 },
  ],
  "lingua-portuguesa-jud": [
    { slug: "interpretacao", name: "Interpretação de Texto", ordem: 1 },
    { slug: "gramatica", name: "Gramática — Concordância, Regência, Crase", ordem: 2 },
    { slug: "redacao-oficial", name: "Redação Oficial e Jurídica", ordem: 3 },
    { slug: "morfologia", name: "Morfologia — Classes de Palavras", ordem: 4 },
  ],
  "raciocinio-logico-jud": [
    { slug: "logica-proposicional", name: "Lógica Proposicional", ordem: 1 },
    { slug: "silogismos", name: "Silogismos e Argumentação", ordem: 2 },
    { slug: "sequencias-matematicas", name: "Sequências e Problemas Matemáticos", ordem: 3 },
    { slug: "probabilidade", name: "Probabilidade e Estatística Básica", ordem: 4 },
  ],

  // ══ MINISTÉRIO PÚBLICO ════════════════════════════════════════════════════
  "direito-constitucional-mp": [
    { slug: "mp-cf", name: "Ministério Público na CF/88 (art. 127-130)", ordem: 1 },
    { slug: "direitos-fundamentais", name: "Direitos e Garantias Fundamentais", ordem: 2 },
    { slug: "controle-constitucionalidade", name: "Controle de Constitucionalidade", ordem: 3 },
    { slug: "adi-adpf", name: "ADI, ADC, ADPF e outras ações diretas", ordem: 4 },
  ],
  "legislacao-mp": [
    { slug: "lei-8625", name: "Lei 8.625/93 — Lei Orgânica do MP", ordem: 1 },
    { slug: "lc-75", name: "LC 75/93 — MP da União", ordem: 2 },
    { slug: "estatuto-membros", name: "Estatuto dos Membros do MP", ordem: 3 },
    { slug: "acao-civil-publica", name: "Ação Civil Pública (Lei 7.347/85)", ordem: 4 },
    { slug: "inquerito-civil", name: "Inquérito Civil e TAC", ordem: 5 },
    { slug: "etica-promotor", name: "Ética e Deontologia do Promotor", ordem: 6 },
  ],
  "direito-civil-mp": [
    { slug: "pessoas-negocios", name: "Pessoas e Negócios Jurídicos", ordem: 1 },
    { slug: "familia-sucessoes", name: "Família e Sucessões", ordem: 2 },
    { slug: "obrigacoes-contratos", name: "Obrigações e Contratos", ordem: 3 },
    { slug: "responsabilidade-civil", name: "Responsabilidade Civil", ordem: 4 },
  ],
  "direito-administrativo-mp": [
    { slug: "principios-controle", name: "Princípios e Controle da Administração", ordem: 1 },
    { slug: "improbidade-lei", name: "Improbidade Administrativa — Lei 8.429/92", ordem: 2 },
    { slug: "lei-anticorrupcao", name: "Lei Anticorrupção (Lei 12.846/13)", ordem: 3 },
  ],
  "direito-penal-mp": [
    { slug: "teoria-crime", name: "Teoria Geral do Crime", ordem: 1 },
    { slug: "crimes-especiais-mp", name: "Crimes de Interesse do MP", ordem: 2 },
    { slug: "lei-drogas-mp", name: "Lei de Drogas e Organização Criminosa", ordem: 3 },
  ],
  "direito-processual-penal-mp": [
    { slug: "investigacao-criminal", name: "Investigação Criminal e Promotor", ordem: 1 },
    { slug: "acao-penal-publica", name: "Ação Penal Pública e Privada", ordem: 2 },
    { slug: "provas-ilicitas", name: "Provas e Provas Ilícitas", ordem: 3 },
    { slug: "recursos-penal", name: "Recursos e Execução Penal", ordem: 4 },
  ],
  "lingua-portuguesa-mp": [
    { slug: "interpretacao", name: "Interpretação e Argumentação Textual", ordem: 1 },
    { slug: "gramatica-juridica", name: "Gramática e Linguagem Jurídica", ordem: 2 },
    { slug: "redacao-juridica", name: "Redação Jurídica e Oficial", ordem: 3 },
  ],
  "direito-processual-penal-mp": [
    { slug: "investigacao", name: "Investigação Criminal", ordem: 1 },
    { slug: "acao-penal", name: "Ação Penal Pública", ordem: 2 },
    { slug: "provas-ilicitas", name: "Provas e Licitude das Provas", ordem: 3 },
    { slug: "recursos", name: "Recursos Criminais", ordem: 4 },
  ],

  // ══ OAB ═══════════════════════════════════════════════════════════════════
  "etica-e-estatuto-da-oab": [
    { slug: "oab-estrutura", name: "Estrutura da OAB e Atribuições", ordem: 1 },
    { slug: "etica-advocacia", name: "Ética e Deontologia Advocatícia", ordem: 2 },
    { slug: "estatuto-lei-8906", name: "Estatuto da Advocacia — Lei 8.906/94", ordem: 3 },
    { slug: "codigo-etica-oab", name: "Código de Ética e Disciplina da OAB", ordem: 4 },
    { slug: "incompatibilidades", name: "Incompatibilidades e Impedimentos", ordem: 5 },
    { slug: "honorarios", name: "Honorários Advocatícios", ordem: 6 },
    { slug: "sigilo-advogado", name: "Sigilo Profissional", ordem: 7 },
  ],
  "peca-processual-oab-2-fase": [
    { slug: "peca-civel", name: "Peça Cível (Petição, Contestação, Recurso)", ordem: 1 },
    { slug: "peca-penal", name: "Peça Penal (Resposta, HC, RESE)", ordem: 2 },
    { slug: "peca-trabalhista", name: "Peça Trabalhista (Reclamação, Recurso)", ordem: 3 },
    { slug: "peca-constitucional", name: "Peça Constitucional (MS, MI, Ação Popular)", ordem: 4 },
    { slug: "estrutura-peca", name: "Estrutura da Peça — Endereçamento e Fecho", ordem: 5 },
  ],
  "direito-constitucional-oab": [
    { slug: "direitos-fundamentais", name: "Direitos e Garantias Fundamentais", ordem: 1 },
    { slug: "organizacao-poderes", name: "Organização dos Poderes", ordem: 2 },
    { slug: "controle-constitucionalidade", name: "Controle de Constitucionalidade", ordem: 3 },
    { slug: "remedios-constitucionais", name: "Remédios Constitucionais (MS, MI, HC, HD)", ordem: 4 },
  ],
  "direito-civil-oab": [
    { slug: "negocios-juridicos", name: "Negócios Jurídicos e Invalidade", ordem: 1 },
    { slug: "contratos-oab", name: "Contratos e Responsabilidade Contratual", ordem: 2 },
    { slug: "familia-oab", name: "Direito de Família", ordem: 3 },
    { slug: "sucessoes-oab", name: "Direito das Sucessões", ordem: 4 },
    { slug: "responsabilidade-oab", name: "Responsabilidade Civil", ordem: 5 },
  ],
  "direito-penal-oab": [
    { slug: "teoria-crime-oab", name: "Teoria do Crime", ordem: 1 },
    { slug: "crimes-especiais-oab", name: "Crimes em Espécie — OAB 1ª Fase", ordem: 2 },
    { slug: "penas-oab", name: "Penas e Medidas de Segurança", ordem: 3 },
  ],
  "direito-processual-civil-oab": [
    { slug: "competencia-oab", name: "Competência", ordem: 1 },
    { slug: "provas-oab", name: "Provas no CPC", ordem: 2 },
    { slug: "tutelas-oab", name: "Tutelas Provisórias", ordem: 3 },
    { slug: "recursos-oab", name: "Recursos e Ação Rescisória", ordem: 4 },
    { slug: "execucao-oab", name: "Execução e Cumprimento de Sentença", ordem: 5 },
  ],
  "direito-processual-penal-oab": [
    { slug: "inquerito-oab", name: "Inquérito Policial", ordem: 1 },
    { slug: "acao-penal-oab", name: "Ação Penal", ordem: 2 },
    { slug: "prisoes-oab", name: "Prisões e Medidas Cautelares", ordem: 3 },
    { slug: "nulidades-oab", name: "Nulidades e Recursos", ordem: 4 },
  ],
  "direito-administrativo-oab": [
    { slug: "atos-adm-oab", name: "Atos Administrativos", ordem: 1 },
    { slug: "licitacoes-oab", name: "Licitações e Contratos", ordem: 2 },
    { slug: "ms-adm-oab", name: "Mandado de Segurança na Seara Administrativa", ordem: 3 },
    { slug: "improbidade-oab", name: "Improbidade Administrativa", ordem: 4 },
  ],
  "direito-tributario-oab": [
    { slug: "principios-tributarios", name: "Princípios Tributários Constitucionais", ordem: 1 },
    { slug: "impostos-especies-oab", name: "Impostos em Espécie", ordem: 2 },
    { slug: "credito-tributario-oab", name: "Crédito Tributário — Lançamento e Extinção", ordem: 3 },
    { slug: "execucao-fiscal-oab", name: "Execução Fiscal e Embargos", ordem: 4 },
  ],
  "direito-empresarial-oab": [
    { slug: "empresario-empresa", name: "Empresário e Sociedades Empresariais", ordem: 1 },
    { slug: "titulos-credito-oab", name: "Títulos de Crédito (Cheque, NP, Duplicata)", ordem: 2 },
    { slug: "falencia-oab", name: "Falência e Recuperação Judicial", ordem: 3 },
  ],
  "direito-do-trabalho-oab": [
    { slug: "contrato-emprego-oab", name: "Contrato de Trabalho e Jornada", ordem: 1 },
    { slug: "remuneracao-oab", name: "Remuneração e Férias", ordem: 2 },
    { slug: "rescisao-oab", name: "Rescisão e FGTS", ordem: 3 },
    { slug: "processo-trabalho-oab", name: "Processo do Trabalho", ordem: 4 },
  ],

  // ══ POLICIAL ══════════════════════════════════════════════════════════════
  "lingua-portuguesa-policial": [
    { slug: "interpretacao-texto", name: "Interpretação de Texto", ordem: 1 },
    { slug: "ortografia-acentuacao", name: "Ortografia e Acentuação", ordem: 2 },
    { slug: "morfologia", name: "Morfologia — Classes de Palavras", ordem: 3 },
    { slug: "sintaxe-concordancia", name: "Sintaxe e Concordância", ordem: 4 },
    { slug: "regencia-crase", name: "Regência e Crase", ordem: 5 },
    { slug: "semantica", name: "Semântica e Figuras de Linguagem", ordem: 6 },
    { slug: "redacao-oficial", name: "Redação Oficial", ordem: 7 },
    { slug: "pontuacao", name: "Pontuação", ordem: 8 },
  ],
  "raciocinio-logico-policial": [
    { slug: "logica-proposicional", name: "Lógica Proposicional e Conectivos", ordem: 1 },
    { slug: "logica-quantificadores", name: "Quantificadores e Predicados", ordem: 2 },
    { slug: "sequencias", name: "Sequências e Séries Numéricas", ordem: 3 },
    { slug: "matematica-basica", name: "Raciocínio Matemático Básico", ordem: 4 },
    { slug: "probabilidade-combinatoria", name: "Probabilidade e Combinatória", ordem: 5 },
    { slug: "diagramas-conjuntos", name: "Diagramas e Conjuntos", ordem: 6 },
    { slug: "logica-argumentativa", name: "Lógica Argumentativa", ordem: 7 },
  ],
  "informatica-policial": [
    { slug: "windows-office", name: "Windows e Pacote Office", ordem: 1 },
    { slug: "internet-email", name: "Internet, E-mail e Navegadores", ordem: 2 },
    { slug: "seguranca-basica", name: "Segurança da Informação Básica", ordem: 3 },
    { slug: "sistemas-operacionais", name: "Sistemas Operacionais — Noções", ordem: 4 },
    { slug: "redes-basico", name: "Redes e Internet — Conceitos Básicos", ordem: 5 },
  ],
  "medicina-legal": [
    { slug: "tanatologia", name: "Tanatologia Forense", ordem: 1 },
    { slug: "traumatologia", name: "Traumatologia Forense", ordem: 2 },
    { slug: "sexologia-forense", name: "Sexologia Forense", ordem: 3 },
    { slug: "toxicologia", name: "Toxicologia Forense", ordem: 4 },
    { slug: "psiquiatria-forense", name: "Psiquiatria Forense e Imputabilidade", ordem: 5 },
    { slug: "identificacao", name: "Identificação Humana e Datiloscopia", ordem: 6 },
  ],
  "criminologia": [
    { slug: "teorias-criminologicas", name: "Teorias Criminológicas", ordem: 1 },
    { slug: "vitimologia", name: "Vitimologia", ordem: 2 },
    { slug: "criminalidade-violencia", name: "Criminalidade e Violência Urbana", ordem: 3 },
    { slug: "politicas-seguranca", name: "Políticas de Segurança Pública", ordem: 4 },
    { slug: "criminologia-brasileira", name: "Criminologia Crítica e Brasileira", ordem: 5 },
  ],
  "legislacao-penal-especial": [
    { slug: "lei-drogas", name: "Lei de Drogas (11.343/06)", ordem: 1 },
    { slug: "maria-penha", name: "Lei Maria da Penha (11.340/06)", ordem: 2 },
    { slug: "eca", name: "ECA — Estatuto da Criança e do Adolescente", ordem: 3 },
    { slug: "estatuto-desarmamento", name: "Estatuto do Desarmamento (10.826/03)", ordem: 4 },
    { slug: "lei-racismo", name: "Lei de Crimes de Preconceito (7.716/89)", ordem: 5 },
    { slug: "abuso-autoridade", name: "Lei de Abuso de Autoridade (13.869/19)", ordem: 6 },
    { slug: "lavagem-dinheiro-pol", name: "Lavagem de Dinheiro (9.613/98)", ordem: 7 },
    { slug: "organizacao-criminosa", name: "Organização Criminosa (12.850/13)", ordem: 8 },
  ],
  "legislacao-policial": [
    { slug: "cp-geral", name: "Código Penal — Parte Geral", ordem: 1 },
    { slug: "cp-especial", name: "Código Penal — Parte Especial (Crimes)", ordem: 2 },
    { slug: "cpp", name: "Código de Processo Penal (CPP)", ordem: 3 },
    { slug: "direitos-humanos", name: "Direitos Humanos e Ética Policial", ordem: 4 },
    { slug: "legislacao-corporacao", name: "Legislação Específica da Corporação", ordem: 5 },
  ],
  "criminalistica": [
    { slug: "local-crime", name: "Local do Crime e Preservação de Cena", ordem: 1 },
    { slug: "balistica", name: "Balística Forense", ordem: 2 },
    { slug: "documentoscopia", name: "Documentoscopia e Grafoscopia", ordem: 3 },
    { slug: "genetica-forense", name: "Genética Forense (DNA)", ordem: 4 },
    { slug: "incendio-explosivos", name: "Incêndio e Explosivos", ordem: 5 },
  ],

  // ══ REVALIDA ══════════════════════════════════════════════════════════════
  "clinica-medica-revalida": [
    { slug: "cardiologia", name: "Cardiologia — IAM, ICC, HAS", ordem: 1 },
    { slug: "pneumologia", name: "Pneumologia — DPOC, Asma, Pneumonia", ordem: 2 },
    { slug: "gastroenterologia", name: "Gastroenterologia", ordem: 3 },
    { slug: "nefrologia", name: "Nefrologia e IRA/IRC", ordem: 4 },
    { slug: "endocrinologia", name: "Endocrinologia — DM, Tireóide", ordem: 5 },
    { slug: "neurologia", name: "Neurologia — AVC, Epilepsia", ordem: 6 },
    { slug: "infectologia", name: "Infectologia — HIV, Dengue, Tuberculose", ordem: 7 },
    { slug: "reumatologia", name: "Reumatologia e Doenças Autoimunes", ordem: 8 },
  ],
  "pediatria-revalida": [
    { slug: "neonatologia", name: "Neonatologia — RN e Prematuridade", ordem: 1 },
    { slug: "crescimento", name: "Crescimento e Desenvolvimento Infantil", ordem: 2 },
    { slug: "doencas-infancia", name: "Doenças Infectocontagiosas na Infância", ordem: 3 },
    { slug: "emergencias-pediatricas", name: "Emergências Pediátricas", ordem: 4 },
    { slug: "nutricao-infantil", name: "Nutrição Infantil e Aleitamento", ordem: 5 },
  ],
  "saude-coletiva-e-mfc-revalida": [
    { slug: "sus", name: "SUS — Princípios, Diretrizes e Organização", ordem: 1 },
    { slug: "atencao-primaria", name: "Atenção Primária e Saúde da Família", ordem: 2 },
    { slug: "epidemiologia", name: "Epidemiologia Básica", ordem: 3 },
    { slug: "vigilancia-saude", name: "Vigilância em Saúde", ordem: 4 },
    { slug: "politicas-saude", name: "Políticas Públicas de Saúde", ordem: 5 },
  ],
  "cirurgia-geral-revalida": [
    { slug: "trauma", name: "Trauma e ATLS", ordem: 1 },
    { slug: "abdome-agudo", name: "Abdome Agudo", ordem: 2 },
    { slug: "cirurgia-geral-eletiva", name: "Cirurgia Geral Eletiva", ordem: 3 },
    { slug: "anestesiologia", name: "Anestesiologia — Noções Básicas", ordem: 4 },
    { slug: "pos-operatorio", name: "Pós-operatório e Complicações", ordem: 5 },
  ],
  "ginecologia-e-obstetricia-revalida": [
    { slug: "pre-natal", name: "Pré-natal e Gestação Normal", ordem: 1 },
    { slug: "parto", name: "Parto e Puerpério", ordem: 2 },
    { slug: "gestacao-risco", name: "Gestação de Alto Risco", ordem: 3 },
    { slug: "ginecologia-benigna", name: "Ginecologia Benigna", ordem: 4 },
    { slug: "oncologia-ginecologica", name: "Oncologia Ginecológica", ordem: 5 },
  ],
  "osce-estacoes-praticas-revalida": [
    { slug: "anamnese-exame-fisico", name: "Anamnese e Exame Físico", ordem: 1 },
    { slug: "procedimentos-basicos", name: "Procedimentos Básicos (sutura, acesso venoso...)", ordem: 2 },
    { slug: "interpretacao-exames", name: "Interpretação de Exames", ordem: 3 },
    { slug: "comunicacao-medico-paciente", name: "Comunicação Médico-Paciente", ordem: 4 },
  ],

  // ══ TI ════════════════════════════════════════════════════════════════════
  "redes-de-computadores": [
    { slug: "modelo-osi-tcp", name: "Modelos OSI e TCP/IP", ordem: 1 },
    { slug: "enderecamento-ip", name: "Endereçamento IPv4/IPv6 e Sub-redes", ordem: 2 },
    { slug: "protocolos", name: "Protocolos de Aplicação (HTTP, DNS, SMTP...)", ordem: 3 },
    { slug: "roteamento", name: "Roteamento (OSPF, BGP, RIP)", ordem: 4 },
    { slug: "switching-vlan", name: "Switching e VLANs (802.1Q)", ordem: 5 },
    { slug: "wireless", name: "Redes Sem Fio — Wi-Fi 802.11", ordem: 6 },
    { slug: "firewall-ids", name: "Firewall, IDS/IPS e DMZ", ordem: 7 },
  ],
  "seguranca-da-informacao": [
    { slug: "criptografia", name: "Criptografia Simétrica e Assimétrica", ordem: 1 },
    { slug: "certificados-pki", name: "Certificados Digitais e PKI/ICP-Brasil", ordem: 2 },
    { slug: "vulnerabilidades", name: "Vulnerabilidades OWASP Top 10", ordem: 3 },
    { slug: "lgpd-si", name: "LGPD e Proteção de Dados", ordem: 4 },
    { slug: "gestao-riscos", name: "Gestão de Riscos de Segurança", ordem: 5 },
    { slug: "iso-27001", name: "ISO 27001 e Normas de SI", ordem: 6 },
    { slug: "forense-digital", name: "Forense Digital e Resposta a Incidentes", ordem: 7 },
  ],
  "banco-de-dados": [
    { slug: "modelagem-er", name: "Modelagem Entidade-Relacionamento (ER)", ordem: 1 },
    { slug: "normalizacao", name: "Normalização — 1FN, 2FN, 3FN, BCNF", ordem: 2 },
    { slug: "sql", name: "SQL — SELECT, JOIN, GROUP BY, Subconsultas", ordem: 3 },
    { slug: "transacoes-acid", name: "Transações e Propriedades ACID", ordem: 4 },
    { slug: "nosql", name: "NoSQL — Tipos e Casos de Uso", ordem: 5 },
    { slug: "sgbd", name: "SGBDs (PostgreSQL, MySQL, Oracle)", ordem: 6 },
  ],
  "engenharia-de-software": [
    { slug: "metodologias-ageis", name: "SCRUM, Kanban e Metodologias Ágeis", ordem: 1 },
    { slug: "uml", name: "UML — Diagramas (Caso de Uso, Classe, Sequência)", ordem: 2 },
    { slug: "padroes-projeto", name: "Padrões de Projeto (Design Patterns)", ordem: 3 },
    { slug: "devops", name: "DevOps, CI/CD e Contêineres (Docker/K8s)", ordem: 4 },
    { slug: "requisitos", name: "Levantamento e Gestão de Requisitos", ordem: 5 },
    { slug: "qualidade-software", name: "Qualidade e Testes de Software", ordem: 6 },
  ],
  "governanca-de-ti": [
    { slug: "cobit", name: "COBIT — Governança e Gestão de TI", ordem: 1 },
    { slug: "itil", name: "ITIL — Gestão de Serviços de TI", ordem: 2 },
    { slug: "iso-38500", name: "ISO/IEC 38500 e Governança Corporativa de TI", ordem: 3 },
    { slug: "pdti", name: "PDTI e Planejamento Estratégico de TI", ordem: 4 },
    { slug: "lgpd-governanca", name: "LGPD e Governança de Dados", ordem: 5 },
  ],
  "algoritmos-e-estruturas-de-dados": [
    { slug: "complexidade", name: "Complexidade de Algoritmos (Big O)", ordem: 1 },
    { slug: "estruturas-lineares", name: "Estruturas Lineares (Listas, Pilhas, Filas)", ordem: 2 },
    { slug: "arvores-grafos", name: "Árvores Binárias e Grafos", ordem: 3 },
    { slug: "ordenacao-busca", name: "Algoritmos de Ordenação e Busca", ordem: 4 },
    { slug: "recursao", name: "Recursão e Programação Dinâmica", ordem: 5 },
    { slug: "hashing", name: "Hashing e Tabelas Hash", ordem: 6 },
  ],
  "arquitetura-de-computadores": [
    { slug: "representacao-dados", name: "Representação de Dados (binário, hex, octal)", ordem: 1 },
    { slug: "componentes-hardware", name: "Componentes de Hardware (CPU, memória, I/O)", ordem: 2 },
    { slug: "pipeline", name: "Pipeline e Paralelismo", ordem: 3 },
    { slug: "memoria-cache", name: "Memória Cache e Hierarquia", ordem: 4 },
    { slug: "sistemas-operacionais", name: "Fundamentos de Sistemas Operacionais", ordem: 5 },
  ],
  "desenvolvimento-web": [
    { slug: "html-css", name: "HTML5 e CSS3 — Estrutura e Estilo", ordem: 1 },
    { slug: "javascript", name: "JavaScript — Fundamentos e ES6+", ordem: 2 },
    { slug: "frameworks-frontend", name: "Frameworks Frontend (React, Angular, Vue)", ordem: 3 },
    { slug: "backend-api", name: "Backend e APIs REST/GraphQL", ordem: 4 },
    { slug: "seguranca-web", name: "Segurança em Aplicações Web (XSS, CSRF, SQL Injection)", ordem: 5 },
    { slug: "cloud", name: "Cloud Computing — AWS, Azure, GCP", ordem: 6 },
  ],

  // ══ TRIBUTÁRIO/AUDITORIA ══════════════════════════════════════════════════
  "direito-constitucional-trib": [
    { slug: "sistema-tributario-cf", name: "Sistema Tributário na CF/88", ordem: 1 },
    { slug: "imunidades-tributarias", name: "Imunidades Tributárias", ordem: 2 },
    { slug: "competencia-tributaria", name: "Competência Tributária dos Entes", ordem: 3 },
    { slug: "adm-publica-cf", name: "Administração Pública na CF/88", ordem: 4 },
  ],
  "lingua-portuguesa-trib": [
    { slug: "interpretacao", name: "Interpretação de Textos Oficiais e Jurídicos", ordem: 1 },
    { slug: "gramatica", name: "Gramática e Norma Culta", ordem: 2 },
    { slug: "redacao-relatorio", name: "Redação de Relatórios e Pareceres", ordem: 3 },
  ],
  "direito-administrativo-trib": [
    { slug: "principios", name: "Princípios Administrativos", ordem: 1 },
    { slug: "controle-adm", name: "Controle da Administração Pública", ordem: 2 },
    { slug: "processo-adm-trib", name: "Processo Administrativo Tributário", ordem: 3 },
    { slug: "lei-responsabilidade", name: "Lei de Responsabilidade Fiscal", ordem: 4 },
  ],
  "raciocinio-logico-trib": [
    { slug: "logica-proposicional", name: "Lógica Proposicional", ordem: 1 },
    { slug: "matematica-financeira", name: "Matemática Financeira — Juros e Amortização", ordem: 2 },
    { slug: "estatistica", name: "Estatística e Probabilidade", ordem: 3 },
    { slug: "analise-dados", name: "Análise e Interpretação de Dados", ordem: 4 },
  ],

  // ══ VESTIBULAR ════════════════════════════════════════════════════════════
  "matematica-vestibular": [
    { slug: "algebra-funcoes", name: "Álgebra e Funções", ordem: 1 },
    { slug: "geometria-plana", name: "Geometria Plana", ordem: 2 },
    { slug: "geometria-espacial", name: "Geometria Espacial", ordem: 3 },
    { slug: "geometria-analitica", name: "Geometria Analítica", ordem: 4 },
    { slug: "trigonometria", name: "Trigonometria", ordem: 5 },
    { slug: "estatistica-probabilidade", name: "Estatística e Probabilidade", ordem: 6 },
    { slug: "combinatoria", name: "Análise Combinatória", ordem: 7 },
    { slug: "numeros-complexos", name: "Números Complexos e Matrizes", ordem: 8 },
  ],
  "fisica-vestibular": [
    { slug: "mecanica", name: "Mecânica Clássica (Cinemática e Dinâmica)", ordem: 1 },
    { slug: "termodinamica", name: "Termodinâmica", ordem: 2 },
    { slug: "ondas-acustica", name: "Ondas e Acústica", ordem: 3 },
    { slug: "optica", name: "Óptica Geométrica", ordem: 4 },
    { slug: "eletromagnetismo", name: "Eletromagnetismo", ordem: 5 },
    { slug: "fisica-moderna", name: "Física Moderna — Relatividade e Quântica", ordem: 6 },
  ],
  "quimica-vestibular": [
    { slug: "estequiometria", name: "Estequiometria e Cálculo Químico", ordem: 1 },
    { slug: "quimica-organica", name: "Química Orgânica — Funções e Reações", ordem: 2 },
    { slug: "solucoes", name: "Soluções e Propriedades Coligativas", ordem: 3 },
    { slug: "eletroquimica", name: "Eletroquímica — Pilhas e Eletrólise", ordem: 4 },
    { slug: "equilibrio-quimico", name: "Equilíbrio Químico e Cinética", ordem: 5 },
    { slug: "tabela-periodica", name: "Tabela Periódica e Ligações Químicas", ordem: 6 },
  ],
  "biologia-vestibular": [
    { slug: "citologia", name: "Citologia e Organelas Celulares", ordem: 1 },
    { slug: "bioquimica", name: "Bioquímica — Carboidratos, Proteínas, DNA", ordem: 2 },
    { slug: "genetica", name: "Genética Mendeliana e Molecular", ordem: 3 },
    { slug: "evolucao", name: "Evolução Biológica e Especiação", ordem: 4 },
    { slug: "ecologia", name: "Ecologia — Cadeias, Biomas, Impactos", ordem: 5 },
    { slug: "fisiologia-animal", name: "Fisiologia Animal Humana", ordem: 6 },
    { slug: "fisiologia-vegetal", name: "Fisiologia Vegetal", ordem: 7 },
  ],
  "historia-vestibular": [
    { slug: "pre-historia", name: "Pré-História e Primeiras Civilizações", ordem: 1 },
    { slug: "idade-media", name: "Idade Média e Feudalismo", ordem: 2 },
    { slug: "idade-moderna", name: "Expansão Europeia e Mercantilismo", ordem: 3 },
    { slug: "revolucoes", name: "Revoluções Burguesas e Industriais", ordem: 4 },
    { slug: "guerras-mundiais", name: "Guerras Mundiais e Período Entreguerras", ordem: 5 },
    { slug: "pos-guerra", name: "Guerra Fria e Mundo Contemporâneo", ordem: 6 },
    { slug: "historia-brasil-vest", name: "História do Brasil — Período Colonial ao Atual", ordem: 7 },
  ],
  "geografia-vestibular": [
    { slug: "geomorfologia", name: "Geomorfologia e Relevo", ordem: 1 },
    { slug: "climatologia", name: "Climatologia e Hidrografia", ordem: 2 },
    { slug: "geopolitica", name: "Geopolítica Mundial", ordem: 3 },
    { slug: "urbanizacao", name: "Urbanização e Industrialização", ordem: 4 },
    { slug: "populacao-migracao", name: "População e Migrações", ordem: 5 },
    { slug: "brasil-vest", name: "Geografia do Brasil", ordem: 6 },
  ],
  "portugues-e-literatura-vestibular": [
    { slug: "interpretacao", name: "Interpretação e Análise de Textos", ordem: 1 },
    { slug: "gramatica-avancada", name: "Gramática Avançada", ordem: 2 },
    { slug: "literatura-brasileira", name: "Literatura Brasileira — Escolas e Obras", ordem: 3 },
    { slug: "literatura-portuguesa", name: "Literatura Portuguesa", ordem: 4 },
    { slug: "redacao-vest", name: "Redação Vestibular", ordem: 5 },
  ],
  "redacao-vestibular": [
    { slug: "dissertacao-argumentativa", name: "Dissertação Argumentativa", ordem: 1 },
    { slug: "argumentacao", name: "Argumentação e Tese", ordem: 2 },
    { slug: "proposta-intervencao", name: "Proposta de Intervenção", ordem: 3 },
    { slug: "repertorio-cultural", name: "Repertório Cultural e Sociocultural", ordem: 4 },
  ],
};

// ─── Funções auxiliares ───────────────────────────────────────────────────────

async function upsertTopic(topic) {
  const { data: existing } = await db
    .from("Topic")
    .select("id")
    .eq("subjectId", topic.subjectId)
    .eq("slug", topic.slug)
    .maybeSingle();

  const payload = {
    subjectId: topic.subjectId,
    name: topic.name,
    slug: topic.slug,
    description: topic.description ?? null,
    ordem: topic.ordem,
  };

  if (existing) {
    const { error } = await db.from("Topic").update(payload).eq("id", existing.id);
    if (error) { console.error(`    ❌ ${topic.slug}:`, error.message); return; }
    process.stdout.write("·");
  } else {
    const { error } = await db.from("Topic").insert({ ...payload, id: randomUUID() });
    if (error) { console.error(`    ❌ ${topic.slug}:`, error.message); return; }
    process.stdout.write("+");
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("📚 Verificando tabela Topic...");
  const { error: tableErr } = await db.from("Topic").select("id").limit(1);
  if (tableErr) {
    console.error("❌ Tabela Topic não existe. Execute a migration SQL primeiro.");
    process.exit(1);
  }

  const { data: subjects } = await db.from("Subject").select("id, slug, name, categoria").order("categoria");
  console.log(`✅ ${subjects.length} matérias encontradas\n`);

  let semTopicos = [];

  for (const subject of subjects) {
    const topicsForSubject = TOPICS_BY_SUBJECT[subject.slug];

    if (!topicsForSubject || topicsForSubject.length === 0) {
      semTopicos.push(`${subject.slug} (${subject.categoria})`);
      continue;
    }

    process.stdout.write(`  📖 ${subject.name} [${topicsForSubject.length}] `);
    for (const topic of topicsForSubject) {
      await upsertTopic({ subjectId: subject.id, ...topic });
    }
    console.log(" ✅");
  }

  const { count } = await db.from("Topic").select("*", { count: "exact", head: true });

  if (semTopicos.length > 0) {
    console.log(`\n⚠️  ${semTopicos.length} matérias sem tópicos definidos (ficarão com tópico "Geral"):`);
    for (const s of semTopicos) console.log(`   - ${s}`);

    // Cria tópico "Geral" para as matérias sem mapeamento
    for (const subject of subjects) {
      if (!TOPICS_BY_SUBJECT[subject.slug]) {
        await upsertTopic({ subjectId: subject.id, slug: "geral", name: "Geral", ordem: 1 });
      }
    }
  }

  console.log(`\n🎉 Concluído! ${count} tópicos no banco de dados.`);
}

main().catch(console.error);
