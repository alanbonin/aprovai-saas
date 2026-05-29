import { getPersona } from "@/lib/mentor-personas";

export const CATEGORIAS = [
  {
    id: "tributario-auditoria",
    label: "Tributário e Auditoria",
    icon: "🏛️",
    description: "Receita Federal, SEFAZ, Auditor Fiscal, Agente Tributário",
    cargos: ["Auditor Fiscal da Receita Federal", "Analista Tributário", "Agente Fiscal Estadual", "Auditor SEFAZ", "Fiscal de Rendas"],
  },
  {
    id: "policial",
    label: "Policial",
    icon: "🚔",
    description: "Polícia Federal, Civil, Militar, PRF, Penal",
    cargos: ["Delegado", "Investigador", "Escrivão", "Agente de Polícia", "Perito Criminal", "PRF", "Policial Penal"],
  },
  {
    id: "judiciario",
    label: "Judiciário",
    icon: "⚖️",
    description: "TJ, TRF, TST, STJ, Escrevente, Técnico Judiciário",
    cargos: ["Analista Judiciário", "Técnico Judiciário", "Escrevente", "Oficial de Justiça", "Juiz de Direito"],
  },
  {
    id: "legislativo",
    label: "Legislativo",
    icon: "🏛",
    description: "Câmara, Senado, Assembleias Legislativas, Câmaras Municipais",
    cargos: ["Analista Legislativo", "Técnico Legislativo", "Consultor Legislativo", "Assistente Legislativo"],
  },
  {
    id: "ministerio-publico",
    label: "Ministério Público",
    icon: "📋",
    description: "MP Federal, MP Estadual, Promotor, Procurador",
    cargos: ["Promotor de Justiça", "Analista do MP", "Técnico do MP", "Secretário do MP"],
  },
  {
    id: "procuradoria",
    label: "Procuradoria",
    icon: "📜",
    description: "AGU, PGE, PGM, Advogado Público",
    cargos: ["Advogado da União", "Procurador do Estado", "Procurador Municipal", "Analista da AGU"],
  },
  {
    id: "agencias-reguladoras",
    label: "Agências Reguladoras",
    icon: "📡",
    description: "ANATEL, ANVISA, ANS, ANEEL, ANAC, ANA, ANTAQ",
    cargos: ["Especialista em Regulação", "Analista Administrativo", "Técnico em Regulação"],
  },
  {
    id: "banco-central",
    label: "Banco Central",
    icon: "🏦",
    description: "BCB, Analista e Técnico do Banco Central",
    cargos: ["Analista do Banco Central", "Técnico do Banco Central"],
  },
  {
    id: "gestao-publica",
    label: "Gestão Pública",
    icon: "🗂️",
    description: "Ministérios, Prefeituras, EPPGG, AFIT, ESAF",
    cargos: ["Especialista em Políticas Públicas", "Analista de Planejamento", "Técnico de Gestão", "Administrador Público"],
  },
  {
    id: "saude-publica",
    label: "Saúde Pública",
    icon: "🏥",
    description: "Ministério da Saúde, SUS, Conselhos de Saúde, ANVISA",
    cargos: ["Analista em Saúde", "Técnico em Saúde", "Agente Comunitário", "Fiscal Sanitário"],
  },
  {
    id: "bancos-publicos",
    label: "Bancos Públicos",
    icon: "🏦",
    description: "Banco do Brasil, Caixa Econômica Federal, BNB, BNDES, Basa — os maiores concursos bancários do país",
    cargos: [
      "Escriturário do Banco do Brasil (Agente Comercial)",
      "Escriturário do Banco do Brasil (Agente de Tecnologia)",
      "Técnico Bancário da Caixa Econômica Federal",
      "Analista Bancário CEF",
      "Analista do BNB",
      "Analista do BNDES",
      "Técnico Bancário do BASA",
    ],
    materias: [
      "Língua Portuguesa",
      "Matemática Financeira",
      "Conhecimentos Bancários",
      "Atualidades do Mercado Financeiro",
      "Técnicas de Vendas e Negociação",
      "Noções de Informática",
      "Inglês",
      "Probabilidade e Estatística",
      "Compliance, Ética e Código de Conduta",
    ],
  },
  {
    id: "petrobras-estatais",
    label: "Petrobras e Estatais",
    icon: "🛢️",
    description: "Petrobras, Correios, Serpro, Infraero, EBSERH — empresas estatais federais com salários acima de R$10k",
    cargos: [
      "Técnico de Exploração de Petróleo (Petrobras)",
      "Analista de Sistemas (Petrobras)",
      "Engenheiro (Petrobras)",
      "Carteiro / Técnico Operacional (Correios)",
      "Analista de Tecnologia (Serpro)",
      "Analista e Técnico (EBSERH)",
    ],
    materias: [
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Matemática",
      "Conhecimentos Específicos por Área",
      "Informática",
      "Legislação Ambiental e Segurança do Trabalho",
    ],
  },
  {
    id: "tecnologia-informacao",
    label: "Tecnologia da Informação",
    icon: "💻",
    description: "TI para todos os concursos — Analista de TI, Perito Digital, Segurança da Informação, Desenvolvimento de Sistemas",
    cargos: [
      "Analista de Tecnologia da Informação",
      "Perito Digital (Polícia Federal)",
      "Especialista em Segurança da Informação",
      "Analista de Sistemas (Serpro, BNDES, BB Tecnologia)",
      "Auditor de TI (TCU, CGU)",
      "Técnico em Suporte de TI",
    ],
    materias: [
      "Redes de Computadores e Segurança",
      "Banco de Dados (SQL, modelagem)",
      "Engenharia de Software",
      "Linguagens de Programação",
      "Governança de TI (ITIL, COBIT)",
      "Cloud Computing e DevOps",
      "Inteligência Artificial e Ciência de Dados",
      "Legislação Digital (LGPD, Marco Civil)",
    ],
  },
  {
    id: "controle-auditoria",
    label: "Controle e Auditoria",
    icon: "🔍",
    description: "TCU, TCE, CGU, IRB — carreiras de controle externo e fiscalização com dos melhores salários do serviço público",
    cargos: [
      "Auditor Federal de Controle Externo (TCU)",
      "Auditor do Tesouro Nacional (STN)",
      "Analista de Finanças e Controle (CGU)",
      "Conselheiro Substituto (TCE)",
      "Analista de Controle Externo (TCE)",
      "Auditor do IRB",
    ],
    materias: [
      "Contabilidade Geral e Governamental",
      "Auditoria Governamental",
      "Direito Administrativo",
      "Direito Financeiro e Orçamentário",
      "Administração Pública",
      "Controle Externo e Interno",
      "Finanças Públicas",
      "Responsabilidade Fiscal (LRF)",
    ],
  },
  {
    id: "previdencia-social",
    label: "Previdência Social",
    icon: "🛡️",
    description: "INSS — 10.000 vagas autorizadas para 2026. Técnico do Seguro Social e carreiras da Previdência",
    cargos: [
      "Técnico do Seguro Social (INSS)",
      "Analista do Seguro Social (INSS)",
      "Perito Médico Federal",
      "Procurador Federal (INSS/AGU)",
    ],
    materias: [
      "Legislação Previdenciária",
      "Direito Administrativo",
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Informática",
      "Direito Constitucional",
      "Ética no Serviço Público",
    ],
  },
  {
    id: "militar",
    label: "Carreiras Militares",
    icon: "🪖",
    description: "EEAR, AFA, EsSA, IME, ITA, Exército, Marinha — carreiras militares com formação e estabilidade",
    cargos: [
      "Especialista da Aeronáutica (EEAR)",
      "Cadete da AFA (Aviação, Intendência, Infantaria)",
      "Sargento do Exército (EsSA)",
      "Aspirante a Oficial (AMAN)",
      "Cadete da Marinha",
      "Aluno do IME / ITA",
    ],
    materias: [
      "Matemática",
      "Física",
      "Química",
      "Língua Portuguesa",
      "Inglês",
      "Biologia",
      "História e Geografia",
      "Aptidão Física e TAF",
    ],
  },
  {
    id: "diplomacia",
    label: "Diplomacia",
    icon: "🌍",
    description: "CACD — Concurso de Admissão à Carreira de Diplomata. 60 vagas, salário inicial R$22.558",
    cargos: [
      "Diplomata / Terceiro Secretário (CACD)",
      "Analista de Relações Internacionais",
      "Assistente de Chancelaria",
    ],
    materias: [
      "Língua Portuguesa e Literatura Brasileira",
      "Inglês",
      "História do Brasil",
      "Política Internacional",
      "Direito Internacional Público",
      "Economia",
      "Geografia",
      "Espanhol ou Francês",
    ],
  },
  {
    id: "ambiental-agro",
    label: "Ambiental e Agronegócio",
    icon: "🌿",
    description: "IBAMA, ICMBio, MAPA, Embrapa — carreiras de meio ambiente, fiscalização e agronegócio",
    cargos: [
      "Analista Ambiental (IBAMA)",
      "Analista Ambiental (ICMBio)",
      "Auditor Fiscal Federal Agropecuário (MAPA)",
      "Pesquisador (Embrapa)",
      "Técnico Ambiental",
      "Fiscal Agropecuário Estadual",
    ],
    materias: [
      "Legislação Ambiental",
      "Direito Ambiental",
      "Biologia e Ecologia",
      "Agronomia / Zootecnia",
      "Gestão Ambiental",
      "Direito Administrativo",
      "Raciocínio Lógico",
    ],
  },
];

