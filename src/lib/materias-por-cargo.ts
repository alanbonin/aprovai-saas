/**
 * Mapeamento de matérias exigidas por cargo/concurso.
 * Fonte: análise de editais reais (2021-2025).
 *
 * Cada entrada tem:
 *   - materias: lista de matérias obrigatórias (nome exato como está no DB)
 *   - materiasEstaduais: matérias que variam por estado (legislação específica)
 *   - observacoes: notas importantes sobre o cargo
 */

export interface MateriasCargo {
  materias: string[];
  materiasEstaduais?: string[];
  legislacaoEstadual?: boolean;
  observacoes?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAPEAMENTO PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

export const MATERIAS_POR_CARGO: Record<string, MateriasCargo> = {

  // ══════════════════════════════════════════════════
  // FISCAL / TRIBUTÁRIO
  // ══════════════════════════════════════════════════

  "auditor-rfb": {
    materias: [
      "Língua Portuguesa",
      "Língua Inglesa",
      "Raciocínio Lógico",
      "Direito Constitucional",
      "Direito Administrativo",
      "Direito Tributário",
      "Direito Penal",          // crimes contra a ordem tributária
      "Contabilidade Geral",
      "Contabilidade Pública",
      "Economia",
      "Finanças Públicas",
      "Administração Geral",
      "Ética no Serviço Público",
      "Legislação Específica",   // legislação aduaneira, RFB
    ],
    observacoes: "Banca FGV (último edital 2022). 140 questões divididas em 16 disciplinas. Inclui comércio internacional e legislação aduaneira específica da RFB. Uma das provas mais difíceis do país.",
  },

  "analista-rfb": {
    materias: [
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Direito Constitucional",
      "Direito Administrativo",
      "Direito Tributário",
      "Contabilidade Geral",
      "Economia",
      "Finanças Públicas",
      "Administração Geral",
      "Ética no Serviço Público",
      "Legislação Específica",
    ],
    observacoes: "Analista-Tributário RFB. Exige menos profundidade tributária que o Auditor, mas mesmo bloco de disciplinas.",
  },

  "tecnico-rfb": {
    materias: [
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Matemática",
      "Informática",
      "Direito Constitucional",
      "Direito Administrativo",
      "Direito Tributário",
      "Contabilidade Geral",
      "Ética no Serviço Público",
      "Legislação Específica",
    ],
    observacoes: "Técnico de Administração e Finanças RFB. Nível médio/superior. Prova mais simples que Auditor e Analista.",
  },

  "auditor-sefaz": {
    materias: [
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Matemática",
      "Direito Constitucional",
      "Direito Administrativo",
      "Direito Tributário",
      "Contabilidade Geral",
      "Contabilidade Pública",
      "Economia",
      "Finanças Públicas",
      "Administração Pública",
      "Ética no Serviço Público",
      "Legislação Específica",
    ],
    materiasEstaduais: ["Legislação Específica"],
    legislacaoEstadual: true,
    observacoes: "Varia muito por estado. ICMS, ISS e legislação estadual são obrigatórios. Alguns estados exigem Direito Civil e Processual Civil.",
  },

  "analista-sefaz": {
    materias: [
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Matemática",
      "Direito Constitucional",
      "Direito Administrativo",
      "Direito Tributário",
      "Contabilidade Geral",
      "Administração Pública",
      "Ética no Serviço Público",
      "Legislação Específica",
    ],
    materiasEstaduais: ["Legislação Específica"],
    legislacaoEstadual: true,
    observacoes: "Cargo intermediário da SEFAZ estadual. Exigências variam por estado.",
  },

  "tecnico-sefaz": {
    materias: [
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Matemática",
      "Informática",
      "Direito Constitucional",
      "Direito Administrativo",
      "Direito Tributário",
      "Ética no Serviço Público",
      "Legislação Específica",
    ],
    materiasEstaduais: ["Legislação Específica"],
    legislacaoEstadual: true,
    observacoes: "Técnico de nível médio da SEFAZ. Conteúdo mais enxuto.",
  },

  "auditor-iss": {
    materias: [
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Matemática",
      "Direito Constitucional",
      "Direito Administrativo",
      "Direito Tributário",
      "Contabilidade Geral",
      "Legislação Específica",
      "Ética no Serviço Público",
    ],
    materiasEstaduais: ["Legislação Específica"],
    legislacaoEstadual: true,
    observacoes: "Fiscal de ISS/IPTU municipal. Foco em legislação tributária municipal (ISS, IPTU, CTN). Varia muito por município.",
  },

  // ══════════════════════════════════════════════════
  // JUDICIÁRIO
  // ══════════════════════════════════════════════════

  "analista-stf": {
    materias: [
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Informática",
      "Direito Constitucional",
      "Direito Administrativo",
      "Direito Civil",
      "Direito Processual Civil",
      "Direito Penal",
      "Direito Processual Penal",
      "Direito Previdenciário",
      "Direito Tributário",
      "Ética no Serviço Público",
      "Legislação Específica",
    ],
    observacoes: "Banca FGV. Exige amplo conhecimento jurídico. Legislação interna do STF (Regimento Interno) é cobrada.",
  },

  "tecnico-stf": {
    materias: [
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Matemática",
      "Informática",
      "Direito Constitucional",
      "Direito Administrativo",
      "Ética no Serviço Público",
      "Legislação Específica",
    ],
    observacoes: "Banca FGV. Nível médio. Conteúdo mais básico que o analista.",
  },

  "analista-stj": {
    materias: [
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Informática",
      "Direito Constitucional",
      "Direito Administrativo",
      "Direito Civil",
      "Direito Processual Civil",
      "Direito Penal",
      "Direito Processual Penal",
      "Direito Previdenciário",
      "Direito Tributário",
      "Ética no Serviço Público",
      "Legislação Específica",
    ],
    observacoes: "Banca CESPE. Último edital 2024. Regimento Interno do STJ cobrado.",
  },

  "tecnico-stj": {
    materias: [
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Matemática",
      "Informática",
      "Direito Constitucional",
      "Direito Administrativo",
      "Ética no Serviço Público",
      "Legislação Específica",
    ],
    observacoes: "Banca CESPE. Nível médio.",
  },

  "analista-tse": {
    materias: [
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Informática",
      "Direito Constitucional",
      "Direito Administrativo",
      "Direito Eleitoral",
      "Direito Civil",
      "Direito Processual Civil",
      "Direito Penal",
      "Direito Processual Penal",
      "Ética no Serviço Público",
      "Legislação Específica",
    ],
    observacoes: "Banca FCC. Direito Eleitoral tem peso significativo por ser o TSE.",
  },

  "analista-tst": {
    materias: [
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Informática",
      "Direito Constitucional",
      "Direito Administrativo",
      "Direito do Trabalho",
      "Direito Processual Civil",
      "Direito Civil",
      "Ética no Serviço Público",
      "Legislação Específica",
    ],
    observacoes: "Banca FCC. Direito do Trabalho e Processo do Trabalho têm alto peso por ser o TST.",
  },

  "tecnico-tst": {
    materias: [
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Matemática",
      "Informática",
      "Direito Constitucional",
      "Direito Administrativo",
      "Direito do Trabalho",
      "Ética no Serviço Público",
    ],
    observacoes: "Banca FCC. Nível médio. Inclui noções de CLT.",
  },

  "analista-trf": {
    materias: [
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Informática",
      "Direito Constitucional",
      "Direito Administrativo",
      "Direito Civil",
      "Direito Processual Civil",
      "Direito Penal",
      "Direito Processual Penal",
      "Direito Previdenciário",
      "Direito Tributário",
      "Ética no Serviço Público",
      "Legislação Específica",
    ],
    observacoes: "Banca varia por região (CESPE, FCC, FGV). Regimento Interno do TRF cobrado.",
  },

  "tecnico-trf": {
    materias: [
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Matemática",
      "Informática",
      "Direito Constitucional",
      "Direito Administrativo",
      "Ética no Serviço Público",
      "Legislação Específica",
    ],
    observacoes: "Nível médio. Banca varia por região.",
  },

  "analista-trt": {
    materias: [
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Informática",
      "Direito Constitucional",
      "Direito Administrativo",
      "Direito do Trabalho",
      "Direito Processual Civil",
      "Direito Civil",
      "Ética no Serviço Público",
      "Legislação Específica",
    ],
    observacoes: "Banca FCC na maioria dos TRTs. Direito do Trabalho (CLT) é a matéria de maior peso.",
  },

  "tecnico-trt": {
    materias: [
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Matemática",
      "Informática",
      "Direito Constitucional",
      "Direito Administrativo",
      "Direito do Trabalho",
      "Ética no Serviço Público",
    ],
    observacoes: "Banca FCC. Nível médio. Inclui noções de CLT.",
  },

  "analista-tre": {
    materias: [
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Informática",
      "Direito Constitucional",
      "Direito Administrativo",
      "Direito Eleitoral",
      "Direito Civil",
      "Direito Processual Civil",
      "Direito Penal",
      "Ética no Serviço Público",
      "Legislação Específica",
    ],
    materiasEstaduais: ["Legislação Específica"],
    legislacaoEstadual: true,
    observacoes: "Banca FCC. Direito Eleitoral obrigatório. Legislação do TRE do estado.",
  },

  "tecnico-tre": {
    materias: [
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Matemática",
      "Informática",
      "Direito Constitucional",
      "Direito Administrativo",
      "Direito Eleitoral",
      "Ética no Serviço Público",
    ],
    materiasEstaduais: ["Legislação Específica"],
    legislacaoEstadual: true,
    observacoes: "Nível médio. Direito Eleitoral obrigatório.",
  },

  "analista-tj": {
    materias: [
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Informática",
      "Direito Constitucional",
      "Direito Administrativo",
      "Direito Civil",
      "Direito Processual Civil",
      "Direito Penal",
      "Direito Processual Penal",
      "Ética no Serviço Público",
      "Legislação Específica",
    ],
    materiasEstaduais: ["Legislação Específica"],
    legislacaoEstadual: true,
    observacoes: "Banca varia por estado (VUNESP em SP, CESPE em vários). Regimento Interno e Organização Judiciária do estado cobrados.",
  },

  "tecnico-tj": {
    materias: [
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Matemática",
      "Informática",
      "Direito Constitucional",
      "Direito Administrativo",
      "Direito Civil",
      "Direito Processual Civil",
      "Ética no Serviço Público",
      "Legislação Específica",
    ],
    materiasEstaduais: ["Legislação Específica"],
    legislacaoEstadual: true,
    observacoes: "Escrevente/técnico judiciário estadual. Direito Civil e CPC são importantes para rotina cartorária.",
  },

  "oficial-justica-tj": {
    materias: [
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Matemática",
      "Informática",
      "Direito Constitucional",
      "Direito Administrativo",
      "Direito Civil",
      "Direito Processual Civil",
      "Direito Penal",
      "Ética no Serviço Público",
      "Legislação Específica",
    ],
    materiasEstaduais: ["Legislação Específica"],
    legislacaoEstadual: true,
    observacoes: "Foco em CPC (citações, intimações, penhoras). Regimento Interno do TJ cobrado.",
  },

  "analista-tjdft": {
    materias: [
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Informática",
      "Direito Constitucional",
      "Direito Administrativo",
      "Direito Civil",
      "Direito Processual Civil",
      "Direito Penal",
      "Direito Processual Penal",
      "Ética no Serviço Público",
      "Legislação Específica",
    ],
    observacoes: "Banca CESPE. Legislação do TJDFT e LOMAN cobradas.",
  },

  "tecnico-tjdft": {
    materias: [
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Matemática",
      "Informática",
      "Direito Constitucional",
      "Direito Administrativo",
      "Ética no Serviço Público",
      "Legislação Específica",
    ],
    observacoes: "Banca CESPE. Nível médio.",
  },

  // TI dentro do Judiciário
  "ti-jud-stf": { materias: ["Língua Portuguesa","Raciocínio Lógico","Banco de Dados","Redes de Computadores","Segurança da Informação","Engenharia de Software","Governança de TI","Desenvolvimento Web e APIs","Algoritmos e Estruturas de Dados","Legislação Específica"], observacoes: "Banca FGV. Foco em TI com noções de direito e legislação interna do STF." },
  "ti-jud-stj": { materias: ["Língua Portuguesa","Raciocínio Lógico","Banco de Dados","Redes de Computadores","Segurança da Informação","Engenharia de Software","Governança de TI","Desenvolvimento Web e APIs","Algoritmos e Estruturas de Dados","Legislação Específica"], observacoes: "Banca CESPE." },
  "ti-jud-tse": { materias: ["Língua Portuguesa","Raciocínio Lógico","Banco de Dados","Redes de Computadores","Segurança da Informação","Engenharia de Software","Governança de TI","Legislação Específica"], observacoes: "Banca FCC." },
  "ti-jud-tst": { materias: ["Língua Portuguesa","Raciocínio Lógico","Banco de Dados","Redes de Computadores","Segurança da Informação","Engenharia de Software","Governança de TI","Legislação Específica"], observacoes: "Banca FCC." },
  "ti-jud-trf": { materias: ["Língua Portuguesa","Raciocínio Lógico","Banco de Dados","Redes de Computadores","Segurança da Informação","Engenharia de Software","Governança de TI","Algoritmos e Estruturas de Dados","Legislação Específica"], observacoes: "Banca varia por região." },
  "ti-jud-trt": { materias: ["Língua Portuguesa","Raciocínio Lógico","Banco de Dados","Redes de Computadores","Segurança da Informação","Engenharia de Software","Governança de TI","Legislação Específica"], observacoes: "Banca FCC." },
  "ti-jud-tre": { materias: ["Língua Portuguesa","Raciocínio Lógico","Banco de Dados","Redes de Computadores","Segurança da Informação","Engenharia de Software","Governança de TI","Legislação Específica"], materiasEstaduais: ["Legislação Específica"], legislacaoEstadual: true },
  "ti-jud-tj":  { materias: ["Língua Portuguesa","Raciocínio Lógico","Banco de Dados","Redes de Computadores","Segurança da Informação","Engenharia de Software","Governança de TI","Legislação Específica"], materiasEstaduais: ["Legislação Específica"], legislacaoEstadual: true },
  "ti-jud-tjdft": { materias: ["Língua Portuguesa","Raciocínio Lógico","Banco de Dados","Redes de Computadores","Segurança da Informação","Engenharia de Software","Governança de TI","Algoritmos e Estruturas de Dados","Legislação Específica"], observacoes: "Banca CESPE." },

  // ══════════════════════════════════════════════════
  // JURÍDICO / AGU / DPU
  // ══════════════════════════════════════════════════

  "procurador-federal": {
    materias: [
      "Língua Portuguesa",
      "Língua Inglesa",
      "Direito Constitucional",
      "Direito Administrativo",
      "Direito Civil",
      "Direito Processual Civil",
      "Direito Penal",
      "Direito Processual Penal",
      "Direito Tributário",
      "Direito Previdenciário",
      "Direito do Trabalho",
      "Ética no Serviço Público",
      "Legislação Específica",
    ],
    observacoes: "Banca CESPE. Carreira da AGU. Exige bacharelado em Direito e aprovação em OAB. Prova altamente técnica.",
  },

  "advogado-uniao": {
    materias: [
      "Língua Portuguesa",
      "Direito Constitucional",
      "Direito Administrativo",
      "Direito Civil",
      "Direito Processual Civil",
      "Direito Tributário",
      "Direito Previdenciário",
      "Ética no Serviço Público",
      "Legislação Específica",
    ],
    observacoes: "Banca CESPE. AGU. Foco em contencioso da União.",
  },

  "analista-agu": {
    materias: [
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Informática",
      "Direito Constitucional",
      "Direito Administrativo",
      "Administração Geral",
      "Ética no Serviço Público",
      "Legislação Específica",
    ],
    observacoes: "Banca CESPE. Cargo de apoio técnico/administrativo da AGU.",
  },

  "ti-jur-agu": {
    materias: ["Língua Portuguesa","Raciocínio Lógico","Banco de Dados","Redes de Computadores","Segurança da Informação","Engenharia de Software","Governança de TI","Legislação Específica"],
    observacoes: "Banca CESPE.",
  },

  "defensor-dpu": {
    materias: [
      "Língua Portuguesa",
      "Língua Inglesa",
      "Direito Constitucional",
      "Direito Administrativo",
      "Direito Civil",
      "Direito Processual Civil",
      "Direito Penal",
      "Direito Processual Penal",
      "Direito Previdenciário",
      "Direito do Trabalho",
      "Ética no Serviço Público",
      "Legislação Específica",
    ],
    observacoes: "Banca CESPE. Foco em direitos humanos e assistência jurídica gratuita. Estatuto da DPU cobrado.",
  },

  "analista-dpu": {
    materias: [
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Informática",
      "Direito Constitucional",
      "Direito Administrativo",
      "Ética no Serviço Público",
      "Legislação Específica",
    ],
    observacoes: "Banca CESPE. Cargo de apoio da DPU.",
  },

  "ti-jur-dpu": {
    materias: ["Língua Portuguesa","Raciocínio Lógico","Banco de Dados","Redes de Computadores","Segurança da Informação","Engenharia de Software","Governança de TI","Legislação Específica"],
    observacoes: "Banca CESPE.",
  },

  "procurador-pge": {
    materias: [
      "Língua Portuguesa",
      "Direito Constitucional",
      "Direito Administrativo",
      "Direito Civil",
      "Direito Processual Civil",
      "Direito Tributário",
      "Direito Penal",
      "Ética no Serviço Público",
      "Legislação Específica",
    ],
    materiasEstaduais: ["Legislação Específica"],
    legislacaoEstadual: true,
    observacoes: "Varia por estado. VUNESP em SP. Exige bacharelado em Direito. Legislação estadual obrigatória.",
  },

  "defensor-dpe": {
    materias: [
      "Língua Portuguesa",
      "Direito Constitucional",
      "Direito Administrativo",
      "Direito Civil",
      "Direito Processual Civil",
      "Direito Penal",
      "Direito Processual Penal",
      "Direito do Trabalho",
      "Ética no Serviço Público",
      "Legislação Específica",
    ],
    materiasEstaduais: ["Legislação Específica"],
    legislacaoEstadual: true,
    observacoes: "Banca CESPE na maioria. Estatuto da DPE estadual cobrado.",
  },

  "analista-dpe": {
    materias: [
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Informática",
      "Direito Constitucional",
      "Direito Administrativo",
      "Ética no Serviço Público",
      "Legislação Específica",
    ],
    materiasEstaduais: ["Legislação Específica"],
    legislacaoEstadual: true,
    observacoes: "Cargo de apoio da DPE estadual.",
  },

  "juiz-federal": {
    materias: [
      "Língua Portuguesa",
      "Língua Inglesa",
      "Direito Constitucional",
      "Direito Administrativo",
      "Direito Civil",
      "Direito Processual Civil",
      "Direito Penal",
      "Direito Processual Penal",
      "Direito Tributário",
      "Direito Previdenciário",
      "Direito do Trabalho",
      "Ética no Serviço Público",
    ],
    observacoes: "CESPE/FCC/FGV. Exige bacharelado em Direito e 3 anos de atividade jurídica. Prova mais difícil das carreiras jurídicas. Direito Constitucional e Civil com altíssimo peso.",
  },

  "juiz-estadual": {
    materias: [
      "Língua Portuguesa",
      "Direito Constitucional",
      "Direito Administrativo",
      "Direito Civil",
      "Direito Processual Civil",
      "Direito Penal",
      "Direito Processual Penal",
      "Direito do Trabalho",
      "Direito Tributário",
      "Direito Previdenciário",
      "Ética no Serviço Público",
      "Legislação Específica",
    ],
    materiasEstaduais: ["Legislação Específica"],
    legislacaoEstadual: true,
    observacoes: "Banca varia por TJ. 3 anos de atividade jurídica obrigatórios. Legislação estadual e organização judiciária local cobradas.",
  },

  // ══════════════════════════════════════════════════
  // MINISTÉRIO PÚBLICO
  // ══════════════════════════════════════════════════

  "procurador-mpf": {
    materias: [
      "Língua Portuguesa",
      "Língua Inglesa",
      "Direito Constitucional",
      "Direito Administrativo",
      "Direito Civil",
      "Direito Processual Civil",
      "Direito Penal",
      "Direito Processual Penal",
      "Direito Tributário",
      "Direito Eleitoral",
      "Direito do Trabalho",
      "Direito Previdenciário",
      "Ética no Serviço Público",
      "Legislação Específica",
    ],
    observacoes: "Banca CESPE. Carreira extremamente concorrida. 3 anos de atividade jurídica. Tutela coletiva e legislação do MPF cobradas.",
  },

  "analista-mpf": {
    materias: [
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Informática",
      "Direito Constitucional",
      "Direito Administrativo",
      "Administração Geral",
      "Ética no Serviço Público",
      "Legislação Específica",
    ],
    observacoes: "Banca CESPE. Apoio técnico/administrativo do MPF.",
  },

  "promotor-estadual": {
    materias: [
      "Língua Portuguesa",
      "Direito Constitucional",
      "Direito Administrativo",
      "Direito Civil",
      "Direito Processual Civil",
      "Direito Penal",
      "Direito Processual Penal",
      "Direito Eleitoral",
      "Direito do Trabalho",
      "Direito Tributário",
      "Ética no Serviço Público",
      "Legislação Específica",
    ],
    materiasEstaduais: ["Legislação Específica"],
    legislacaoEstadual: true,
    observacoes: "Banca varia por estado. 3 anos de atividade jurídica. Inclui: execução penal, infância e juventude, tutela coletiva, legislação do MP estadual.",
  },

  "analista-mp-est": {
    materias: [
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Informática",
      "Direito Constitucional",
      "Direito Administrativo",
      "Ética no Serviço Público",
      "Legislação Específica",
    ],
    materiasEstaduais: ["Legislação Específica"],
    legislacaoEstadual: true,
    observacoes: "Cargo de apoio do MP estadual.",
  },

  "ti-mp-estadual": {
    materias: ["Língua Portuguesa","Raciocínio Lógico","Banco de Dados","Redes de Computadores","Segurança da Informação","Engenharia de Software","Governança de TI","Legislação Específica"],
    materiasEstaduais: ["Legislação Específica"],
    legislacaoEstadual: true,
  },

  "promotor-mpdft": {
    materias: [
      "Língua Portuguesa",
      "Direito Constitucional",
      "Direito Administrativo",
      "Direito Civil",
      "Direito Processual Civil",
      "Direito Penal",
      "Direito Processual Penal",
      "Direito Eleitoral",
      "Direito Tributário",
      "Ética no Serviço Público",
      "Legislação Específica",
    ],
    observacoes: "Banca CESPE. Legislação do MPDFT e da LOMPU cobradas.",
  },

  "analista-mpdft": {
    materias: [
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Informática",
      "Direito Constitucional",
      "Direito Administrativo",
      "Ética no Serviço Público",
      "Legislação Específica",
    ],
    observacoes: "Banca CESPE.",
  },

  "ti-mpdft": { materias: ["Língua Portuguesa","Raciocínio Lógico","Banco de Dados","Redes de Computadores","Segurança da Informação","Engenharia de Software","Governança de TI","Legislação Específica"], observacoes: "Banca CESPE." },
  "ti-mpf-cargo": { materias: ["Língua Portuguesa","Raciocínio Lógico","Banco de Dados","Redes de Computadores","Segurança da Informação","Engenharia de Software","Governança de TI","Algoritmos e Estruturas de Dados","Legislação Específica"], observacoes: "Banca CESPE." },

  // ══════════════════════════════════════════════════
  // POLICIAL / SEGURANÇA PÚBLICA
  // ══════════════════════════════════════════════════

  "delegado-pf": {
    materias: [
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Direito Constitucional",
      "Direito Administrativo",
      "Direito Penal",
      "Direito Processual Penal",
      "Direito Civil",
      "Medicina Legal",
      "Criminalística",
      "Ética no Serviço Público",
      "Legislação Específica",
    ],
    observacoes: "Banca CESPE. Edital 2021: 123 vagas. Exige bacharelado em Direito. Legislação Especial (Lei de Drogas, Maria da Penha, Estatuto da Criança etc.) cobrada em Direito Penal.",
  },

  "agente-pf": {
    materias: [
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Matemática",
      "Informática",
      "Direito Constitucional",
      "Direito Administrativo",
      "Direito Penal",
      "Direito Processual Penal",
      "Legislação Específica",
      "Ética no Serviço Público",
    ],
    observacoes: "Banca CESPE. Edital 2021: 893 vagas. Nível superior. Bloco de Informática representa ~30% da prova. Contabilidade também aparece em alguns editais.",
  },

  "escrivao-pf": {
    materias: [
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Informática",
      "Direito Constitucional",
      "Direito Administrativo",
      "Direito Penal",
      "Direito Processual Penal",
      "Legislação Específica",
      "Ética no Serviço Público",
    ],
    observacoes: "Banca CESPE. Edital 2021: 400 vagas. Prova prática de digitação obrigatória.",
  },

  "perito-pf": {
    materias: [
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Direito Constitucional",
      "Direito Administrativo",
      "Direito Penal",
      "Medicina Legal",
      "Criminalística",
      "Química",                   
      "Física",
      "Biologia",
      "Legislação Específica",
    ],
    observacoes: "Banca CESPE. Exige diploma em área específica (Medicina, Química, Biologia, TI etc.). Conteúdo varia por especialidade. Biologia, Química e Física são cobradas em especialidades forenses.",
  },

  "papiloscopista-pf": {
    materias: [
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Matemática",
      "Informática",
      "Direito Constitucional",
      "Direito Administrativo",
      "Direito Penal",
      "Criminalística",
      "Medicina Legal",
      "Legislação Específica",
      "Ética no Serviço Público",
    ],
    observacoes: "Banca CESPE. Técnicas de identificação papiloscópica são cobradas. Edital 2021: 84 vagas.",
  },

  "prf": {
    materias: [
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Matemática",
      "Informática",
      "Física",
      "Direito Constitucional",
      "Direito Administrativo",
      "Direito Penal",
      "Direito Processual Penal",
      "Legislação Específica",   // CTB — Código de Trânsito Brasileiro
      "Ética no Serviço Público",
    ],
    observacoes: "Banca CESPE. Último edital 2021. CTB (Código de Trânsito Brasileiro) é matéria específica de alto peso. Física (cinemática veicular) também cobrada. Legislação Especial inclui: Lei de Drogas, Maria da Penha, Desarmamento.",
  },

  "delegado-pc": {
    materias: [
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Direito Constitucional",
      "Direito Administrativo",
      "Direito Penal",
      "Direito Processual Penal",
      "Direito Civil",
      "Medicina Legal",
      "Criminalística",
      "Ética no Serviço Público",
      "Legislação Específica",
    ],
    materiasEstaduais: ["Legislação Específica"],
    legislacaoEstadual: true,
    observacoes: "Nível superior (bacharelado em Direito). Exigências variam por estado: BA exige lei orgânica da PC-BA; SP exige LOBPC. Medicina Legal e Criminalística têm peso alto. Legislação Especial Penal sempre presente.",
  },

  "escrivao-pc": {
    materias: [
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Matemática",
      "Informática",
      "Direito Constitucional",
      "Direito Administrativo",
      "Direito Penal",
      "Direito Processual Penal",
      "Ética no Serviço Público",
      "Legislação Específica",
    ],
    materiasEstaduais: ["Legislação Específica"],
    legislacaoEstadual: true,
    observacoes: "Nível médio ou superior, dependendo do estado. Legislação da PC estadual cobrada.",
  },

  "agente-investigador-pc": {
    materias: [
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Matemática",
      "Informática",
      "Direito Constitucional",
      "Direito Administrativo",
      "Direito Penal",
      "Direito Processual Penal",
      "Medicina Legal",
      "Ética no Serviço Público",
      "Legislação Específica",
    ],
    materiasEstaduais: ["Legislação Específica"],
    legislacaoEstadual: true,
    observacoes: "Varia muito por estado. MG: inclui Lei Orgânica PC-MG, Noções de Criminologia, Informática. SP: inclui Noções de Direitos Humanos. Nível médio ou superior por estado.",
  },

  "perito-pc": {
    materias: [
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Direito Constitucional",
      "Direito Administrativo",
      "Direito Penal",
      "Medicina Legal",
      "Criminalística",
      "Química",                  
      "Biologia",
      "Física",
      "Legislação Específica",
    ],
    materiasEstaduais: ["Legislação Específica"],
    legislacaoEstadual: true,
    observacoes: "Exige diploma na área da especialidade (Medicina, Química, Biologia etc.). Conhecimentos técnicos variam pela especialidade.",
  },

  "papiloscopista-pc": {
    materias: [
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Matemática",
      "Informática",
      "Direito Constitucional",
      "Direito Administrativo",
      "Direito Penal",
      "Criminalística",
      "Legislação Específica",
      "Ética no Serviço Público",
    ],
    materiasEstaduais: ["Legislação Específica"],
    legislacaoEstadual: true,
    observacoes: "Técnicas papiloscópicas e datiloscópicas cobradas. Varia por estado.",
  },

  "pm-soldado": {
    materias: [
      "Língua Portuguesa",
      "Matemática",
      "Raciocínio Lógico",
      "Informática",
      "História do Brasil",
      "Geografia do Brasil",
      "Atualidades",
      "Legislação Específica",
    ],
    materiasEstaduais: ["Legislação Específica"],
    legislacaoEstadual: true,
    observacoes: "Varia muito por estado. SP (FGV): Português, Matemática, Conhecimentos Gerais (História/Geografia), Atualidades, Informática básica, Redação. Inclui TAF e avaliação psicológica. Noções de Direito e Legislação PM estadual podem aparecer.",
  },

  "pm-sargento": {
    materias: [
      "Língua Portuguesa",
      "Matemática",
      "Raciocínio Lógico",
      "Informática",
      "Direito Constitucional",
      "Direito Administrativo",
      "História do Brasil",
      "Atualidades",
      "Legislação Específica",
    ],
    materiasEstaduais: ["Legislação Específica"],
    legislacaoEstadual: true,
    observacoes: "Conteúdo mais denso que soldado. Legislação PM estadual e Regulamento Disciplinar obrigatórios.",
  },

  "pm-oficial": {
    materias: [
      "Língua Portuguesa",
      "Matemática",
      "Raciocínio Lógico",
      "Física",
      "Química",                  
      "Biologia",
      "História do Brasil",
      "Geografia do Brasil",
      "Direito Constitucional",
      "Direito Administrativo",
      "Atualidades",
      "Língua Inglesa",
      "Legislação Específica",
    ],
    materiasEstaduais: ["Legislação Específica"],
    legislacaoEstadual: true,
    observacoes: "CFO — Curso de Formação de Oficiais. Exige ensino médio completo. Prova estilo vestibular com Física, Química e Biologia. Mais complexo que o soldado.",
  },

  "cbm-soldado": {
    materias: [
      "Língua Portuguesa",
      "Matemática",
      "Raciocínio Lógico",
      "Informática",
      "História do Brasil",
      "Geografia do Brasil",
      "Atualidades",
      "Legislação Específica",
    ],
    materiasEstaduais: ["Legislação Específica"],
    legislacaoEstadual: true,
    observacoes: "Similar ao PM Soldado. Inclui Noções de Combate a Incêndio em alguns editais. TAF obrigatório.",
  },

  "cbm-oficial": {
    materias: [
      "Língua Portuguesa",
      "Matemática",
      "Raciocínio Lógico",
      "Física",
      "Química",                  
      "Biologia",
      "História do Brasil",
      "Geografia do Brasil",
      "Direito Constitucional",
      "Direito Administrativo",
      "Atualidades",
      "Legislação Específica",
    ],
    materiasEstaduais: ["Legislação Específica"],
    legislacaoEstadual: true,
    observacoes: "CFO Bombeiros. Conteúdo similar ao PM Oficial com foco em técnicas de bombeiro.",
  },

  "delegado-pcdf": {
    materias: [
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Direito Constitucional",
      "Direito Administrativo",
      "Direito Penal",
      "Direito Processual Penal",
      "Direito Civil",
      "Medicina Legal",
      "Criminalística",
      "Ética no Serviço Público",
      "Legislação Específica",
    ],
    observacoes: "Banca CESPE. Edital 2026 publicado. Legislação da PCDF e do DF cobradas.",
  },

  "agente-pcdf": {
    materias: [
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Matemática",
      "Informática",
      "Direito Constitucional",
      "Direito Administrativo",
      "Direito Penal",
      "Direito Processual Penal",
      "Legislação Específica",
      "Ética no Serviço Público",
    ],
    observacoes: "Banca CESPE. Inclui Agente e Escrivão. Legislação da PCDF cobrada.",
  },

  "pm-pmdf": {
    materias: [
      "Língua Portuguesa",
      "Matemática",
      "Raciocínio Lógico",
      "Informática",
      "Direito Constitucional",
      "Direito Administrativo",
      "História do Brasil",
      "Atualidades",
      "Legislação Específica",
    ],
    observacoes: "Banca CESPE. Legislação da PMDF e do DF cobradas.",
  },

  "cbm-cbmdf": {
    materias: [
      "Língua Portuguesa",
      "Matemática",
      "Raciocínio Lógico",
      "Informática",
      "Direito Constitucional",
      "Direito Administrativo",
      "Atualidades",
      "Legislação Específica",
    ],
    observacoes: "Banca CESPE. Legislação do CBMDF cobrada.",
  },

  "policial-penal": {
    materias: [
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Matemática",
      "Informática",
      "Direito Constitucional",
      "Direito Administrativo",
      "Direito Penal",
      "Direito Processual Penal",
      "Ética no Serviço Público",
      "Legislação Específica",
    ],
    materiasEstaduais: ["Legislação Específica"],
    legislacaoEstadual: true,
    observacoes: "Lei de Execução Penal (Lei 7.210/84) e Lei Orgânica da Polícia Penal estadual são obrigatórias. Noções de Direitos Humanos cobradas em vários editais.",
  },

  // ══════════════════════════════════════════════════
  // BANCÁRIO / FINANCEIRO
  // ══════════════════════════════════════════════════

  "escriturario-bb": {
    materias: [
      "Língua Portuguesa",
      "Língua Inglesa",
      "Raciocínio Lógico",
      "Matemática",
      "Informática",
      "Matemática Financeira",
      "Conhecimentos Bancários",
      "Atualidades",
    ],
    observacoes: "Banca CESGRANRIO. Concurso mais popular do país. Edital 2023: 6.000 vagas. Vendas e Negociação cobradas como parte dos Conhecimentos Específicos. Matemática Financeira inclusa em Conhecimentos Bancários no BB.",
  },

  "analista-bb": {
    materias: [
      "Língua Portuguesa",
      "Língua Inglesa",
      "Raciocínio Lógico",
      "Matemática",
      "Informática",
      "Matemática Financeira",
      "Conhecimentos Bancários",
      "Mercado de Capitais",
      "Administração Geral",
      "Economia",
      "Contabilidade Geral",
    ],
    observacoes: "Banca CESGRANRIO. Nível superior. Mais profundo que o escriturário.",
  },

  "tecnico-cef": {
    materias: [
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Matemática",
      "Informática",
      "Matemática Financeira",
      "Conhecimentos Bancários",
      "Atualidades",
    ],
    observacoes: "Banca CESGRANRIO. Técnico Bancário Nova Série (TBNS). Conhecimentos sobre habitação e FGTS por ser a CEF.",
  },

  "analista-cef": {
    materias: [
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Matemática",
      "Informática",
      "Matemática Financeira",
      "Conhecimentos Bancários",
      "Mercado de Capitais",
      "Administração Geral",
      "Contabilidade Geral",
      "Economia",
    ],
    observacoes: "Banca CESGRANRIO. Nível superior. Inclui área específica (Negócios, TI, Engenharia etc.).",
  },

  "analista-bacen": {
    materias: [
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Direito Constitucional",
      "Direito Administrativo",
      "Economia",
      "Matemática Financeira",
      "Mercado de Capitais",
      "Conhecimentos Bancários",
      "Contabilidade Geral",
      "Finanças Públicas",
      "Administração Geral",
      "Ética no Serviço Público",
      "Legislação Específica",
    ],
    observacoes: "Banca CESPE. Atual 'Auditor do BCB'. Área Economia e Finanças: foco em macroeconomia, microeconomia, COSIF. Seleção extremamente concorrida.",
  },

  "tecnico-bacen": {
    materias: [
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Matemática",
      "Informática",
      "Direito Constitucional",
      "Direito Administrativo",
      "Conhecimentos Bancários",
      "Ética no Serviço Público",
      "Legislação Específica",
    ],
    observacoes: "Banca CESPE. Nível médio. Apoio técnico do Banco Central.",
  },

  "ti-banc-bacen": {
    materias: ["Língua Portuguesa","Raciocínio Lógico","Banco de Dados","Redes de Computadores","Segurança da Informação","Engenharia de Software","Governança de TI","Algoritmos e Estruturas de Dados","Legislação Específica"],
    observacoes: "Banca CESPE. Alta exigência em TI.",
  },

  "analista-bndes": {
    materias: [
      "Língua Portuguesa",
      "Língua Inglesa",
      "Raciocínio Lógico",
      "Direito Constitucional",
      "Direito Administrativo",
      "Economia",
      "Mercado de Capitais",
      "Contabilidade Geral",
      "Finanças Públicas",
      "Administração Geral",
      "Ética no Serviço Público",
      "Legislação Específica",
    ],
    observacoes: "Banca CESGRANRIO. Alto nível de exigência. Inclui Análise de Projetos de Investimento e Desenvolvimento Econômico.",
  },

  "tecnico-bndes": {
    materias: [
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Matemática",
      "Informática",
      "Direito Constitucional",
      "Direito Administrativo",
      "Administração Geral",
      "Ética no Serviço Público",
    ],
    observacoes: "Banca CESGRANRIO. Nível médio.",
  },

  "ti-banc-bndes": {
    materias: ["Língua Portuguesa","Raciocínio Lógico","Banco de Dados","Redes de Computadores","Segurança da Informação","Engenharia de Software","Governança de TI","Desenvolvimento Web e APIs","Algoritmos e Estruturas de Dados"],
    observacoes: "Banca CESGRANRIO.",
  },

  "analista-brb": {
    materias: [
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Matemática",
      "Informática",
      "Matemática Financeira",
      "Conhecimentos Bancários",
      "Atualidades",
      "Administração Geral",
    ],
    observacoes: "Banca IADES. Banco de Brasília. Similar ao escriturário BB.",
  },

  "tecnico-banco-est": {
    materias: [
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Matemática",
      "Informática",
      "Matemática Financeira",
      "Conhecimentos Bancários",
      "Atualidades",
    ],
    materiasEstaduais: ["Legislação Específica"],
    legislacaoEstadual: true,
    observacoes: "BANESE (SE), BANRISUL (RS), BANPARÁ (PA) etc. Conteúdo similar ao BB, com legislação estadual do banco.",
  },

  // ══════════════════════════════════════════════════
  // CONTROLE / AUDITORIA
  // ══════════════════════════════════════════════════

  "auditor-tcu": {
    materias: [
      "Língua Portuguesa",
      "Língua Inglesa",
      "Raciocínio Lógico",
      "Direito Constitucional",
      "Direito Administrativo",
      "Direito Penal",
      "Direito Civil",
      "Direito Processual Civil",
      "Contabilidade Geral",
      "Contabilidade Pública",
      "Finanças Públicas",
      "Administração Geral",
      "Administração Pública",
      "Economia",
      "Auditoria Governamental",
      "Controle Externo",
      "Licitações e Contratos",
      "Ética no Serviço Público",
    ],
    observacoes: "Banca FGV. Um dos concursos mais difíceis do Brasil. ~20 disciplinas. Auditoria Governamental e Controle Externo com altíssimo peso. Legislação do TCU cobrada.",
  },

  "analista-tcu": {
    materias: [
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Direito Constitucional",
      "Direito Administrativo",
      "Contabilidade Geral",
      "Contabilidade Pública",
      "Finanças Públicas",
      "Administração Pública",
      "Auditoria Governamental",
      "Controle Externo",
      "Ética no Serviço Público",
    ],
    observacoes: "Banca FGV/CESPE. Apoio técnico especializado.",
  },

  "tecnico-tcu": {
    materias: [
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Matemática",
      "Informática",
      "Direito Constitucional",
      "Direito Administrativo",
      "Administração Pública",
      "Ética no Serviço Público",
      "Legislação Específica",
    ],
    observacoes: "Banca CESPE. Nível médio.",
  },

  "auditor-cgu": {
    materias: [
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Direito Constitucional",
      "Direito Administrativo",
      "Contabilidade Geral",
      "Contabilidade Pública",
      "Finanças Públicas",
      "Administração Pública",
      "Administração Geral",
      "Auditoria Governamental",
      "Controle Externo",
      "Licitações e Contratos",
      "Ética no Serviço Público",
    ],
    observacoes: "Banca CESPE. Controle interno do Executivo Federal. Corrupção e transparência têm peso elevado.",
  },

  "analista-cgu": {
    materias: [
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Informática",
      "Direito Constitucional",
      "Direito Administrativo",
      "Contabilidade Pública",
      "Finanças Públicas",
      "Administração Pública",
      "Ética no Serviço Público",
      "Legislação Específica",
    ],
    observacoes: "Banca CESPE.",
  },

  "auditor-tce": {
    materias: [
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Direito Constitucional",
      "Direito Administrativo",
      "Contabilidade Geral",
      "Contabilidade Pública",
      "Finanças Públicas",
      "Administração Pública",
      "Auditoria Governamental",
      "Controle Externo",
      "Licitações e Contratos",
      "Ética no Serviço Público",
      "Legislação Específica",
    ],
    materiasEstaduais: ["Legislação Específica"],
    legislacaoEstadual: true,
    observacoes: "Varia por estado. Legislação orgânica do TCE estadual cobrada.",
  },

  "analista-tce": {
    materias: [
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Matemática",
      "Informática",
      "Direito Constitucional",
      "Direito Administrativo",
      "Administração Pública",
      "Contabilidade Pública",
      "Ética no Serviço Público",
      "Legislação Específica",
    ],
    materiasEstaduais: ["Legislação Específica"],
    legislacaoEstadual: true,
  },

  "ti-ctrl-tcu": { materias: ["Língua Portuguesa","Raciocínio Lógico","Banco de Dados","Redes de Computadores","Segurança da Informação","Engenharia de Software","Governança de TI","Algoritmos e Estruturas de Dados","Controle Externo","Legislação Específica"], observacoes: "Banca FGV/CESPE. TI com foco em auditoria de sistemas." },
  "ti-ctrl-cgu": { materias: ["Língua Portuguesa","Raciocínio Lógico","Banco de Dados","Redes de Computadores","Segurança da Informação","Engenharia de Software","Governança de TI","Algoritmos e Estruturas de Dados","Legislação Específica"], observacoes: "Banca CESPE." },
  "ti-ctrl-tce": { materias: ["Língua Portuguesa","Raciocínio Lógico","Banco de Dados","Redes de Computadores","Segurança da Informação","Engenharia de Software","Governança de TI","Legislação Específica"], materiasEstaduais: ["Legislação Específica"], legislacaoEstadual: true },

  // ══════════════════════════════════════════════════
  // PREVIDÊNCIA SOCIAL
  // ══════════════════════════════════════════════════

  "tecnico-inss": {
    materias: [
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Matemática",
      "Informática",
      "Direito Constitucional",
      "Direito Administrativo",
      "Direito Previdenciário",
      "Ética no Serviço Público",
      "Legislação Específica",
    ],
    observacoes: "Banca CESPE. Último edital 2022. Direito Previdenciário (Regime Geral, benefícios, custeio) é a matéria de maior peso. Noções de Direito Civil também cobradas.",
  },

  "analista-inss": {
    materias: [
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Informática",
      "Direito Constitucional",
      "Direito Administrativo",
      "Direito Previdenciário",
      "Direito Civil",
      "Administração Pública",
      "Ética no Serviço Público",
      "Legislação Específica",
    ],
    observacoes: "Banca CESPE. Nível superior. Mais aprofundado que o técnico.",
  },

  "perito-inss": {
    materias: [
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Direito Previdenciário",
      "Medicina Legal",
      "Biologia",
      "Legislação Específica",
      "Ética no Serviço Público",
    ],
    observacoes: "Banca CESPE. Exige diploma em Medicina. Avaliação de incapacidade laboral e benefícios por incapacidade.",
  },

  "ti-prev-inss": { materias: ["Língua Portuguesa","Raciocínio Lógico","Banco de Dados","Redes de Computadores","Segurança da Informação","Engenharia de Software","Governança de TI","Algoritmos e Estruturas de Dados","Legislação Específica"], observacoes: "Banca CESPE." },

  // ══════════════════════════════════════════════════
  // TECNOLOGIA DA INFORMAÇÃO
  // ══════════════════════════════════════════════════

  "analista-serpro": {
    materias: [
      "Língua Portuguesa",
      "Língua Inglesa",
      "Raciocínio Lógico",
      "Banco de Dados",
      "Redes de Computadores",
      "Segurança da Informação",
      "Engenharia de Software",
      "Governança de TI",
      "Desenvolvimento Web e APIs",
      "Algoritmos e Estruturas de Dados",
      "Legislação Específica",
    ],
    observacoes: "Banca CESPE. Edital 2023: 602 vagas. Nível superior. Cloud computing, DevOps, linguagens de programação (Java, Python) e LGPD cobrados.",
  },

  "tecnico-serpro": {
    materias: [
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Banco de Dados",
      "Redes de Computadores",
      "Segurança da Informação",
      "Engenharia de Software",
      "Legislação Específica",
    ],
    observacoes: "Banca CESPE. Nível médio técnico.",
  },

  "analista-dataprev": {
    materias: [
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Banco de Dados",
      "Redes de Computadores",
      "Segurança da Informação",
      "Engenharia de Software",
      "Governança de TI",
      "Desenvolvimento Web e APIs",
      "Algoritmos e Estruturas de Dados",
      "Legislação Específica",
    ],
    observacoes: "Banca CESPE. Empresa de TI da Previdência Social. Inclui noções de Direito Previdenciário.",
  },

  "analista-ti-gov": {
    materias: [
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Banco de Dados",
      "Redes de Computadores",
      "Segurança da Informação",
      "Engenharia de Software",
      "Governança de TI",
      "Desenvolvimento Web e APIs",
      "Algoritmos e Estruturas de Dados",
      "Direito Administrativo",
      "Ética no Serviço Público",
      "Legislação Específica",
    ],
    observacoes: "Concurso Nacional Unificado e concursos de ministérios/autarquias federais. Banca CESPE na maioria. Noções de direito e administração pública obrigatórias.",
  },

  "analista-ti-trf": { materias: ["Língua Portuguesa","Raciocínio Lógico","Banco de Dados","Redes de Computadores","Segurança da Informação","Engenharia de Software","Governança de TI","Algoritmos e Estruturas de Dados","Legislação Específica"], observacoes: "Banca CESPE." },
  "analista-ti-bb":  { materias: ["Língua Portuguesa","Raciocínio Lógico","Banco de Dados","Redes de Computadores","Segurança da Informação","Engenharia de Software","Governança de TI","Desenvolvimento Web e APIs","Algoritmos e Estruturas de Dados"], observacoes: "Banca CESGRANRIO." },
  "analista-ti-cef": { materias: ["Língua Portuguesa","Raciocínio Lógico","Banco de Dados","Redes de Computadores","Segurança da Informação","Engenharia de Software","Governança de TI","Desenvolvimento Web e APIs","Algoritmos e Estruturas de Dados"], observacoes: "Banca CESGRANRIO." },

  "ti-stf":  { materias: ["Língua Portuguesa","Raciocínio Lógico","Banco de Dados","Redes de Computadores","Segurança da Informação","Engenharia de Software","Governança de TI","Algoritmos e Estruturas de Dados","Legislação Específica"], observacoes: "Banca FGV." },
  "ti-stj":  { materias: ["Língua Portuguesa","Raciocínio Lógico","Banco de Dados","Redes de Computadores","Segurança da Informação","Engenharia de Software","Governança de TI","Algoritmos e Estruturas de Dados","Legislação Específica"], observacoes: "Banca CESPE." },
  "ti-tse":  { materias: ["Língua Portuguesa","Raciocínio Lógico","Banco de Dados","Redes de Computadores","Segurança da Informação","Engenharia de Software","Governança de TI","Legislação Específica"], observacoes: "Banca FCC." },
  "ti-tst":  { materias: ["Língua Portuguesa","Raciocínio Lógico","Banco de Dados","Redes de Computadores","Segurança da Informação","Engenharia de Software","Governança de TI","Legislação Específica"], observacoes: "Banca FCC." },
  "ti-trt":  { materias: ["Língua Portuguesa","Raciocínio Lógico","Banco de Dados","Redes de Computadores","Segurança da Informação","Engenharia de Software","Governança de TI","Legislação Específica"], observacoes: "Banca FCC." },
  "ti-tre":  { materias: ["Língua Portuguesa","Raciocínio Lógico","Banco de Dados","Redes de Computadores","Segurança da Informação","Engenharia de Software","Governança de TI","Legislação Específica"], materiasEstaduais: ["Legislação Específica"], legislacaoEstadual: true },
  "ti-tj":   { materias: ["Língua Portuguesa","Raciocínio Lógico","Banco de Dados","Redes de Computadores","Segurança da Informação","Engenharia de Software","Governança de TI","Legislação Específica"], materiasEstaduais: ["Legislação Específica"], legislacaoEstadual: true },
  "ti-tjdft": { materias: ["Língua Portuguesa","Raciocínio Lógico","Banco de Dados","Redes de Computadores","Segurança da Informação","Engenharia de Software","Governança de TI","Algoritmos e Estruturas de Dados","Legislação Específica"], observacoes: "Banca CESPE." },

  "ti-tcu":   { materias: ["Língua Portuguesa","Raciocínio Lógico","Banco de Dados","Redes de Computadores","Segurança da Informação","Engenharia de Software","Governança de TI","Algoritmos e Estruturas de Dados","Controle Externo","Auditoria Governamental","Legislação Específica"], observacoes: "Banca FGV/CESPE. TI com foco em auditoria de sistemas governamentais." },
  "ti-cgu":   { materias: ["Língua Portuguesa","Raciocínio Lógico","Banco de Dados","Redes de Computadores","Segurança da Informação","Engenharia de Software","Governança de TI","Algoritmos e Estruturas de Dados","Legislação Específica"], observacoes: "Banca CESPE." },
  "ti-tce":   { materias: ["Língua Portuguesa","Raciocínio Lógico","Banco de Dados","Redes de Computadores","Segurança da Informação","Engenharia de Software","Governança de TI","Legislação Específica"], materiasEstaduais: ["Legislação Específica"], legislacaoEstadual: true },

  "ti-inss":  { materias: ["Língua Portuguesa","Raciocínio Lógico","Banco de Dados","Redes de Computadores","Segurança da Informação","Engenharia de Software","Governança de TI","Algoritmos e Estruturas de Dados","Legislação Específica"], observacoes: "Banca CESPE." },

  "ti-agu":   { materias: ["Língua Portuguesa","Raciocínio Lógico","Banco de Dados","Redes de Computadores","Segurança da Informação","Engenharia de Software","Governança de TI","Algoritmos e Estruturas de Dados","Legislação Específica"], observacoes: "Banca CESPE." },
  "ti-dpu":   { materias: ["Língua Portuguesa","Raciocínio Lógico","Banco de Dados","Redes de Computadores","Segurança da Informação","Engenharia de Software","Governança de TI","Legislação Específica"], observacoes: "Banca CESPE." },

  "ti-pf":    { materias: ["Língua Portuguesa","Raciocínio Lógico","Banco de Dados","Redes de Computadores","Segurança da Informação","Engenharia de Software","Governança de TI","Algoritmos e Estruturas de Dados","Criminalística","Legislação Específica"], observacoes: "Banca CESPE. Perito Digital. Inclui forense computacional e crimes cibernéticos." },
  "ti-pcdf":  { materias: ["Língua Portuguesa","Raciocínio Lógico","Banco de Dados","Redes de Computadores","Segurança da Informação","Engenharia de Software","Governança de TI","Legislação Específica"], observacoes: "Banca CESPE." },

  "ti-bacen": { materias: ["Língua Portuguesa","Raciocínio Lógico","Banco de Dados","Redes de Computadores","Segurança da Informação","Engenharia de Software","Governança de TI","Algoritmos e Estruturas de Dados","Legislação Específica"], observacoes: "Banca CESPE." },
  "ti-bndes": { materias: ["Língua Portuguesa","Raciocínio Lógico","Banco de Dados","Redes de Computadores","Segurança da Informação","Engenharia de Software","Governança de TI","Desenvolvimento Web e APIs","Algoritmos e Estruturas de Dados"], observacoes: "Banca CESGRANRIO." },

  "ti-rfb":   { materias: ["Língua Portuguesa","Raciocínio Lógico","Banco de Dados","Redes de Computadores","Segurança da Informação","Engenharia de Software","Governança de TI","Algoritmos e Estruturas de Dados","Direito Tributário","Legislação Específica"], observacoes: "Banca FGV. TI com noções de legislação tributária federal." },
  "ti-sefaz": { materias: ["Língua Portuguesa","Raciocínio Lógico","Banco de Dados","Redes de Computadores","Segurança da Informação","Engenharia de Software","Governança de TI","Legislação Específica"], materiasEstaduais: ["Legislação Específica"], legislacaoEstadual: true },

  "ti-ibge":  { materias: ["Língua Portuguesa","Raciocínio Lógico","Banco de Dados","Redes de Computadores","Segurança da Informação","Engenharia de Software","Governança de TI","Algoritmos e Estruturas de Dados","Legislação Específica"], observacoes: "Banca CESPE." },
  "ti-ibama": { materias: ["Língua Portuguesa","Raciocínio Lógico","Banco de Dados","Redes de Computadores","Segurança da Informação","Engenharia de Software","Governança de TI","Legislação Específica"], observacoes: "Banca CESPE." },
  "ti-incra": { materias: ["Língua Portuguesa","Raciocínio Lógico","Banco de Dados","Redes de Computadores","Segurança da Informação","Engenharia de Software","Governança de TI","Legislação Específica"], observacoes: "Banca CESPE." },
  "ti-dnit":  { materias: ["Língua Portuguesa","Raciocínio Lógico","Banco de Dados","Redes de Computadores","Segurança da Informação","Engenharia de Software","Governança de TI","Legislação Específica"], observacoes: "Banca CESPE." },

  "ti-anvisa": { materias: ["Língua Portuguesa","Raciocínio Lógico","Banco de Dados","Redes de Computadores","Segurança da Informação","Engenharia de Software","Governança de TI","Legislação Específica"], observacoes: "Banca CESPE." },
  "ti-ans":    { materias: ["Língua Portuguesa","Raciocínio Lógico","Banco de Dados","Redes de Computadores","Segurança da Informação","Engenharia de Software","Governança de TI","Legislação Específica"], observacoes: "Banca CESPE." },
  "ti-fiocruz":{ materias: ["Língua Portuguesa","Raciocínio Lógico","Banco de Dados","Redes de Computadores","Segurança da Informação","Engenharia de Software","Governança de TI","Legislação Específica"], observacoes: "Banca CESPE." },

  "ti-petrobras": { materias: ["Língua Portuguesa","Raciocínio Lógico","Banco de Dados","Redes de Computadores","Segurança da Informação","Engenharia de Software","Governança de TI","Desenvolvimento Web e APIs","Algoritmos e Estruturas de Dados","Legislação Específica"], observacoes: "Banca CESGRANRIO." },
  "ti-correios":  { materias: ["Língua Portuguesa","Raciocínio Lógico","Banco de Dados","Redes de Computadores","Segurança da Informação","Engenharia de Software","Governança de TI","Legislação Específica"] },
  "ti-anatel":    { materias: ["Língua Portuguesa","Raciocínio Lógico","Banco de Dados","Redes de Computadores","Segurança da Informação","Engenharia de Software","Governança de TI","Algoritmos e Estruturas de Dados","Legislação Específica"], observacoes: "Banca CESPE." },
  "ti-aneel":     { materias: ["Língua Portuguesa","Raciocínio Lógico","Banco de Dados","Redes de Computadores","Segurança da Informação","Engenharia de Software","Governança de TI","Legislação Específica"], observacoes: "Banca CESPE." },
  "ti-antt":      { materias: ["Língua Portuguesa","Raciocínio Lógico","Banco de Dados","Redes de Computadores","Segurança da Informação","Engenharia de Software","Governança de TI","Legislação Específica"], observacoes: "Banca CESPE." },
  "ti-prefeitura":{ materias: ["Língua Portuguesa","Raciocínio Lógico","Banco de Dados","Redes de Computadores","Segurança da Informação","Engenharia de Software","Governança de TI","Legislação Específica"], materiasEstaduais: ["Legislação Específica"], legislacaoEstadual: true },
  "ti-gov-estadual": { materias: ["Língua Portuguesa","Raciocínio Lógico","Banco de Dados","Redes de Computadores","Segurança da Informação","Engenharia de Software","Governança de TI","Legislação Específica"], materiasEstaduais: ["Legislação Específica"], legislacaoEstadual: true },

  // ══════════════════════════════════════════════════
  // DIPLOMÁTICO / ITAMARATY
  // ══════════════════════════════════════════════════

  "diplomata": {
    materias: [
      "Língua Portuguesa",
      "Língua Inglesa",
      "História do Brasil",
      "Geografia do Brasil",
      "Economia",
      "Direito Constitucional",
      "Direito Administrativo",
      "Direito Internacional Público", 
      "Atualidades",
    ],
    observacoes: "Banca CESPE (CACD). Concurso CACD — Carreira de Diplomata. Inclui: História Mundial, Política Internacional, Língua Francesa ou Espanhola, Relações Internacionais. Exame em duas fases + oral. Um dos concursos mais exigentes do Brasil.",
  },

  "oficial-chancelaria": {
    materias: [
      "Língua Portuguesa",
      "Língua Inglesa",
      "Raciocínio Lógico",
      "Matemática",
      "Direito Constitucional",
      "Direito Administrativo",
      "Atualidades",
      "Legislação Específica",
    ],
    observacoes: "Banca CESPE. Oficial de Chancelaria (nível superior). Legislação consular e regulamentação do serviço exterior brasileiro cobradas.",
  },

  "aux-chancelaria": {
    materias: [
      "Língua Portuguesa",
      "Língua Inglesa",
      "Raciocínio Lógico",
      "Matemática",
      "Informática",
      "Atualidades",
      "Legislação Específica",
    ],
    observacoes: "Banca CESPE. Assistente de Chancelaria (nível médio). Conteúdo menos exigente.",
  },

  // ══════════════════════════════════════════════════
  // MILITAR / DEFESA
  // ══════════════════════════════════════════════════

  "efomm": {
    materias: [
      "Língua Portuguesa",
      "Matemática",
      "Física",
      "Língua Inglesa",
      "Química",
      "Biologia",
      "História do Brasil",
      "Geografia do Brasil",
    ],
    observacoes: "Escola de Formação de Oficiais da Marinha Mercante. Prova estilo vestibular. Física e Matemática têm alto peso. Exige ensino médio completo.",
  },

  "en-marinha": {
    materias: [
      "Língua Portuguesa",
      "Matemática",
      "Física",
      "Química",          
      "Biologia",
      "Língua Inglesa",
      "História do Brasil",
      "Geografia do Brasil",
    ],
    observacoes: "Escola Naval. Seleção extremamente concorrida. Prova tipo vestibular de altíssimo nível.",
  },

  "epcar": {
    materias: [
      "Língua Portuguesa",
      "Matemática",
      "Física",
      "Química",          
      "Biologia",
      "História do Brasil",
      "Geografia do Brasil",
    ],
    observacoes: "Escola Preparatória de Cadetes do Ar (FAB). Foco em exatas. Ingresso para nível de ensino médio.",
  },

  "afa": {
    materias: [
      "Língua Portuguesa",
      "Matemática",
      "Física",
      "Química",          
      "Biologia",
      "Língua Inglesa",
      "História do Brasil",
      "Geografia do Brasil",
    ],
    observacoes: "Academia da Força Aérea. Exige ensino médio completo. Prova extensa com alto peso em exatas.",
  },

  "espcex": {
    materias: [
      "Língua Portuguesa",
      "Matemática",
      "Física",
      "Química",          
      "Biologia",
      "História do Brasil",
      "Geografia do Brasil",
    ],
    observacoes: "Escola Preparatória de Cadetes do Exército. Ingresso para formação de oficial. Alta exigência em Física e Matemática.",
  },

  "aman": {
    materias: [
      "Língua Portuguesa",
      "Matemática",
      "Física",
      "Química",          
      "Biologia",
      "Língua Inglesa",
      "História do Brasil",
      "Geografia do Brasil",
    ],
    observacoes: "Academia Militar das Agulhas Negras. Formação de oficial do Exército. Geralmente ingresso via EsPCEx.",
  },

  "cbf-federal": {
    materias: [
      "Língua Portuguesa",
      "Matemática",
      "Raciocínio Lógico",
      "Informática",
      "Direito Constitucional",
      "Direito Administrativo",
      "Atualidades",
      "Legislação Específica",
    ],
    observacoes: "Bombeiro Militar Federal (CBMDF). Banca CESPE. Similar ao PM-PMDF.",
  },

  // ══════════════════════════════════════════════════
  // SAÚDE
  // ══════════════════════════════════════════════════

  "medico-sus": {
    materias: [
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Direito Constitucional",
      "Direito Administrativo",
      "Ética no Serviço Público",
      "Legislação Específica",   // SUS, Lei 8.080/90, Lei 8.142/90
    ],
    materiasEstaduais: ["Legislação Específica"],
    legislacaoEstadual: true,
    observacoes: "Concursos municipais/estaduais. Conhecimentos específicos em Medicina clínica/especialidade são cobrados. Legislação do SUS obrigatória. Conhecimento técnico-médico varia pela especialidade.",
  },

  "enfermeiro-sus": {
    materias: [
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Matemática",
      "Ética no Serviço Público",
      "Legislação Específica",   // Lei 8.080, Lei 8.142, Política Nacional AB
    ],
    materiasEstaduais: ["Legislação Específica"],
    legislacaoEstadual: true,
    observacoes: "Legislação do SUS, SAE (Sistematização da Assistência de Enfermagem), Saúde Pública e Epidemiologia sempre cobrados. Conhecimentos técnicos de enfermagem são a maior parte da prova.",
  },

  "farmaceutico-sus": {
    materias: [
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Ética no Serviço Público",
      "Legislação Específica",
    ],
    materiasEstaduais: ["Legislação Específica"],
    legislacaoEstadual: true,
    observacoes: "Conhecimentos técnicos em Farmácia (farmacologia, farmacotécnica, farmácia clínica) representam a maior parte. SUS e RENAME cobrados.",
  },

  "fisio-sus": {
    materias: [
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Ética no Serviço Público",
      "Legislação Específica",
    ],
    materiasEstaduais: ["Legislação Específica"],
    legislacaoEstadual: true,
    observacoes: "Conhecimentos técnicos em Fisioterapia predominam. SUS e legislação profissional (COFFITO) cobrados.",
  },

  "analista-anvisa": {
    materias: [
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Informática",
      "Direito Constitucional",
      "Direito Administrativo",
      "Administração Pública",
      "Ética no Serviço Público",
      "Legislação Específica",
    ],
    observacoes: "Banca CESPE. Especialização em Regulação e Vigilância Sanitária. Conhecimentos técnicos na área de saúde e regulação são cobrados nos específicos.",
  },

  "analista-ans": {
    materias: [
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Informática",
      "Direito Constitucional",
      "Direito Administrativo",
      "Administração Pública",
      "Ética no Serviço Público",
      "Legislação Específica",
    ],
    observacoes: "Banca CESPE. Regulação de saúde suplementar. Legislação da ANS e planos de saúde cobrados.",
  },

  "pesquisador-fiocruz": {
    materias: [
      "Língua Portuguesa",
      "Língua Inglesa",
      "Raciocínio Lógico",
      "Biologia",
      "Ética no Serviço Público",
      "Legislação Específica",
    ],
    observacoes: "Banca CESPE. Exige título de mestre ou doutor. Conhecimentos técnicos na área de pesquisa (saúde pública, biomedicina, bioquímica etc.) são os principais.",
  },

  // ══════════════════════════════════════════════════
  // AMBIENTAL / AGRÁRIO / INFRAESTRUTURA
  // ══════════════════════════════════════════════════

  "ibama-analista": {
    materias: [
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Informática",
      "Direito Constitucional",
      "Direito Administrativo",
      "Administração Pública",
      "Ética no Serviço Público",
      "Legislação Específica",
    ],
    observacoes: "Banca CESPE. Último edital 2021/2025. Legislação ambiental (Código Florestal, Lei SNUC, Lei do Licenciamento etc.) é a matéria específica principal. Temas variam (Licenciamento, Fauna Silvestre, Fiscalização etc.).",
  },

  "ibama-tecnico": {
    materias: [
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Matemática",
      "Informática",
      "Direito Constitucional",
      "Direito Administrativo",
      "Ética no Serviço Público",
      "Legislação Específica",
    ],
    observacoes: "Banca CESPE. Nível médio. Noções de legislação ambiental.",
  },

  "icmbio-analista": {
    materias: [
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Informática",
      "Direito Constitucional",
      "Direito Administrativo",
      "Ética no Serviço Público",
      "Legislação Específica",
    ],
    observacoes: "Banca CESPE. Gestão de unidades de conservação. Legislação ambiental de conservação é o foco.",
  },

  "incra-analista": {
    materias: [
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Informática",
      "Direito Constitucional",
      "Direito Administrativo",
      "Direito Civil",           // direito agrário / registro de imóveis
      "Administração Pública",
      "Ética no Serviço Público",
      "Legislação Específica",
    ],
    observacoes: "Banca CESPE. Especialidades: Agronomia, Direito, Administração, TI etc. Direito Agrário é matéria específica.",
  },

  "incra-tecnico": {
    materias: [
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Matemática",
      "Informática",
      "Direito Constitucional",
      "Direito Administrativo",
      "Ética no Serviço Público",
      "Legislação Específica",
    ],
    observacoes: "Banca CESPE. Nível médio.",
  },

  "mapa-analista": {
    materias: [
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Informática",
      "Direito Constitucional",
      "Direito Administrativo",
      "Administração Pública",
      "Ética no Serviço Público",
      "Legislação Específica",
    ],
    observacoes: "Banca CESPE. Especialidades: Agronomia, Medicina Veterinária, Engenharia de Alimentos, Administração etc. Legislação agropecuária é o foco.",
  },

  "mapa-tecnico": {
    materias: [
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Matemática",
      "Informática",
      "Direito Constitucional",
      "Direito Administrativo",
      "Ética no Serviço Público",
      "Legislação Específica",
    ],
    observacoes: "Banca CESPE. Nível médio.",
  },

  "embrapa-pesquisador": {
    materias: [
      "Língua Portuguesa",
      "Língua Inglesa",
      "Raciocínio Lógico",
      "Biologia",
      "Ética no Serviço Público",
      "Legislação Específica",
    ],
    observacoes: "Banca CESPE. Exige mestrado/doutorado na área. Conhecimentos técnicos em Agronomia/Ciências correlatas predominam.",
  },

  "embrapa-analista": {
    materias: [
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Informática",
      "Direito Constitucional",
      "Direito Administrativo",
      "Administração Geral",
      "Ética no Serviço Público",
      "Legislação Específica",
    ],
    observacoes: "Banca CESPE. Apoio administrativo da Embrapa.",
  },

  "funai-indigenista": {
    materias: [
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Informática",
      "Direito Constitucional",
      "Direito Administrativo",
      "Administração Pública",
      "Ética no Serviço Público",
      "Legislação Específica",
    ],
    observacoes: "Banca CESPE. Legislação indigenista (Estatuto do Índio, Convenção 169 OIT) e Antropologia são os específicos principais.",
  },

  "funai-analista": {
    materias: [
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Matemática",
      "Informática",
      "Direito Constitucional",
      "Direito Administrativo",
      "Administração Geral",
      "Ética no Serviço Público",
    ],
    observacoes: "Banca CESPE. Apoio administrativo.",
  },

  "dnit-especialista": {
    materias: [
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Informática",
      "Direito Constitucional",
      "Direito Administrativo",
      "Administração Pública",
      "Ética no Serviço Público",
      "Legislação Específica",
    ],
    observacoes: "Banca CESPE. Especialidades: Engenharia Civil, Ambiental, Elétrica, TI, Administração etc. Legislação de infraestrutura de transportes cobrada.",
  },

  "dnit-analista": {
    materias: [
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Matemática",
      "Informática",
      "Direito Constitucional",
      "Direito Administrativo",
      "Administração Geral",
      "Ética no Serviço Público",
    ],
    observacoes: "Banca CESPE. Apoio administrativo.",
  },

  "ibge-analista": {
    materias: [
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Matemática",
      "Informática",
      "Direito Constitucional",
      "Direito Administrativo",
      "Administração Pública",
      "Ética no Serviço Público",
      "Legislação Específica",
    ],
    observacoes: "Banca CESPE. Especialidades: Estatística, Ciências Sociais, Economia, Geografia, TI. Estatística descritiva e métodos de pesquisa são os mais cobrados.",
  },

  "ibge-tecnico": {
    materias: [
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Matemática",
      "Informática",
      "Direito Constitucional",
      "Direito Administrativo",
      "Ética no Serviço Público",
    ],
    observacoes: "Banca CESPE. Nível médio.",
  },

  "ibge-agente": {
    materias: [
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Matemática",
      "Informática",
      "Atualidades",
    ],
    observacoes: "Banca CESPE. Nível médio/fundamental. Menor exigência.",
  },

  "ti-amb-ibge":  { materias: ["Língua Portuguesa","Raciocínio Lógico","Banco de Dados","Redes de Computadores","Segurança da Informação","Engenharia de Software","Governança de TI","Algoritmos e Estruturas de Dados","Legislação Específica"], observacoes: "Banca CESPE." },
  "ti-amb-ibama": { materias: ["Língua Portuguesa","Raciocínio Lógico","Banco de Dados","Redes de Computadores","Segurança da Informação","Engenharia de Software","Governança de TI","Legislação Específica"], observacoes: "Banca CESPE." },
  "ti-amb-dnit":  { materias: ["Língua Portuguesa","Raciocínio Lógico","Banco de Dados","Redes de Computadores","Segurança da Informação","Engenharia de Software","Governança de TI","Legislação Específica"], observacoes: "Banca CESPE." },

  // ══════════════════════════════════════════════════
  // ADMINISTRATIVO / GERAL
  // ══════════════════════════════════════════════════

  "eppgg": {
    materias: [
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Matemática",
      "Informática",
      "Direito Constitucional",
      "Direito Administrativo",
      "Administração Geral",
      "Administração Pública",
      "Gestão de Pessoas",
      "Finanças Públicas",
      "Contabilidade Pública",
      "Economia",
      "Ética no Serviço Público",
      "Legislação Específica",
    ],
    observacoes: "Banca CESPE. Concurso Nacional Unificado (CNU). Salário inicial de ~R$20 mil. Políticas públicas, orçamento e planejamento governamental são os focos específicos.",
  },

  "petrobras-tecnico": {
    materias: [
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Matemática",
      "Informática",
      "Administração Geral",
      "Legislação Específica",
    ],
    observacoes: "Banca CESGRANRIO. Técnico de Administração. Gestão de Compras, Logística, Licitações Lei 13.303 (estatais) e Contratações Petrobras são os específicos principais.",
  },

  "petrobras-eng": {
    materias: [
      "Língua Portuguesa",
      "Língua Inglesa",
      "Raciocínio Lógico",
      "Matemática",
      "Física",
      "Legislação Específica",
    ],
    observacoes: "Banca CESGRANRIO. Profissional Júnior. Conhecimentos de engenharia na especialidade (Petróleo, Química, Elétrica, Civil etc.) predominam. Alta remuneração.",
  },

  "correios-analista": {
    materias: [
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Matemática",
      "Informática",
      "Administração Geral",
      "Ética no Serviço Público",
      "Legislação Específica",
    ],
    observacoes: "Conhecimentos técnicos em logística e serviços postais. Legislação dos Correios (ECT) cobrada.",
  },

  "correios-tecnico": {
    materias: [
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Matemática",
      "Informática",
      "Atualidades",
    ],
    observacoes: "Nível médio. Menor exigência. Foco operacional.",
  },

  "anatel-tecnico": {
    materias: [
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Matemática",
      "Informática",
      "Direito Constitucional",
      "Direito Administrativo",
      "Administração Pública",
      "Ética no Serviço Público",
      "Legislação Específica",
    ],
    observacoes: "Banca CESPE. Legislação de telecomunicações (Lei Geral de Telecomunicações) cobrada.",
  },

  "anac-tecnico": {
    materias: [
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Matemática",
      "Informática",
      "Direito Constitucional",
      "Direito Administrativo",
      "Administração Pública",
      "Ética no Serviço Público",
      "Legislação Específica",
    ],
    observacoes: "Banca FCC. Legislação aeronáutica e de aviação civil cobrada.",
  },

  "aneel-tecnico": {
    materias: [
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Matemática",
      "Informática",
      "Direito Constitucional",
      "Direito Administrativo",
      "Administração Pública",
      "Ética no Serviço Público",
      "Legislação Específica",
    ],
    observacoes: "Banca CESPE. Legislação do setor elétrico cobrada.",
  },

  "antt-tecnico": {
    materias: [
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Matemática",
      "Informática",
      "Direito Constitucional",
      "Direito Administrativo",
      "Administração Pública",
      "Ética no Serviço Público",
      "Legislação Específica",
    ],
    observacoes: "Banca CESPE. Legislação de transportes terrestres cobrada.",
  },

  "antaq-tecnico": {
    materias: [
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Matemática",
      "Informática",
      "Direito Constitucional",
      "Direito Administrativo",
      "Administração Pública",
      "Ética no Serviço Público",
      "Legislação Específica",
    ],
    observacoes: "Banca CESPE. Regulação de transportes aquaviários.",
  },

  "ana-tecnico": {
    materias: [
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Matemática",
      "Informática",
      "Direito Constitucional",
      "Direito Administrativo",
      "Administração Pública",
      "Ética no Serviço Público",
      "Legislação Específica",
    ],
    observacoes: "Banca CESPE. Legislação de recursos hídricos (Lei 9.433/97 — PNRH) cobrada.",
  },

  "analista-mpu-adm": {
    materias: [
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Informática",
      "Direito Constitucional",
      "Direito Administrativo",
      "Administração Geral",
      "Administração Pública",
      "Ética no Serviço Público",
      "Legislação Específica",
    ],
    observacoes: "Banca CESPE. Apoio administrativo do MPU (MPF, MPT, MPM, MPDFT).",
  },

  "analista-prefeitura": {
    materias: [
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Matemática",
      "Informática",
      "Direito Constitucional",
      "Direito Administrativo",
      "Administração Pública",
      "Ética no Serviço Público",
      "Legislação Específica",
    ],
    materiasEstaduais: ["Legislação Específica"],
    legislacaoEstadual: true,
    observacoes: "Varia muito por município. Lei Orgânica do Município é obrigatória.",
  },

  "ti-adm-prefeitura": {
    materias: ["Língua Portuguesa","Raciocínio Lógico","Banco de Dados","Redes de Computadores","Segurança da Informação","Engenharia de Software","Governança de TI","Legislação Específica"],
    materiasEstaduais: ["Legislação Específica"],
    legislacaoEstadual: true,
  },

  "analista-gov-est": {
    materias: [
      "Língua Portuguesa",
      "Raciocínio Lógico",
      "Matemática",
      "Informática",
      "Direito Constitucional",
      "Direito Administrativo",
      "Administração Pública",
      "Ética no Serviço Público",
      "Legislação Específica",
    ],
    materiasEstaduais: ["Legislação Específica"],
    legislacaoEstadual: true,
    observacoes: "Varia por estado. Legislação estadual obrigatória.",
  },

  "ti-adm-gov-est": {
    materias: ["Língua Portuguesa","Raciocínio Lógico","Banco de Dados","Redes de Computadores","Segurança da Informação","Engenharia de Software","Governança de TI","Legislação Específica"],
    materiasEstaduais: ["Legislação Específica"],
    legislacaoEstadual: true,
  },

  "ti-adm-petrobras": {
    materias: ["Língua Portuguesa","Raciocínio Lógico","Banco de Dados","Redes de Computadores","Segurança da Informação","Engenharia de Software","Governança de TI","Desenvolvimento Web e APIs","Algoritmos e Estruturas de Dados"],
    observacoes: "Banca CESGRANRIO.",
  },

  "ti-adm-correios": {
    materias: ["Língua Portuguesa","Raciocínio Lógico","Banco de Dados","Redes de Computadores","Segurança da Informação","Engenharia de Software","Governança de TI","Legislação Específica"],
  },

};

// ─────────────────────────────────────────────────────────────────────────────
// MATÉRIAS ESTADUAIS (legislação específica por estado)
// ─────────────────────────────────────────────────────────────────────────────

export const MATERIAS_ESTADUAIS: Record<string, string[]> = {
  "AC": ["Legislação Estadual do Acre", "História e Geografia do Acre"],
  "AL": ["Legislação Estadual de Alagoas", "História e Geografia de Alagoas"],
  "AP": ["Legislação Estadual do Amapá", "História e Geografia do Amapá"],
  "AM": ["Legislação Estadual do Amazonas", "História e Geografia do Amazonas"],
  "BA": ["Legislação Estadual da Bahia", "História e Geografia da Bahia"],
  "CE": ["Legislação Estadual do Ceará", "História e Geografia do Ceará"],
  "DF": ["Legislação do Distrito Federal", "História e Geografia do DF"],
  "ES": ["Legislação Estadual do Espírito Santo", "História e Geografia do Espírito Santo"],
  "GO": ["Legislação Estadual de Goiás", "História e Geografia de Goiás"],
  "MA": ["Legislação Estadual do Maranhão", "História e Geografia do Maranhão"],
  "MT": ["Legislação Estadual do Mato Grosso", "História e Geografia do Mato Grosso"],
  "MS": ["Legislação Estadual do Mato Grosso do Sul", "História e Geografia do Mato Grosso do Sul"],
  "MG": ["Legislação Estadual de Minas Gerais", "História e Geografia de Minas Gerais"],
  "PA": ["Legislação Estadual do Pará", "História e Geografia do Pará"],
  "PB": ["Legislação Estadual da Paraíba", "História e Geografia da Paraíba"],
  "PR": ["Legislação Estadual do Paraná", "História e Geografia do Paraná"],
  "PE": ["Legislação Estadual de Pernambuco", "História e Geografia de Pernambuco"],
  "PI": ["Legislação Estadual do Piauí", "História e Geografia do Piauí"],
  "RJ": ["Legislação Estadual do Rio de Janeiro", "História e Geografia do Rio de Janeiro"],
  "RN": ["Legislação Estadual do Rio Grande do Norte", "História e Geografia do Rio Grande do Norte"],
  "RS": ["Legislação Estadual do Rio Grande do Sul", "História e Geografia do Rio Grande do Sul"],
  "RO": ["Legislação Estadual de Rondônia", "História e Geografia de Rondônia"],
  "RR": ["Legislação Estadual de Roraima", "História e Geografia de Roraima"],
  "SC": ["Legislação Estadual de Santa Catarina", "História e Geografia de Santa Catarina"],
  "SP": ["Legislação Estadual de São Paulo", "História e Geografia de São Paulo"],
  "SE": ["Legislação Estadual de Sergipe", "História e Geografia de Sergipe"],
  "TO": ["Legislação Estadual do Tocantins", "História e Geografia do Tocantins"],
};

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÃO HELPER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Retorna a lista completa de matérias para um cargo/estado.
 *
 * @param cargoId   - ID do cargo (ex: "delegado-pc")
 * @param estado    - Sigla do estado (ex: "BA") — necessário quando cargo tem hasEstado
 * @returns         - Lista de matérias sem duplicatas, na ordem base + estaduais
 */
export function getMateriasParaCargo(cargoId: string, estado?: string): string[] {
  const config = MATERIAS_POR_CARGO[cargoId];
  if (!config) return [];

  const base = [...config.materias];

  // Adiciona matérias específicas do cargo que variam por estado
  if (config.materiasEstaduais) {
    for (const m of config.materiasEstaduais) {
      if (!base.includes(m)) base.push(m);
    }
  }

  // Adiciona legislação específica do estado se informado
  if (config.legislacaoEstadual && estado && MATERIAS_ESTADUAIS[estado]) {
    for (const m of MATERIAS_ESTADUAIS[estado]) {
      if (!base.includes(m)) base.push(m);
    }
  }

  return base;
}

/**
 * Verifica se o mapeamento contém um cargo.
 */
export function cargoTemMapeamento(cargoId: string): boolean {
  return cargoId in MATERIAS_POR_CARGO;
}

/**
 * Retorna todos os cargoIds mapeados.
 */
export function getCargosMapeados(): string[] {
  return Object.keys(MATERIAS_POR_CARGO);
}
