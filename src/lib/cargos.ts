/**
 * Lista curada de cargos populares para concursos públicos brasileiros.
 * Organizada por área para exibição no onboarding wizard (cascata: Área → Órgão → Cargo).
 */

export interface Cargo {
  id: string;
  nome: string;
  orgao: string;       // nome do órgão (string)
  sigla?: string;      // sigla do órgão (usado para montar "PC-BA", "PM-SP" etc.)
  area: AreaCargo;
  hasEstado?: boolean; // true = pede seleção de estado após cargo (PC, PM, SEFAZ, TJ, etc.)
  banca?: string;      // banca sugerida (opcional — aluno confirma na etapa de banca)
  categoria?: string;  // slug da categoria no DB
}

export type AreaCargo =
  | "fiscal"
  | "juridico"
  | "judiciario"
  | "policial"
  | "bancario"
  | "controle"
  | "previdencia"
  | "ti"
  | "diplomatico"
  | "militar"
  | "saude"
  | "administrativo"
  | "ambiental"
  | "mp";

export interface GrupoArea {
  area: AreaCargo;
  label: string;
  emoji: string;
  cor: string;
}

export const GRUPOS_AREA: GrupoArea[] = [
  { area: "fiscal",        label: "Fiscal / Tributário",    emoji: "🏛️",  cor: "bg-amber-500/15 border-amber-500/30 text-amber-300" },
  { area: "judiciario",   label: "Judiciário",              emoji: "⚖️",  cor: "bg-blue-500/15 border-blue-500/30 text-blue-300" },
  { area: "juridico",     label: "Jurídico / AGU",          emoji: "📜",  cor: "bg-indigo-500/15 border-indigo-500/30 text-indigo-300" },
  { area: "mp",           label: "Ministério Público",      emoji: "🔍",  cor: "bg-purple-500/15 border-purple-500/30 text-purple-300" },
  { area: "policial",     label: "Policial / Segurança",    emoji: "🚔",  cor: "bg-red-500/15 border-red-500/30 text-red-300" },
  { area: "bancario",     label: "Bancário / Financeiro",   emoji: "🏦",  cor: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300" },
  { area: "controle",     label: "Controle / Auditoria",    emoji: "🔎",  cor: "bg-cyan-500/15 border-cyan-500/30 text-cyan-300" },
  { area: "previdencia",  label: "Previdência Social",      emoji: "🛡️",  cor: "bg-teal-500/15 border-teal-500/30 text-teal-300" },
  { area: "ti",           label: "Tecnologia da Informação",emoji: "💻",  cor: "bg-violet-500/15 border-violet-500/30 text-violet-300" },
  { area: "militar",      label: "Militar / Defesa",        emoji: "🎖️",  cor: "bg-slate-500/15 border-slate-500/30 text-slate-300" },
  { area: "diplomatico",  label: "Diplomacia / Itamaraty",  emoji: "🌍",  cor: "bg-sky-500/15 border-sky-500/30 text-sky-300" },
  { area: "saude",        label: "Saúde",                   emoji: "⚕️",  cor: "bg-rose-500/15 border-rose-500/30 text-rose-300" },
  { area: "ambiental",    label: "Ambiental / Agrário",     emoji: "🌿",  cor: "bg-green-500/15 border-green-500/30 text-green-300" },
  { area: "administrativo", label: "Administrativo / Geral",emoji: "📋",  cor: "bg-orange-500/15 border-orange-500/30 text-orange-300" },
];

export const CARGOS: Cargo[] = [

  // ══════════════════════════════════════════════════════════
  // FISCAL / TRIBUTÁRIO
  // ══════════════════════════════════════════════════════════
  { id: "auditor-rfb",         nome: "Auditor-Fiscal da Receita Federal",         orgao: "Receita Federal do Brasil (RFB)", sigla: "RFB",    area: "fiscal",   banca: "CESPE/CEBRASPE", categoria: "fiscal" },
  { id: "analista-rfb",        nome: "Analista-Tributário da Receita Federal",    orgao: "Receita Federal do Brasil (RFB)", sigla: "RFB",    area: "fiscal",   banca: "CESPE/CEBRASPE", categoria: "fiscal" },
  { id: "tecnico-rfb",         nome: "Técnico de Administração e Finanças — RFB", orgao: "Receita Federal do Brasil (RFB)", sigla: "RFB",    area: "fiscal",   banca: "CESPE/CEBRASPE", categoria: "fiscal" },

  { id: "auditor-sefaz",       nome: "Auditor Fiscal de Tributos Estaduais",      orgao: "Secretaria de Fazenda Estadual (SEFAZ)", sigla: "SEFAZ", area: "fiscal", hasEstado: true, banca: "CESPE/CEBRASPE", categoria: "fiscal" },
  { id: "analista-sefaz",      nome: "Analista Tributário / Agente Fiscal",       orgao: "Secretaria de Fazenda Estadual (SEFAZ)", sigla: "SEFAZ", area: "fiscal", hasEstado: true, categoria: "fiscal" },
  { id: "tecnico-sefaz",       nome: "Técnico de Fazenda Estadual",               orgao: "Secretaria de Fazenda Estadual (SEFAZ)", sigla: "SEFAZ", area: "fiscal", hasEstado: true, categoria: "fiscal" },

  { id: "auditor-iss",         nome: "Auditor Fiscal de ISS / IPTU",              orgao: "Prefeitura Municipal (Fiscal)",   sigla: "Pref",   area: "fiscal", hasEstado: true, categoria: "fiscal" },

  // ══════════════════════════════════════════════════════════
  // JUDICIÁRIO
  // ══════════════════════════════════════════════════════════
  // STF
  { id: "analista-stf",        nome: "Analista Judiciário — STF",                 orgao: "Supremo Tribunal Federal (STF)", sigla: "STF",    area: "judiciario", banca: "FGV",            categoria: "judiciario" },
  { id: "tecnico-stf",         nome: "Técnico Judiciário — STF",                  orgao: "Supremo Tribunal Federal (STF)", sigla: "STF",    area: "judiciario", banca: "FGV",            categoria: "judiciario" },

  // STJ
  { id: "analista-stj",        nome: "Analista Judiciário — STJ",                 orgao: "Superior Tribunal de Justiça (STJ)", sigla: "STJ", area: "judiciario", banca: "CESPE/CEBRASPE", categoria: "judiciario" },
  { id: "tecnico-stj",         nome: "Técnico Judiciário — STJ",                  orgao: "Superior Tribunal de Justiça (STJ)", sigla: "STJ", area: "judiciario", banca: "CESPE/CEBRASPE", categoria: "judiciario" },

  // TSE / TST
  { id: "analista-tse",        nome: "Analista Judiciário — TSE",                 orgao: "Tribunal Superior Eleitoral (TSE)", sigla: "TSE",  area: "judiciario", banca: "FCC",            categoria: "judiciario" },
  { id: "analista-tst",        nome: "Analista Judiciário — TST",                 orgao: "Tribunal Superior do Trabalho (TST)", sigla: "TST",area: "judiciario", banca: "FCC",            categoria: "judiciario" },
  { id: "tecnico-tst",         nome: "Técnico Judiciário — TST",                  orgao: "Tribunal Superior do Trabalho (TST)", sigla: "TST",area: "judiciario", banca: "FCC",            categoria: "judiciario" },

  // TRF
  { id: "analista-trf",        nome: "Analista Judiciário — TRF",                 orgao: "Tribunal Regional Federal (TRF)",  sigla: "TRF",  area: "judiciario", banca: "CESPE/CEBRASPE", categoria: "judiciario" },
  { id: "tecnico-trf",         nome: "Técnico Judiciário — TRF",                  orgao: "Tribunal Regional Federal (TRF)",  sigla: "TRF",  area: "judiciario", banca: "CESPE/CEBRASPE", categoria: "judiciario" },

  // TRT
  { id: "analista-trt",        nome: "Analista Judiciário — TRT",                 orgao: "Tribunal Regional do Trabalho (TRT)", sigla: "TRT",area: "judiciario", banca: "FCC",            categoria: "judiciario" },
  { id: "tecnico-trt",         nome: "Técnico Judiciário — TRT",                  orgao: "Tribunal Regional do Trabalho (TRT)", sigla: "TRT",area: "judiciario", banca: "FCC",            categoria: "judiciario" },

  // TRE
  { id: "analista-tre",        nome: "Analista Judiciário — TRE",                 orgao: "Tribunal Regional Eleitoral (TRE)", sigla: "TRE", area: "judiciario", hasEstado: true, banca: "FCC",  categoria: "judiciario" },
  { id: "tecnico-tre",         nome: "Técnico Judiciário — TRE",                  orgao: "Tribunal Regional Eleitoral (TRE)", sigla: "TRE", area: "judiciario", hasEstado: true, banca: "FCC",  categoria: "judiciario" },

  // TJ Estadual
  { id: "analista-tj",         nome: "Analista Judiciário — TJ",                  orgao: "Tribunal de Justiça Estadual (TJ)", sigla: "TJ",  area: "judiciario", hasEstado: true, categoria: "judiciario" },
  { id: "tecnico-tj",          nome: "Técnico Judiciário / Escrevente — TJ",      orgao: "Tribunal de Justiça Estadual (TJ)", sigla: "TJ",  area: "judiciario", hasEstado: true, categoria: "judiciario" },
  { id: "oficial-justica-tj",  nome: "Oficial de Justiça — TJ",                   orgao: "Tribunal de Justiça Estadual (TJ)", sigla: "TJ",  area: "judiciario", hasEstado: true, categoria: "judiciario" },

  // TJDFT
  { id: "analista-tjdft",      nome: "Analista Judiciário — TJDFT",               orgao: "Tribunal de Justiça do DF (TJDFT)", sigla: "TJDFT", area: "judiciario", banca: "CESPE/CEBRASPE", categoria: "judiciario" },
  { id: "tecnico-tjdft",       nome: "Técnico Judiciário — TJDFT",                orgao: "Tribunal de Justiça do DF (TJDFT)", sigla: "TJDFT", area: "judiciario", banca: "CESPE/CEBRASPE", categoria: "judiciario" },
  // TI dentro do Judiciário
  { id: "ti-jud-stf",          nome: "Analista Judiciário — TI / STF",             orgao: "Supremo Tribunal Federal (STF)",        sigla: "STF",    area: "judiciario", banca: "FGV",            categoria: "tecnologia-informacao" },
  { id: "ti-jud-stj",          nome: "Analista Judiciário — TI / STJ",             orgao: "Superior Tribunal de Justiça (STJ)",    sigla: "STJ",    area: "judiciario", banca: "CESPE/CEBRASPE", categoria: "tecnologia-informacao" },
  { id: "ti-jud-tse",          nome: "Analista Judiciário — TI / TSE",             orgao: "Tribunal Superior Eleitoral (TSE)",     sigla: "TSE",    area: "judiciario", banca: "FCC",            categoria: "tecnologia-informacao" },
  { id: "ti-jud-tst",          nome: "Analista Judiciário — TI / TST",             orgao: "Tribunal Superior do Trabalho (TST)",   sigla: "TST",    area: "judiciario", banca: "FCC",            categoria: "tecnologia-informacao" },
  { id: "ti-jud-trf",          nome: "Analista Judiciário — TI / TRF",             orgao: "Tribunal Regional Federal (TRF)",       sigla: "TRF",    area: "judiciario", banca: "CESPE/CEBRASPE", categoria: "tecnologia-informacao" },
  { id: "ti-jud-trt",          nome: "Analista Judiciário — TI / TRT",             orgao: "Tribunal Regional do Trabalho (TRT)",   sigla: "TRT",    area: "judiciario", banca: "FCC",            categoria: "tecnologia-informacao" },
  { id: "ti-jud-tre",          nome: "Analista Judiciário — TI / TRE",             orgao: "Tribunal Regional Eleitoral (TRE)",     sigla: "TRE",    area: "judiciario", hasEstado: true,          categoria: "tecnologia-informacao" },
  { id: "ti-jud-tj",           nome: "Analista Judiciário — TI / TJ Estadual",     orgao: "Tribunal de Justiça Estadual (TJ)",     sigla: "TJ",     area: "judiciario", hasEstado: true,          categoria: "tecnologia-informacao" },
  { id: "ti-jud-tjdft",        nome: "Analista Judiciário — TI / TJDFT",           orgao: "Tribunal de Justiça do DF (TJDFT)",     sigla: "TJDFT",  area: "judiciario", banca: "CESPE/CEBRASPE", categoria: "tecnologia-informacao" },

  // ══════════════════════════════════════════════════════════
  // JURÍDICO / AGU / DPU
  // ══════════════════════════════════════════════════════════
  { id: "procurador-federal",  nome: "Procurador Federal",                        orgao: "Advocacia-Geral da União (AGU)",  sigla: "AGU",   area: "juridico", banca: "CESPE/CEBRASPE", categoria: "direito" },
  { id: "advogado-uniao",      nome: "Advogado da União",                         orgao: "Advocacia-Geral da União (AGU)",  sigla: "AGU",   area: "juridico", banca: "CESPE/CEBRASPE", categoria: "direito" },
  { id: "analista-agu",        nome: "Analista / Técnico Administrativo — AGU",   orgao: "Advocacia-Geral da União (AGU)",  sigla: "AGU",   area: "juridico", banca: "CESPE/CEBRASPE", categoria: "direito" },
  { id: "ti-jur-agu",          nome: "Analista de TI — AGU",                      orgao: "Advocacia-Geral da União (AGU)",  sigla: "AGU",   area: "juridico", banca: "CESPE/CEBRASPE", categoria: "tecnologia-informacao" },

  { id: "defensor-dpu",        nome: "Defensor Público Federal",                  orgao: "Defensoria Pública da União (DPU)",sigla: "DPU",  area: "juridico", banca: "CESPE/CEBRASPE", categoria: "direito" },
  { id: "analista-dpu",        nome: "Analista / Técnico — DPU",                  orgao: "Defensoria Pública da União (DPU)",sigla: "DPU",  area: "juridico", banca: "CESPE/CEBRASPE", categoria: "direito" },
  { id: "ti-jur-dpu",          nome: "Analista de TI — DPU",                      orgao: "Defensoria Pública da União (DPU)",sigla: "DPU",  area: "juridico", banca: "CESPE/CEBRASPE", categoria: "tecnologia-informacao" },

  { id: "procurador-pge",      nome: "Procurador do Estado",                      orgao: "Procuradoria-Geral do Estado (PGE)",sigla: "PGE", area: "juridico", hasEstado: true, banca: "VUNESP", categoria: "direito" },

  { id: "defensor-dpe",        nome: "Defensor Público Estadual",                 orgao: "Defensoria Pública Estadual (DPE)", sigla: "DPE", area: "juridico", hasEstado: true, banca: "CESPE/CEBRASPE", categoria: "direito" },
  { id: "analista-dpe",        nome: "Analista / Técnico — DPE",                  orgao: "Defensoria Pública Estadual (DPE)", sigla: "DPE", area: "juridico", hasEstado: true, categoria: "direito" },

  { id: "juiz-federal",        nome: "Juiz Federal",                              orgao: "Conselho da Justiça Federal (CJF)", sigla: "CJF", area: "juridico", banca: "CESPE/CEBRASPE", categoria: "direito" },
  { id: "juiz-estadual",       nome: "Juiz de Direito",                           orgao: "Tribunal de Justiça Estadual (TJ)", sigla: "TJ",  area: "juridico", hasEstado: true, categoria: "direito" },

  // ══════════════════════════════════════════════════════════
  // MINISTÉRIO PÚBLICO
  // ══════════════════════════════════════════════════════════
  { id: "procurador-mpf",      nome: "Procurador da República — MPF",             orgao: "Ministério Público Federal (MPF)",  sigla: "MPF", area: "mp", banca: "CESPE/CEBRASPE", categoria: "ministerio-publico" },
  { id: "analista-mpf",        nome: "Analista / Técnico Administrativo — MPF",   orgao: "Ministério Público Federal (MPF)",  sigla: "MPF", area: "mp", banca: "CESPE/CEBRASPE", categoria: "ministerio-publico" },

  { id: "promotor-estadual",   nome: "Promotor de Justiça",                       orgao: "Ministério Público Estadual (MP)",  sigla: "MP",  area: "mp", hasEstado: true, banca: "CESPE/CEBRASPE", categoria: "ministerio-publico" },
  { id: "analista-mp-est",     nome: "Analista / Técnico — MP Estadual",          orgao: "Ministério Público Estadual (MP)",  sigla: "MP",  area: "mp", hasEstado: true, categoria: "ministerio-publico" },
  { id: "ti-mp-estadual",      nome: "Analista de TI — MP Estadual",              orgao: "Ministério Público Estadual (MP)",  sigla: "MP",  area: "mp", hasEstado: true, categoria: "tecnologia-informacao" },

  { id: "promotor-mpdft",      nome: "Promotor de Justiça — MPDFT",               orgao: "MP do Distrito Federal (MPDFT)",    sigla: "MPDFT", area: "mp", banca: "CESPE/CEBRASPE", categoria: "ministerio-publico" },
  { id: "analista-mpdft",      nome: "Analista / Técnico — MPDFT",                orgao: "MP do Distrito Federal (MPDFT)",    sigla: "MPDFT", area: "mp", banca: "CESPE/CEBRASPE", categoria: "ministerio-publico" },
  { id: "ti-mpdft",            nome: "Analista de TI — MPDFT",                    orgao: "MP do Distrito Federal (MPDFT)",    sigla: "MPDFT", area: "mp", banca: "CESPE/CEBRASPE", categoria: "tecnologia-informacao" },
  { id: "ti-mpf-cargo",        nome: "Analista de TI — MPF",                      orgao: "Ministério Público Federal (MPF)",  sigla: "MPF",   area: "mp", banca: "CESPE/CEBRASPE", categoria: "tecnologia-informacao" },

  // ══════════════════════════════════════════════════════════
  // POLICIAL / SEGURANÇA PÚBLICA
  // ══════════════════════════════════════════════════════════
  // Polícia Federal
  { id: "delegado-pf",         nome: "Delegado de Polícia Federal",               orgao: "Polícia Federal (PF)",              sigla: "PF",  area: "policial", banca: "CESPE/CEBRASPE", categoria: "policial" },
  { id: "agente-pf",           nome: "Agente de Polícia Federal",                 orgao: "Polícia Federal (PF)",              sigla: "PF",  area: "policial", banca: "CESPE/CEBRASPE", categoria: "policial" },
  { id: "escrivao-pf",         nome: "Escrivão de Polícia Federal",               orgao: "Polícia Federal (PF)",              sigla: "PF",  area: "policial", banca: "CESPE/CEBRASPE", categoria: "policial" },
  { id: "perito-pf",           nome: "Perito Criminal Federal",                   orgao: "Polícia Federal (PF)",              sigla: "PF",  area: "policial", banca: "CESPE/CEBRASPE", categoria: "policial" },
  { id: "papiloscopista-pf",   nome: "Papiloscopista Policial Federal",           orgao: "Polícia Federal (PF)",              sigla: "PF",  area: "policial", banca: "CESPE/CEBRASPE", categoria: "policial" },

  // PRF
  { id: "prf",                 nome: "Policial Rodoviário Federal",               orgao: "Polícia Rodoviária Federal (PRF)",  sigla: "PRF", area: "policial", banca: "CESPE/CEBRASPE", categoria: "policial" },

  // Polícia Civil Estadual
  { id: "delegado-pc",         nome: "Delegado de Polícia Civil",                 orgao: "Polícia Civil Estadual (PC)",       sigla: "PC",  area: "policial", hasEstado: true, categoria: "policial" },
  { id: "escrivao-pc",         nome: "Escrivão de Polícia Civil",                 orgao: "Polícia Civil Estadual (PC)",       sigla: "PC",  area: "policial", hasEstado: true, categoria: "policial" },
  { id: "agente-investigador-pc", nome: "Agente / Investigador de Polícia Civil", orgao: "Polícia Civil Estadual (PC)",       sigla: "PC",  area: "policial", hasEstado: true, categoria: "policial" },
  { id: "perito-pc",           nome: "Perito Criminal Estadual",                  orgao: "Polícia Civil Estadual (PC)",       sigla: "PC",  area: "policial", hasEstado: true, categoria: "policial" },
  { id: "papiloscopista-pc",   nome: "Papiloscopista / Identificador",            orgao: "Polícia Civil Estadual (PC)",       sigla: "PC",  area: "policial", hasEstado: true, categoria: "policial" },

  // Polícia Militar Estadual
  { id: "pm-soldado",          nome: "Soldado / Cabo PM",                         orgao: "Polícia Militar Estadual (PM)",     sigla: "PM",  area: "policial", hasEstado: true, categoria: "policial" },
  { id: "pm-sargento",         nome: "Sargento PM (CHO/CFS)",                     orgao: "Polícia Militar Estadual (PM)",     sigla: "PM",  area: "policial", hasEstado: true, categoria: "policial" },
  { id: "pm-oficial",          nome: "Oficial PM (CFO)",                          orgao: "Polícia Militar Estadual (PM)",     sigla: "PM",  area: "policial", hasEstado: true, categoria: "policial" },

  // Corpo de Bombeiros Estadual
  { id: "cbm-soldado",         nome: "Soldado / Combatente BM",                   orgao: "Corpo de Bombeiros Militar (CBM)", sigla: "CBM", area: "policial", hasEstado: true, categoria: "policial" },
  { id: "cbm-oficial",         nome: "Oficial de Bombeiro Militar",               orgao: "Corpo de Bombeiros Militar (CBM)", sigla: "CBM", area: "policial", hasEstado: true, categoria: "policial" },

  // PCDF / PMDF (DF — sem estado pois só é 1)
  { id: "delegado-pcdf",       nome: "Delegado de Polícia Civil — PCDF",          orgao: "Polícia Civil do DF (PCDF)",        sigla: "PCDF",area: "policial", banca: "CESPE/CEBRASPE", categoria: "policial" },
  { id: "agente-pcdf",         nome: "Agente / Escrivão — PCDF",                  orgao: "Polícia Civil do DF (PCDF)",        sigla: "PCDF",area: "policial", banca: "CESPE/CEBRASPE", categoria: "policial" },
  { id: "pm-pmdf",             nome: "Policial Militar — PMDF",                   orgao: "Polícia Militar do DF (PMDF)",      sigla: "PMDF",area: "policial", banca: "CESPE/CEBRASPE", categoria: "policial" },
  { id: "cbm-cbmdf",           nome: "Bombeiro Militar — CBMDF",                  orgao: "Corpo de Bombeiros do DF (CBMDF)",  sigla: "CBMDF",area: "policial", banca: "CESPE/CEBRASPE", categoria: "policial" },

  // Polícia Penal / Agente Penitenciário
  { id: "policial-penal",      nome: "Policial Penal / Agente Penitenciário",     orgao: "Secretaria de Administração Penitenciária", sigla: "SAP", area: "policial", hasEstado: true, categoria: "policial" },

  // ══════════════════════════════════════════════════════════
  // BANCÁRIO / FINANCEIRO
  // ══════════════════════════════════════════════════════════
  { id: "escriturario-bb",     nome: "Escriturário — Banco do Brasil",            orgao: "Banco do Brasil (BB)",              sigla: "BB",  area: "bancario", banca: "CESGRANRIO",     categoria: "bancario" },
  { id: "analista-bb",         nome: "Analista — Banco do Brasil",                orgao: "Banco do Brasil (BB)",              sigla: "BB",  area: "bancario", banca: "CESGRANRIO",     categoria: "bancario" },

  { id: "tecnico-cef",         nome: "Técnico Bancário — Caixa Econômica",        orgao: "Caixa Econômica Federal (CEF)",     sigla: "CEF", area: "bancario", banca: "CESGRANRIO",     categoria: "bancario" },
  { id: "analista-cef",        nome: "Analista — Caixa Econômica",                orgao: "Caixa Econômica Federal (CEF)",     sigla: "CEF", area: "bancario", banca: "CESGRANRIO",     categoria: "bancario" },

  { id: "analista-bacen",      nome: "Analista do Banco Central",                 orgao: "Banco Central do Brasil (BACEN)",   sigla: "BACEN", area: "bancario", banca: "CESPE/CEBRASPE", categoria: "banco-central" },
  { id: "tecnico-bacen",       nome: "Técnico do Banco Central",                  orgao: "Banco Central do Brasil (BACEN)",   sigla: "BACEN", area: "bancario", banca: "CESPE/CEBRASPE", categoria: "banco-central" },
  { id: "ti-banc-bacen",       nome: "Analista de TI — Banco Central",            orgao: "Banco Central do Brasil (BACEN)",   sigla: "BACEN", area: "bancario", banca: "CESPE/CEBRASPE", categoria: "tecnologia-informacao" },

  { id: "analista-bndes",      nome: "Analista — BNDES",                          orgao: "BNDES",                             sigla: "BNDES", area: "bancario", banca: "CESGRANRIO",  categoria: "bancario" },
  { id: "tecnico-bndes",       nome: "Técnico Administrativo — BNDES",            orgao: "BNDES",                             sigla: "BNDES", area: "bancario", banca: "CESGRANRIO",  categoria: "bancario" },
  { id: "ti-banc-bndes",       nome: "Analista de TI — BNDES",                    orgao: "BNDES",                             sigla: "BNDES", area: "bancario", banca: "CESGRANRIO",  categoria: "tecnologia-informacao" },

  { id: "analista-brb",        nome: "Analista / Técnico — BRB",                  orgao: "Banco de Brasília (BRB)",           sigla: "BRB", area: "bancario", banca: "IADES",          categoria: "bancario" },

  { id: "tecnico-banco-est",   nome: "Técnico / Analista — Banco Estadual",       orgao: "Banco Estadual (BANESE, BANRISUL…)", sigla: "BnkEst", area: "bancario", hasEstado: true, categoria: "bancario" },

  // ══════════════════════════════════════════════════════════
  // CONTROLE / AUDITORIA
  // ══════════════════════════════════════════════════════════
  { id: "auditor-tcu",         nome: "Auditor Federal de Controle Externo — TCU", orgao: "Tribunal de Contas da União (TCU)", sigla: "TCU", area: "controle", banca: "CESPE/CEBRASPE", categoria: "controle-auditoria" },
  { id: "analista-tcu",        nome: "Analista de Controle Externo — TCU",        orgao: "Tribunal de Contas da União (TCU)", sigla: "TCU", area: "controle", banca: "CESPE/CEBRASPE", categoria: "controle-auditoria" },
  { id: "tecnico-tcu",         nome: "Técnico de Controle Externo — TCU",         orgao: "Tribunal de Contas da União (TCU)", sigla: "TCU", area: "controle", banca: "CESPE/CEBRASPE", categoria: "controle-auditoria" },

  { id: "auditor-cgu",         nome: "Auditor Federal — CGU",                     orgao: "Controladoria-Geral da União (CGU)",sigla: "CGU", area: "controle", banca: "CESPE/CEBRASPE", categoria: "controle-auditoria" },
  { id: "analista-cgu",        nome: "Analista de Finanças e Controle — CGU",     orgao: "Controladoria-Geral da União (CGU)",sigla: "CGU", area: "controle", banca: "CESPE/CEBRASPE", categoria: "controle-auditoria" },

  { id: "auditor-tce",         nome: "Auditor de Controle Externo — TCE",         orgao: "Tribunal de Contas Estadual (TCE)", sigla: "TCE", area: "controle", hasEstado: true, categoria: "controle-auditoria" },
  { id: "analista-tce",        nome: "Analista / Técnico — TCE",                  orgao: "Tribunal de Contas Estadual (TCE)", sigla: "TCE", area: "controle", hasEstado: true, categoria: "controle-auditoria" },
  // TI dentro do Controle
  { id: "ti-ctrl-tcu",         nome: "Analista de Controle Externo — TI / TCU",   orgao: "Tribunal de Contas da União (TCU)", sigla: "TCU", area: "controle", banca: "CESPE/CEBRASPE", categoria: "tecnologia-informacao" },
  { id: "ti-ctrl-cgu",         nome: "Analista de TI — CGU",                       orgao: "Controladoria-Geral da União (CGU)",sigla: "CGU", area: "controle", banca: "CESPE/CEBRASPE", categoria: "tecnologia-informacao" },
  { id: "ti-ctrl-tce",         nome: "Analista de TI — TCE Estadual",              orgao: "Tribunal de Contas Estadual (TCE)", sigla: "TCE", area: "controle", hasEstado: true, categoria: "tecnologia-informacao" },

  // ══════════════════════════════════════════════════════════
  // PREVIDÊNCIA SOCIAL
  // ══════════════════════════════════════════════════════════
  { id: "tecnico-inss",        nome: "Técnico do Seguro Social — INSS",           orgao: "INSS",                              sigla: "INSS",area: "previdencia", banca: "CESPE/CEBRASPE", categoria: "previdencia-social" },
  { id: "analista-inss",       nome: "Analista do Seguro Social — INSS",          orgao: "INSS",                              sigla: "INSS",area: "previdencia", banca: "CESPE/CEBRASPE", categoria: "previdencia-social" },
  { id: "perito-inss",         nome: "Perito Médico Federal — INSS",              orgao: "INSS",                              sigla: "INSS",area: "previdencia", banca: "CESPE/CEBRASPE", categoria: "previdencia-social" },
  { id: "ti-prev-inss",        nome: "Analista do Seguro Social — TI / INSS",     orgao: "INSS",                              sigla: "INSS",area: "previdencia", banca: "CESPE/CEBRASPE", categoria: "tecnologia-informacao" },

  // ══════════════════════════════════════════════════════════
  // TECNOLOGIA DA INFORMAÇÃO
  // ══════════════════════════════════════════════════════════
  { id: "analista-serpro",     nome: "Analista de Tecnologia — SERPRO",           orgao: "SERPRO",                            sigla: "SERPRO", area: "ti", banca: "CESPE/CEBRASPE", categoria: "tecnologia-informacao" },
  { id: "tecnico-serpro",      nome: "Técnico de Tecnologia — SERPRO",            orgao: "SERPRO",                            sigla: "SERPRO", area: "ti", banca: "CESPE/CEBRASPE", categoria: "tecnologia-informacao" },

  { id: "analista-dataprev",   nome: "Analista / Técnico de TI — DATAPREV",       orgao: "DATAPREV",                          sigla: "DATAPREV", area: "ti", banca: "CESPE/CEBRASPE", categoria: "tecnologia-informacao" },

  { id: "analista-ti-gov",     nome: "Analista de Tecnologia da Informação — Gov. Federal", orgao: "Governo Federal (Ministérios / Autarquias)", sigla: "Gov-TI", area: "ti", banca: "CESPE/CEBRASPE", categoria: "tecnologia-informacao" },

  { id: "analista-ti-trf",     nome: "Analista Judiciário — TI / TRF",            orgao: "Tribunal Regional Federal (TRF)",        sigla: "TRF",    area: "ti", banca: "CESPE/CEBRASPE", categoria: "tecnologia-informacao" },
  { id: "analista-ti-bb",      nome: "Analista de TI — Banco do Brasil",          orgao: "Banco do Brasil (BB)",                  sigla: "BB-TI",  area: "ti", banca: "CESGRANRIO",     categoria: "tecnologia-informacao" },
  { id: "analista-ti-cef",     nome: "Analista de TI — Caixa Econômica",          orgao: "Caixa Econômica Federal (CEF)",         sigla: "CEF-TI", area: "ti", banca: "CESGRANRIO",     categoria: "tecnologia-informacao" },

  // Tribunais Superiores — TI
  { id: "ti-stf",              nome: "Analista Judiciário — TI / STF",             orgao: "Supremo Tribunal Federal (STF)",        sigla: "STF",    area: "ti", banca: "FGV",            categoria: "tecnologia-informacao" },
  { id: "ti-stj",              nome: "Analista Judiciário — TI / STJ",             orgao: "Superior Tribunal de Justiça (STJ)",    sigla: "STJ",    area: "ti", banca: "CESPE/CEBRASPE", categoria: "tecnologia-informacao" },
  { id: "ti-tse",              nome: "Analista Judiciário — TI / TSE",             orgao: "Tribunal Superior Eleitoral (TSE)",     sigla: "TSE",    area: "ti", banca: "FCC",            categoria: "tecnologia-informacao" },
  { id: "ti-tst",              nome: "Analista Judiciário — TI / TST",             orgao: "Tribunal Superior do Trabalho (TST)",   sigla: "TST",    area: "ti", banca: "FCC",            categoria: "tecnologia-informacao" },
  { id: "ti-trt",              nome: "Analista Judiciário — TI / TRT",             orgao: "Tribunal Regional do Trabalho (TRT)",   sigla: "TRT",    area: "ti", banca: "FCC",            categoria: "tecnologia-informacao" },
  { id: "ti-tre",              nome: "Analista Judiciário — TI / TRE",             orgao: "Tribunal Regional Eleitoral (TRE)",     sigla: "TRE",    area: "ti", hasEstado: true,          categoria: "tecnologia-informacao" },
  { id: "ti-tj",               nome: "Analista Judiciário — TI / TJ Estadual",     orgao: "Tribunal de Justiça Estadual (TJ)",     sigla: "TJ",     area: "ti", hasEstado: true,          categoria: "tecnologia-informacao" },
  { id: "ti-tjdft",            nome: "Analista Judiciário — TI / TJDFT",           orgao: "Tribunal de Justiça do DF (TJDFT)",     sigla: "TJDFT",  area: "ti", banca: "CESPE/CEBRASPE", categoria: "tecnologia-informacao" },

  // Ministério Público — TI
  { id: "ti-mpf",              nome: "Analista de TI — MPF",                       orgao: "Ministério Público Federal (MPF)",      sigla: "MPF",    area: "ti", banca: "CESPE/CEBRASPE", categoria: "tecnologia-informacao" },
  { id: "ti-mp-est",           nome: "Analista de TI — MP Estadual",               orgao: "Ministério Público Estadual (MP)",      sigla: "MP",     area: "ti", hasEstado: true,          categoria: "tecnologia-informacao" },
  { id: "ti-mpdft",            nome: "Analista de TI — MPDFT",                     orgao: "MP do Distrito Federal (MPDFT)",        sigla: "MPDFT",  area: "ti", banca: "CESPE/CEBRASPE", categoria: "tecnologia-informacao" },

  // Controle / Auditoria — TI
  { id: "ti-tcu",              nome: "Analista de Controle Externo — TI / TCU",    orgao: "Tribunal de Contas da União (TCU)",     sigla: "TCU",    area: "ti", banca: "CESPE/CEBRASPE", categoria: "tecnologia-informacao" },
  { id: "ti-cgu",              nome: "Analista de TI — CGU",                       orgao: "Controladoria-Geral da União (CGU)",    sigla: "CGU",    area: "ti", banca: "CESPE/CEBRASPE", categoria: "tecnologia-informacao" },
  { id: "ti-tce",              nome: "Analista de TI — TCE Estadual",              orgao: "Tribunal de Contas Estadual (TCE)",     sigla: "TCE",    area: "ti", hasEstado: true,          categoria: "tecnologia-informacao" },

  // Previdência — TI
  { id: "ti-inss",             nome: "Analista do Seguro Social — TI / INSS",      orgao: "INSS",                                  sigla: "INSS",   area: "ti", banca: "CESPE/CEBRASPE", categoria: "tecnologia-informacao" },

  // Jurídico — TI
  { id: "ti-agu",              nome: "Analista de TI — AGU",                       orgao: "Advocacia-Geral da União (AGU)",        sigla: "AGU",    area: "ti", banca: "CESPE/CEBRASPE", categoria: "tecnologia-informacao" },
  { id: "ti-dpu",              nome: "Analista de TI — DPU",                       orgao: "Defensoria Pública da União (DPU)",     sigla: "DPU",    area: "ti", banca: "CESPE/CEBRASPE", categoria: "tecnologia-informacao" },

  // Policial — TI
  { id: "ti-pf",               nome: "Perito Digital / Analista de TI — PF",       orgao: "Polícia Federal (PF)",                  sigla: "PF",     area: "ti", banca: "CESPE/CEBRASPE", categoria: "tecnologia-informacao" },
  { id: "ti-pcdf",             nome: "Analista de TI — PCDF",                      orgao: "Polícia Civil do DF (PCDF)",            sigla: "PCDF",   area: "ti", banca: "CESPE/CEBRASPE", categoria: "tecnologia-informacao" },

  // Bancário — TI
  { id: "ti-bacen",            nome: "Analista de TI — Banco Central",             orgao: "Banco Central do Brasil (BACEN)",       sigla: "BACEN",  area: "ti", banca: "CESPE/CEBRASPE", categoria: "tecnologia-informacao" },
  { id: "ti-bndes",            nome: "Analista de TI — BNDES",                     orgao: "BNDES",                                 sigla: "BNDES",  area: "ti", banca: "CESGRANRIO",     categoria: "tecnologia-informacao" },

  // Fiscal — TI
  { id: "ti-rfb",              nome: "Analista de Sistemas / TI — RFB",            orgao: "Receita Federal do Brasil (RFB)",       sigla: "RFB",    area: "ti", banca: "CESPE/CEBRASPE", categoria: "tecnologia-informacao" },
  { id: "ti-sefaz",            nome: "Analista de TI — SEFAZ Estadual",            orgao: "Secretaria de Fazenda Estadual (SEFAZ)",sigla: "SEFAZ",  area: "ti", hasEstado: true,          categoria: "tecnologia-informacao" },

  // Ambiental / Infraestrutura — TI
  { id: "ti-ibge",             nome: "Analista de TI — IBGE",                      orgao: "IBGE",                                  sigla: "IBGE",   area: "ti", banca: "CESPE/CEBRASPE", categoria: "tecnologia-informacao" },
  { id: "ti-ibama",            nome: "Analista de TI — IBAMA",                     orgao: "IBAMA",                                 sigla: "IBAMA",  area: "ti", banca: "CESPE/CEBRASPE", categoria: "tecnologia-informacao" },
  { id: "ti-incra",            nome: "Analista de TI — INCRA",                     orgao: "INCRA",                                 sigla: "INCRA",  area: "ti", banca: "CESPE/CEBRASPE", categoria: "tecnologia-informacao" },
  { id: "ti-dnit",             nome: "Analista de TI — DNIT",                      orgao: "DNIT",                                  sigla: "DNIT",   area: "ti", banca: "CESPE/CEBRASPE", categoria: "tecnologia-informacao" },

  // Saúde — TI
  { id: "ti-anvisa",           nome: "Analista de TI — ANVISA",                    orgao: "ANVISA",                                sigla: "ANVISA", area: "ti", banca: "CESPE/CEBRASPE", categoria: "tecnologia-informacao" },
  { id: "ti-ans",              nome: "Analista de TI — ANS",                       orgao: "ANS — Agência Nacional de Saúde",       sigla: "ANS",    area: "ti", banca: "CESPE/CEBRASPE", categoria: "tecnologia-informacao" },
  { id: "ti-fiocruz",          nome: "Analista de TI — FIOCRUZ",                   orgao: "FIOCRUZ",                               sigla: "FIOCRUZ",area: "ti", banca: "CESPE/CEBRASPE", categoria: "tecnologia-informacao" },

  // Administrativo / Estatais — TI
  { id: "ti-petrobras",        nome: "Analista de TI / Sistemas — Petrobras",      orgao: "Petrobras",                             sigla: "Petrobras", area: "ti", banca: "CESGRANRIO",  categoria: "tecnologia-informacao" },
  { id: "ti-correios",         nome: "Analista de TI — Correios",                  orgao: "Correios (ECT)",                        sigla: "ECT",    area: "ti",                          categoria: "tecnologia-informacao" },
  { id: "ti-anatel",           nome: "Analista de TI — ANATEL",                    orgao: "ANATEL",                                sigla: "ANATEL", area: "ti", banca: "CESPE/CEBRASPE", categoria: "tecnologia-informacao" },
  { id: "ti-aneel",            nome: "Analista de TI — ANEEL",                     orgao: "ANEEL",                                 sigla: "ANEEL",  area: "ti", banca: "CESPE/CEBRASPE", categoria: "tecnologia-informacao" },
  { id: "ti-antt",             nome: "Analista de TI — ANTT",                      orgao: "ANTT",                                  sigla: "ANTT",   area: "ti", banca: "CESPE/CEBRASPE", categoria: "tecnologia-informacao" },
  { id: "ti-prefeitura",       nome: "Analista / Técnico de TI — Prefeitura",      orgao: "Prefeitura Municipal",                  sigla: "Pref",   area: "ti", hasEstado: true,          categoria: "tecnologia-informacao" },
  { id: "ti-gov-estadual",     nome: "Analista / Técnico de TI — Gov. Estadual",   orgao: "Governo Estadual",                      sigla: "Gov",    area: "ti", hasEstado: true,          categoria: "tecnologia-informacao" },

  // ══════════════════════════════════════════════════════════
  // DIPLOMÁTICO / ITAMARATY
  // ══════════════════════════════════════════════════════════
  { id: "diplomata",           nome: "Diplomata — CACD",                          orgao: "Ministério das Relações Exteriores (MRE)", sigla: "MRE", area: "diplomatico", banca: "CESPE/CEBRASPE", categoria: "diplomacia" },
  { id: "oficial-chancelaria", nome: "Oficial de Chancelaria — MRE",              orgao: "Ministério das Relações Exteriores (MRE)", sigla: "MRE", area: "diplomatico", banca: "CESPE/CEBRASPE", categoria: "diplomacia" },
  { id: "aux-chancelaria",     nome: "Assistente de Chancelaria — MRE",           orgao: "Ministério das Relações Exteriores (MRE)", sigla: "MRE", area: "diplomatico", banca: "CESPE/CEBRASPE", categoria: "diplomacia" },

  // ══════════════════════════════════════════════════════════
  // MILITAR / DEFESA
  // ══════════════════════════════════════════════════════════
  { id: "efomm",               nome: "EFOMM — Escola de Formação de Oficiais da MM", orgao: "Marinha do Brasil",               sigla: "MB",  area: "militar", categoria: "militar" },
  { id: "en-marinha",          nome: "EN — Escola Naval",                         orgao: "Marinha do Brasil",                 sigla: "MB",  area: "militar", categoria: "militar" },
  { id: "epcar",               nome: "EPCAR — Escola Prep. de Cadetes do Ar",    orgao: "Força Aérea Brasileira (FAB)",      sigla: "FAB", area: "militar", categoria: "militar" },
  { id: "afa",                 nome: "AFA — Academia da Força Aérea",             orgao: "Força Aérea Brasileira (FAB)",      sigla: "FAB", area: "militar", categoria: "militar" },
  { id: "espcex",              nome: "EsPCEx — Escola Prep. de Cadetes do Exército", orgao: "Exército Brasileiro",            sigla: "EB",  area: "militar", categoria: "militar" },
  { id: "aman",                nome: "AMAN — Academia Militar das Agulhas Negras", orgao: "Exército Brasileiro",              sigla: "EB",  area: "militar", categoria: "militar" },
  { id: "cbf-federal",         nome: "Bombeiro Militar Federal — CBMDF",          orgao: "Corpo de Bombeiros do DF (CBMDF)", sigla: "CBMDF", area: "militar", categoria: "militar" },

  // ══════════════════════════════════════════════════════════
  // SAÚDE
  // ══════════════════════════════════════════════════════════
  { id: "medico-sus",          nome: "Médico em Concurso Público",                orgao: "Prefeitura / SUS Municipal",        sigla: "SUS", area: "saude", hasEstado: true, banca: "CESPE/CEBRASPE", categoria: "saude" },
  { id: "enfermeiro-sus",      nome: "Enfermeiro em Concurso Público",            orgao: "Prefeitura / SUS Municipal",        sigla: "SUS", area: "saude", hasEstado: true, categoria: "saude" },
  { id: "farmaceutico-sus",    nome: "Farmacêutico em Concurso Público",          orgao: "Prefeitura / SUS Municipal",        sigla: "SUS", area: "saude", hasEstado: true, categoria: "saude" },
  { id: "fisio-sus",           nome: "Fisioterapeuta em Concurso Público",        orgao: "Prefeitura / SUS Municipal",        sigla: "SUS", area: "saude", hasEstado: true, categoria: "saude" },

  { id: "analista-anvisa",     nome: "Especialista / Técnico em Regulação — ANVISA", orgao: "ANVISA",                       sigla: "ANVISA", area: "saude", banca: "CESPE/CEBRASPE", categoria: "saude" },
  { id: "analista-ans",        nome: "Técnico / Analista — ANS",                 orgao: "ANS — Agência Nacional de Saúde", sigla: "ANS", area: "saude", banca: "CESPE/CEBRASPE", categoria: "saude" },
  { id: "pesquisador-fiocruz", nome: "Pesquisador / Tecnologista — FIOCRUZ",     orgao: "FIOCRUZ",                          sigla: "FIOCRUZ", area: "saude", banca: "CESPE/CEBRASPE", categoria: "saude" },

  // ══════════════════════════════════════════════════════════
  // AMBIENTAL / AGRÁRIO / INFRAESTRUTURA
  // ══════════════════════════════════════════════════════════
  { id: "ibama-analista",      nome: "Analista Ambiental — IBAMA",                orgao: "IBAMA",                             sigla: "IBAMA",  area: "ambiental", banca: "CESPE/CEBRASPE", categoria: "ambiental-agro" },
  { id: "ibama-tecnico",       nome: "Técnico Ambiental — IBAMA",                 orgao: "IBAMA",                             sigla: "IBAMA",  area: "ambiental", banca: "CESPE/CEBRASPE", categoria: "ambiental-agro" },

  { id: "icmbio-analista",     nome: "Analista Ambiental — ICMBio",               orgao: "ICMBio",                            sigla: "ICMBio", area: "ambiental", banca: "CESPE/CEBRASPE", categoria: "ambiental-agro" },

  { id: "incra-analista",      nome: "Analista em Reforma Agrária — INCRA",       orgao: "INCRA",                             sigla: "INCRA",  area: "ambiental", banca: "CESPE/CEBRASPE", categoria: "ambiental-agro" },
  { id: "incra-tecnico",       nome: "Técnico em Assuntos Fundiários — INCRA",    orgao: "INCRA",                             sigla: "INCRA",  area: "ambiental", banca: "CESPE/CEBRASPE", categoria: "ambiental-agro" },

  { id: "mapa-analista",       nome: "Analista Agropecuário — MAPA",              orgao: "Ministério da Agricultura (MAPA)",  sigla: "MAPA",   area: "ambiental", banca: "CESPE/CEBRASPE", categoria: "ambiental-agro" },
  { id: "mapa-tecnico",        nome: "Agente de Atividades Agropecuárias — MAPA", orgao: "Ministério da Agricultura (MAPA)", sigla: "MAPA",   area: "ambiental", banca: "CESPE/CEBRASPE", categoria: "ambiental-agro" },

  { id: "embrapa-pesquisador", nome: "Pesquisador — EMBRAPA",                     orgao: "EMBRAPA",                           sigla: "EMBRAPA",area: "ambiental", banca: "CESPE/CEBRASPE", categoria: "ambiental-agro" },
  { id: "embrapa-analista",    nome: "Analista Administrativo — EMBRAPA",         orgao: "EMBRAPA",                           sigla: "EMBRAPA",area: "ambiental", banca: "CESPE/CEBRASPE", categoria: "ambiental-agro" },

  { id: "funai-indigenista",   nome: "Indigenista Especializado — FUNAI",         orgao: "FUNAI",                             sigla: "FUNAI",  area: "ambiental", banca: "CESPE/CEBRASPE", categoria: "ambiental-agro" },
  { id: "funai-analista",      nome: "Analista Administrativo — FUNAI",           orgao: "FUNAI",                             sigla: "FUNAI",  area: "ambiental", banca: "CESPE/CEBRASPE", categoria: "ambiental-agro" },

  { id: "dnit-especialista",   nome: "Especialista em Infraestrutura de Transportes — DNIT", orgao: "DNIT",                   sigla: "DNIT",   area: "ambiental", banca: "CESPE/CEBRASPE", categoria: "ambiental-agro" },
  { id: "dnit-analista",       nome: "Analista Administrativo — DNIT",            orgao: "DNIT",                              sigla: "DNIT",   area: "ambiental", banca: "CESPE/CEBRASPE", categoria: "ambiental-agro" },

  { id: "ibge-analista",       nome: "Analista — IBGE",                           orgao: "IBGE",                              sigla: "IBGE",   area: "ambiental", banca: "CESPE/CEBRASPE", categoria: "ambiental-agro" },
  { id: "ibge-tecnico",        nome: "Técnico em Informações Geográficas — IBGE", orgao: "IBGE",                              sigla: "IBGE",   area: "ambiental", banca: "CESPE/CEBRASPE", categoria: "ambiental-agro" },
  { id: "ibge-agente",         nome: "Agente de Pesquisas e Mapeamento — IBGE",   orgao: "IBGE",                              sigla: "IBGE",   area: "ambiental", banca: "CESPE/CEBRASPE", categoria: "ambiental-agro" },
  { id: "ti-amb-ibge",         nome: "Analista de TI — IBGE",                     orgao: "IBGE",                              sigla: "IBGE",   area: "ambiental", banca: "CESPE/CEBRASPE", categoria: "tecnologia-informacao" },
  { id: "ti-amb-ibama",        nome: "Analista de TI — IBAMA",                    orgao: "IBAMA",                             sigla: "IBAMA",  area: "ambiental", banca: "CESPE/CEBRASPE", categoria: "tecnologia-informacao" },
  { id: "ti-amb-dnit",         nome: "Analista de TI — DNIT",                     orgao: "DNIT",                              sigla: "DNIT",   area: "ambiental", banca: "CESPE/CEBRASPE", categoria: "tecnologia-informacao" },

  // ══════════════════════════════════════════════════════════
  // ADMINISTRATIVO / GERAL
  // ══════════════════════════════════════════════════════════
  { id: "eppgg",               nome: "Especialista em Políticas Públicas — EPPGG", orgao: "Governo Federal (EPPGG / SEGRT)", sigla: "EPPGG", area: "administrativo", banca: "CESPE/CEBRASPE", categoria: "gestao-publica" },

  { id: "petrobras-tecnico",   nome: "Técnico de Administração — Petrobras",       orgao: "Petrobras",                        sigla: "Petrobras", area: "administrativo", banca: "CESGRANRIO", categoria: "petrobras-estatais" },
  { id: "petrobras-eng",       nome: "Engenheiro / Profissional Jr — Petrobras",   orgao: "Petrobras",                        sigla: "Petrobras", area: "administrativo", banca: "CESGRANRIO", categoria: "petrobras-estatais" },

  { id: "correios-analista",   nome: "Analista de Correios",                       orgao: "Correios (ECT)",                   sigla: "ECT",  area: "administrativo", categoria: "gestao-publica" },
  { id: "correios-tecnico",    nome: "Técnico de Suporte Operacional — Correios",  orgao: "Correios (ECT)",                   sigla: "ECT",  area: "administrativo", categoria: "gestao-publica" },

  { id: "anatel-tecnico",      nome: "Técnico / Analista — ANATEL",                orgao: "ANATEL",                           sigla: "ANATEL", area: "administrativo", banca: "CESPE/CEBRASPE", categoria: "gestao-publica" },
  { id: "anac-tecnico",        nome: "Técnico / Analista — ANAC",                  orgao: "ANAC",                             sigla: "ANAC",   area: "administrativo", banca: "FCC",            categoria: "gestao-publica" },
  { id: "aneel-tecnico",       nome: "Técnico / Analista — ANEEL",                 orgao: "ANEEL",                            sigla: "ANEEL",  area: "administrativo", banca: "CESPE/CEBRASPE", categoria: "gestao-publica" },
  { id: "antt-tecnico",        nome: "Técnico / Analista — ANTT",                  orgao: "ANTT",                             sigla: "ANTT",   area: "administrativo", banca: "CESPE/CEBRASPE", categoria: "gestao-publica" },
  { id: "antaq-tecnico",       nome: "Técnico / Analista — ANTAQ",                 orgao: "ANTAQ",                            sigla: "ANTAQ",  area: "administrativo", banca: "CESPE/CEBRASPE", categoria: "gestao-publica" },
  { id: "ana-tecnico",         nome: "Técnico / Analista — ANA",                   orgao: "ANA — Agência Nacional de Águas",  sigla: "ANA",    area: "administrativo", banca: "CESPE/CEBRASPE", categoria: "gestao-publica" },

  { id: "analista-mpu-adm",    nome: "Analista / Técnico Administrativo — MPU",    orgao: "Ministério Público da União (MPU)",sigla: "MPU",   area: "administrativo", banca: "CESPE/CEBRASPE", categoria: "gestao-publica" },

  { id: "analista-prefeitura", nome: "Agente / Analista Administrativo Municipal", orgao: "Prefeitura Municipal",             sigla: "Pref",  area: "administrativo", hasEstado: true, categoria: "gestao-publica" },
  { id: "ti-adm-prefeitura",   nome: "Analista / Técnico de TI — Prefeitura",     orgao: "Prefeitura Municipal",             sigla: "Pref",  area: "administrativo", hasEstado: true, categoria: "tecnologia-informacao" },
  { id: "analista-gov-est",    nome: "Analista / Técnico Administrativo Estadual", orgao: "Governo Estadual",                sigla: "Gov",   area: "administrativo", hasEstado: true, categoria: "gestao-publica" },
  { id: "ti-adm-gov-est",      nome: "Analista / Técnico de TI — Gov. Estadual",  orgao: "Governo Estadual",                sigla: "Gov",   area: "administrativo", hasEstado: true, categoria: "tecnologia-informacao" },
  { id: "ti-adm-petrobras",    nome: "Analista de TI / Sistemas — Petrobras",     orgao: "Petrobras",                       sigla: "Petrobras", area: "administrativo", banca: "CESGRANRIO", categoria: "tecnologia-informacao" },
  { id: "ti-adm-correios",     nome: "Analista de TI — Correios",                 orgao: "Correios (ECT)",                  sigla: "ECT",   area: "administrativo",              categoria: "tecnologia-informacao" },
];

/** Retorna cargos agrupados por área */
export function getCargosAgrupados(): Record<AreaCargo, Cargo[]> {
  const grupos = {} as Record<AreaCargo, Cargo[]>;
  for (const c of CARGOS) {
    if (!grupos[c.area]) grupos[c.area] = [];
    grupos[c.area].push(c);
  }
  return grupos;
}

/** Retorna lista única de órgãos para uma área */
export function getOrgaosParaArea(area: AreaCargo): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const c of CARGOS) {
    if (c.area === area && !seen.has(c.orgao)) {
      seen.add(c.orgao);
      result.push(c.orgao);
    }
  }
  return result;
}