export function buildAgentSystemPrompt(categoriaId?: string | null): string {
  const key = categoriaId ?? null;
  const persona = getPersona(key);

  const categoria = CATEGORIAS.find(c => c.id === categoriaId);

  // Começa com a identidade da persona
  let prompt = persona.personality;

  prompt += `\n\nVocê é um mentor especialista em concursos públicos`;

  if (categoria) {
    prompt += ` para a área de **${categoria.label}** (${categoria.description}).`;
    prompt += `\n\nOs cargos que você domina incluem: ${categoria.cargos.join(", ")}.`;
    prompt += `\n\nVocê conhece profundamente o conteúdo programático, os editais mais recentes, as disciplinas cobradas e o perfil de cada cargo dessa área.`;
  }

  prompt += `

Seu papel é:
- Explicar o conteúdo de forma clara e objetiva, com a sua personalidade característica
- Analisar questões e identificar padrões de cobrança
- Indicar os temas mais cobrados para cada cargo
- Dar dicas de estudo e gestão de tempo
- Orientar sobre editais, requisitos e etapas do concurso

REGRAS CRÍTICAS — SIGA SEMPRE:
- NUNCA crie questões, testes ou exercícios no chat. O aplicativo já tem seções dedicadas para isso.
- Quando o aluno precisar praticar com questões, use: [[IR:questoes]]
- Quando sugerir revisão/flashcards, use: [[IR:flashcards]]
- Quando sugerir simulado, use: [[IR:simulado]]
- Quando sugerir treino de redação, use: [[IR:redacao]]
- Quando falar sobre desempenho/erros, use: [[IR:relatorio]]
- Quando sugerir planejamento de estudos, use: [[IR:plano]]
- Quando mencionar edital ou conteúdo programático, use: [[IR:edital]]
- Quando sugerir desafio rápido, use: [[IR:desafio]]
- Coloque o marcador [[IR:X]] no final da frase/parágrafo onde sugere a ação. O app converte automaticamente em botão clicável para o aluno.
- Você PODE usar múltiplos marcadores numa mesma resposta, cada um em contexto diferente.

Exemplo correto: "Para fixar esse conteúdo, resolva questões sobre o tema [[IR:questoes]] e depois reforce com flashcards [[IR:flashcards]]."

Seja direto, prático e foque no que realmente cai em prova. Mantenha sempre sua identidade como ${persona.personaName}. Responda sempre em português brasileiro.`;

  return prompt;
}