/** Retorna cargos para um órgão específico dentro de uma área */
export function getCargosParaOrgao(area: AreaCargo, orgao: string): Cargo[] {
  return CARGOS.filter(c => c.area === area && c.orgao === orgao);
}

/** Busca cargos por texto (nome ou órgão) — mantido para compatibilidade com meu-plano-section */
export function buscarCargos(query: string): Cargo[] {
  const q = query.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  return CARGOS.filter(c => {
    const nome  = c.nome.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    const orgao = c.orgao.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    return nome.includes(q) || orgao.includes(q);
  });
}

/**
 * Extrai a sigla do estado de um texto (cargo ou órgão).
 * Ex: "PC-BA", "Bahia", "SP", "São Paulo" → "BA" / "SP"
 */
export function extrairEstado(texto: string): string | undefined {
  const t = texto.toUpperCase();

  // Siglas diretas: PC-BA, PM-SP, TRE-MG, etc.
  const siglaDireta = t.match(/\b([A-Z]{2})-([A-Z]{2})\b/);
  if (siglaDireta) {
    const estado = siglaDireta[2];
    if (SIGLAS_ESTADOS.has(estado)) return estado;
  }

  // Sigla isolada no fim: "Polícia Civil (BA)", "SEFAZ SP"
  const siglaSolta = t.match(/\b(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)\b/);
  if (siglaSolta) return siglaSolta[1];

  // Nome por extenso
  const tn = texto.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  for (const [sigla, nome] of NOMES_ESTADOS) {
    if (tn.includes(nome)) return sigla;
  }

  return undefined;
}

const SIGLAS_ESTADOS = new Set([
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS",
  "MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"
]);

const NOMES_ESTADOS: [string, string][] = [
  ["AC","acre"],["AL","alagoas"],["AP","amapa"],["AM","amazonas"],
  ["BA","bahia"],["CE","ceara"],["DF","distrito federal"],["ES","espirito santo"],
  ["GO","goias"],["MA","maranhao"],["MT","mato grosso do sul"],["MS","mato grosso"],
  ["MG","minas gerais"],["PA","para"],["PB","paraiba"],["PR","parana"],
  ["PE","pernambuco"],["PI","piaui"],["RJ","rio de janeiro"],["RN","rio grande do norte"],
  ["RS","rio grande do sul"],["RO","rondonia"],["RR","roraima"],
  ["SC","santa catarina"],["SP","sao paulo"],["SE","sergipe"],["TO","tocantins"],
];

/**
 * Tenta resolver o cargoId a partir do texto de cargo + órgão digitado pelo aluno.
 * Retorna { cargoId, estado? } ou null se não encontrar.
 *
 * Exemplos:
 *   resolveCargoId("Delegado de Polícia Civil", "PC-BA") → { cargoId: "delegado-pc", estado: "BA" }
 *   resolveCargoId("Escriturário", "Banco do Brasil") → { cargoId: "escriturario-bb" }
 *   resolveCargoId("Policial Rodoviário Federal", "PRF") → { cargoId: "prf" }
 */
export function resolveCargoId(
  cargoTexto: string,
  orgaoTexto: string
): { cargoId: string; estado?: string } | null {
  const norm = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]/g, " ");

  const cargo = norm(cargoTexto);
  const orgao = norm(orgaoTexto);
  const texto = `${cargo} ${orgao}`;

  let melhorCargo: Cargo | null = null;
  let melhorScore = 0;

  for (const c of CARGOS) {
    const nomeN = norm(c.nome);
    const orgaoN = norm(c.orgao);
    const siglaAlt = c.sigla ? norm(c.sigla) : "";

    let score = 0;

    // Pontuação por palavras em comum no nome do cargo
    const palavrasNome = nomeN.split(" ").filter(p => p.length > 3);
    for (const p of palavrasNome) {
      if (cargo.includes(p)) score += 2;
    }

    // Pontuação por palavras em comum no órgão
    const palavrasOrgao = orgaoN.split(" ").filter(p => p.length > 3);
    for (const p of palavrasOrgao) {
      if (orgao.includes(p)) score += 1;
    }

    // Bonus por sigla exata
    if (siglaAlt && texto.includes(siglaAlt)) score += 3;

    // Penaliza se nenhuma palavra principal bateu
    if (score === 0) continue;

    if (score > melhorScore) {
      melhorScore = score;
      melhorCargo = c;
    }
  }

  if (!melhorCargo || melhorScore < 2) return null;

  const estado = melhorCargo.hasEstado
    ? extrairEstado(`${cargoTexto} ${orgaoTexto}`)
    : undefined;

  return { cargoId: melhorCargo.id, estado };
}

/** Estados brasileiros para seleção */
export const ESTADOS = [
  { sigla: "AC", nome: "Acre" },
  { sigla: "AL", nome: "Alagoas" },
  { sigla: "AP", nome: "Amapá" },
  { sigla: "AM", nome: "Amazonas" },
  { sigla: "BA", nome: "Bahia" },
  { sigla: "CE", nome: "Ceará" },
  { sigla: "DF", nome: "Distrito Federal" },
  { sigla: "ES", nome: "Espírito Santo" },
  { sigla: "GO", nome: "Goiás" },
  { sigla: "MA", nome: "Maranhão" },
  { sigla: "MT", nome: "Mato Grosso" },
  { sigla: "MS", nome: "Mato Grosso do Sul" },
  { sigla: "MG", nome: "Minas Gerais" },
  { sigla: "PA", nome: "Pará" },
  { sigla: "PB", nome: "Paraíba" },
  { sigla: "PR", nome: "Paraná" },
  { sigla: "PE", nome: "Pernambuco" },
  { sigla: "PI", nome: "Piauí" },
  { sigla: "RJ", nome: "Rio de Janeiro" },
  { sigla: "RN", nome: "Rio Grande do Norte" },
  { sigla: "RS", nome: "Rio Grande do Sul" },
  { sigla: "RO", nome: "Rondônia" },
  { sigla: "RR", nome: "Roraima" },
  { sigla: "SC", nome: "Santa Catarina" },
  { sigla: "SP", nome: "São Paulo" },
  { sigla: "SE", nome: "Sergipe" },
  { sigla: "TO", nome: "Tocantins" },
];
