/**
 * Lista curada de cargos populares para concursos públicos brasileiros.
 * Organizada por área para exibição no onboarding wizard.
 */

export interface Cargo {
  id: string;
  nome: string;
  orgao: string;
  area: AreaCargo;
  banca?: string;      // banca mais comum para esse cargo
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
  cor: string; // tailwind bg color
}

export const GRUPOS_AREA: GrupoArea[] = [
  { area: "fiscal",       label: "Fiscal / Tributário",   emoji: "🏛️",  cor: "bg-amber-500/15 border-amber-500/30 text-amber-300" },
  { area: "judiciario",   label: "Judiciário",             emoji: "⚖️",  cor: "bg-blue-500/15 border-blue-500/30 text-blue-300" },
  { area: "juridico",     label: "Jurídico / AGU",         emoji: "📜",  cor: "bg-indigo-500/15 border-indigo-500/30 text-indigo-300" },
  { area: "mp",           label: "Ministério Público",     emoji: "🔍",  cor: "bg-purple-500/15 border-purple-500/30 text-purple-300" },
  { area: "policial",     label: "Policial / Segurança",   emoji: "🚔",  cor: "bg-red-500/15 border-red-500/30 text-red-300" },
  { area: "bancario",     label: "Bancário / Financeiro",  emoji: "🏦",  cor: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300" },
  { area: "controle",     label: "Controle / Auditoria",   emoji: "🔎",  cor: "bg-cyan-500/15 border-cyan-500/30 text-cyan-300" },
  { area: "previdencia",  label: "Previdência Social",     emoji: "🛡️",  cor: "bg-teal-500/15 border-teal-500/30 text-teal-300" },
  { area: "ti",           label: "Tecnologia da Informação",emoji: "💻", cor: "bg-violet-500/15 border-violet-500/30 text-violet-300" },
  { area: "militar",      label: "Militar / Defesa",       emoji: "🎖️",  cor: "bg-slate-500/15 border-slate-500/30 text-slate-300" },
  { area: "diplomatico",  label: "Diplomacia / IRBr",      emoji: "🌍",  cor: "bg-sky-500/15 border-sky-500/30 text-sky-300" },
  { area: "saude",        label: "Saúde / Revalida",       emoji: "⚕️",  cor: "bg-rose-500/15 border-rose-500/30 text-rose-300" },
  { area: "ambiental",    label: "Ambiental / Agrário",    emoji: "🌿",  cor: "bg-green-500/15 border-green-500/30 text-green-300" },
  { area: "administrativo",label: "Administrativo / Geral",emoji: "📋",  cor: "bg-orange-500/15 border-orange-500/30 text-orange-300" },
];

export const CARGOS: Cargo[] = [
  // ── Fiscal / Tributário ──────────────────────────────────────────────────────
  { id: "auditor-rfb",        nome: "Auditor-Fiscal da Receita Federal",       orgao: "RFB / Receita Federal",   area: "fiscal",    banca: "CESPE/CEBRASPE", categoria: "fiscal" },
  { id: "analista-rfb",       nome: "Analista-Tributário da Receita Federal",  orgao: "RFB / Receita Federal",   area: "fiscal",    banca: "CESPE/CEBRASPE", categoria: "fiscal" },
  { id: "auditor-sefaz-ba",   nome: "Auditor Fiscal — SEFAZ-BA",               orgao: "SEFAZ Bahia",             area: "fiscal",    banca: "CESPE/CEBRASPE", categoria: "fiscal" },
  { id: "auditor-sefaz-sp",   nome: "Agente Fiscal de Rendas — SEFAZ-SP",      orgao: "SEFAZ São Paulo",         area: "fiscal",    banca: "FCC",            categoria: "fiscal" },
  { id: "auditor-sefaz-mg",   nome: "Auditor Fiscal — SEFAZ-MG",               orgao: "SEFAZ Minas Gerais",      area: "fiscal",    banca: "FCC",            categoria: "fiscal" },
  { id: "auditor-sefaz-rj",   nome: "Auditor Fiscal — SEFAZ-RJ",               orgao: "SEFAZ Rio de Janeiro",    area: "fiscal",    banca: "FGV",            categoria: "fiscal" },
  { id: "ate-sefaz-rj",       nome: "Assistente Técnico Estadual — SEFAZ-RJ",  orgao: "SEFAZ Rio de Janeiro",    area: "fiscal",    banca: "FGV",            categoria: "fiscal" },
  { id: "fiscal-iss",         nome: "Auditor Fiscal de Tributos Municipais",   orgao: "Prefeituras (ISS/IPTU)",  area: "fiscal",    banca: "VUNESP",         categoria: "fiscal" },
  { id: "analista-receita-mg",nome: "Analista de Tributos Estaduais — MG",     orgao: "SEFAZ Minas Gerais",      area: "fiscal",    banca: "FCC",            categoria: "fiscal" },

  // ── Judiciário ───────────────────────────────────────────────────────────────
  { id: "analista-judiciario-trf",   nome: "Analista Judiciário — TRF",             orgao: "TRF (qualquer região)",  area: "judiciario", banca: "CESPE/CEBRASPE", categoria: "judiciario" },
  { id: "tecnico-judiciario-trf",    nome: "Técnico Judiciário — TRF",              orgao: "TRF (qualquer região)",  area: "judiciario", banca: "CESPE/CEBRASPE", categoria: "judiciario" },
  { id: "analista-trt",              nome: "Analista Judiciário — TRT",             orgao: "TRT (qualquer região)",  area: "judiciario", banca: "FCC",            categoria: "judiciario" },
  { id: "tecnico-trt",               nome: "Técnico Judiciário — TRT",              orgao: "TRT (qualquer região)",  area: "judiciario", banca: "FCC",            categoria: "judiciario" },
  { id: "analista-stj",              nome: "Analista Judiciário — STJ",             orgao: "Superior Tribunal de Justiça", area: "judiciario", banca: "CESPE/CEBRASPE", categoria: "judiciario" },
  { id: "analista-stf",              nome: "Analista Judiciário — STF",             orgao: "Supremo Tribunal Federal",    area: "judiciario", banca: "FGV",            categoria: "judiciario" },
  { id: "analista-tse",              nome: "Analista Judiciário — TSE/TRE",         orgao: "Tribunal Superior Eleitoral", area: "judiciario", banca: "FCC",            categoria: "judiciario" },
  { id: "escrivao-tjsp",             nome: "Escrevente / Oficial de Justiça — TJSP",orgao: "TJ São Paulo",           area: "judiciario", banca: "VUNESP",         categoria: "judiciario" },
  { id: "analista-tjba",             nome: "Analista / Técnico Judiciário — TJBA",  orgao: "TJ Bahia",               area: "judiciario", banca: "CESPE/CEBRASPE", categoria: "judiciario" },

  // ── Jurídico / AGU / PGR ────────────────────────────────────────────────────
  { id: "procurador-federal",  nome: "Procurador Federal — AGU",              orgao: "Advocacia-Geral da União",    area: "juridico",  banca: "CESPE/CEBRASPE", categoria: "direito" },
  { id: "advogado-uniao",      nome: "Advogado da União — AGU",              orgao: "Advocacia-Geral da União",    area: "juridico",  banca: "CESPE/CEBRASPE", categoria: "direito" },
  { id: "defensor-publico",    nome: "Defensor Público Federal / Estadual",  orgao: "DPU / DPE",                   area: "juridico",  banca: "CESPE/CEBRASPE", categoria: "direito" },
  { id: "procurador-estado",   nome: "Procurador do Estado",                 orgao: "PGE (estadual)",              area: "juridico",  banca: "VUNESP",         categoria: "direito" },
  { id: "juiz-federal",        nome: "Juiz Federal",                         orgao: "TRF / CNJ",                   area: "juridico",  banca: "CESPE/CEBRASPE", categoria: "direito" },
  { id: "juiz-estadual",       nome: "Juiz de Direito",                      orgao: "TJ (estadual)",               area: "juridico",  banca: "VUNESP",         categoria: "direito" },
  { id: "oab",                 nome: "Exame de Ordem — OAB",                 orgao: "Conselho Federal da OAB",     area: "juridico",  banca: "FGV",            categoria: "oab" },

  // ── Ministério Público ───────────────────────────────────────────────────────
  { id: "promotor",            nome: "Promotor de Justiça",                  orgao: "MP Estadual",                 area: "mp",        banca: "CESPE/CEBRASPE", categoria: "ministerio-publico" },
  { id: "procurador-mpf",      nome: "Procurador da República — MPF",        orgao: "Ministério Público Federal",  area: "mp",        banca: "CESPE/CEBRASPE", categoria: "ministerio-publico" },
  { id: "analista-mp",         nome: "Analista / Técnico do MP",             orgao: "MP Estadual / MPF",           area: "mp",        banca: "CESPE/CEBRASPE", categoria: "ministerio-publico" },

  // ── Policial / Segurança ─────────────────────────────────────────────────────
  { id: "delegado-pf",         nome: "Delegado de Polícia Federal",           orgao: "Polícia Federal",            area: "policial",  banca: "CESPE/CEBRASPE", categoria: "policial" },
  { id: "agente-pf",           nome: "Agente de Polícia Federal",             orgao: "Polícia Federal",            area: "policial",  banca: "CESPE/CEBRASPE", categoria: "policial" },
  { id: "escrivao-pf",         nome: "Escrivão de Polícia Federal",           orgao: "Polícia Federal",            area: "policial",  banca: "CESPE/CEBRASPE", categoria: "policial" },
  { id: "perito-pf",           nome: "Perito Criminal Federal",               orgao: "Polícia Federal",            area: "policial",  banca: "CESPE/CEBRASPE", categoria: "policial" },
  { id: "delegado-pc",         nome: "Delegado de Polícia Civil",             orgao: "Polícia Civil Estadual",     area: "policial",  banca: "CESPE/CEBRASPE", categoria: "policial" },
  { id: "investigador-pc",     nome: "Investigador / Agente de PC",           orgao: "Polícia Civil Estadual",     area: "policial",  banca: "VUNESP",         categoria: "policial" },
  { id: "pm-oficial",          nome: "Oficial PM",                            orgao: "Polícia Militar Estadual",   area: "policial",  banca: "VUNESP",         categoria: "policial" },
  { id: "pm-soldado",          nome: "Soldado / Cabo PM",                     orgao: "Polícia Militar Estadual",   area: "policial",  banca: "VUNESP",         categoria: "policial" },
  { id: "prf",                 nome: "Policial Rodoviário Federal",           orgao: "PRF",                        area: "policial",  banca: "CESPE/CEBRASPE", categoria: "policial" },
  { id: "pcf-receita",         nome: "Perito Criminal Federal — Receita",     orgao: "RFB",                        area: "policial",  banca: "CESPE/CEBRASPE", categoria: "policial" },

  // ── Bancário / Financeiro ────────────────────────────────────────────────────
  { id: "bb-escriturario",     nome: "Escriturário — Banco do Brasil",        orgao: "Banco do Brasil",            area: "bancario",  banca: "CESGRANRIO",     categoria: "bancario" },
  { id: "bb-analista",         nome: "Analista — Banco do Brasil",            orgao: "Banco do Brasil",            area: "bancario",  banca: "CESGRANRIO",     categoria: "bancario" },
  { id: "cef-tecnico",         nome: "Técnico Bancário — Caixa Econômica",    orgao: "Caixa Econômica Federal",    area: "bancario",  banca: "CESGRANRIO",     categoria: "bancario" },
  { id: "bndes",               nome: "Analista / Técnico — BNDES",            orgao: "BNDES",                      area: "bancario",  banca: "CESGRANRIO",     categoria: "bancario" },
  { id: "bacen-analista",      nome: "Analista do Banco Central",             orgao: "Banco Central do Brasil",    area: "bancario",  banca: "CESPE/CEBRASPE", categoria: "banco-central" },
  { id: "bacen-tecnico",       nome: "Técnico do Banco Central",              orgao: "Banco Central do Brasil",    area: "bancario",  banca: "CESPE/CEBRASPE", categoria: "banco-central" },
  { id: "brd-brb",             nome: "Analista / Técnico — BRB / BRDE",       orgao: "BRB / BRDE",                 area: "bancario",  banca: "IADES",          categoria: "bancario" },

  // ── Controle / Auditoria ─────────────────────────────────────────────────────
  { id: "auditor-tcu",         nome: "Auditor Federal de Controle Externo — TCU", orgao: "Tribunal de Contas da União",  area: "controle", banca: "CESPE/CEBRASPE", categoria: "controle-auditoria" },
  { id: "analista-tcu",        nome: "Analista de Controle Externo — TCU",        orgao: "Tribunal de Contas da União",  area: "controle", banca: "CESPE/CEBRASPE", categoria: "controle-auditoria" },
  { id: "auditor-cgu",         nome: "Auditor Federal — CGU",                     orgao: "CGU",                          area: "controle", banca: "CESPE/CEBRASPE", categoria: "controle-auditoria" },
  { id: "analista-cgu",        nome: "Analista de Finanças e Controle — CGU",     orgao: "CGU",                          area: "controle", banca: "CESPE/CEBRASPE", categoria: "controle-auditoria" },
  { id: "auditor-tce",         nome: "Auditor de Controle Externo — TCE",         orgao: "TCE Estadual",                 area: "controle", banca: "CESPE/CEBRASPE", categoria: "controle-auditoria" },
  { id: "cfc-contador",        nome: "Exame de Suficiência — CFC",                orgao: "Conselho Federal de Contabilidade", area: "controle", banca: "CFC/IBRACON", categoria: "cfc" },

  // ── Previdência Social ───────────────────────────────────────────────────────
  { id: "tecnico-inss",        nome: "Técnico do Seguro Social — INSS",        orgao: "INSS",                      area: "previdencia", banca: "CESPE/CEBRASPE", categoria: "previdencia-social" },
  { id: "analista-inss",       nome: "Analista do Seguro Social — INSS",       orgao: "INSS",                      area: "previdencia", banca: "CESPE/CEBRASPE", categoria: "previdencia-social" },
  { id: "perito-inss",         nome: "Perito Médico Federal — INSS",           orgao: "INSS",                      area: "previdencia", banca: "CESPE/CEBRASPE", categoria: "previdencia-social" },

  // ── Tecnologia da Informação ─────────────────────────────────────────────────
  { id: "analista-serpro",     nome: "Analista de TI — SERPRO",               orgao: "SERPRO",                    area: "ti",        banca: "CESPE/CEBRASPE", categoria: "tecnologia-informacao" },
  { id: "tecnico-serpro",      nome: "Técnico de TI — SERPRO",                orgao: "SERPRO",                    area: "ti",        banca: "CESPE/CEBRASPE", categoria: "tecnologia-informacao" },
  { id: "analista-sti",        nome: "Analista de TI — STI/MPDG",             orgao: "STI / Governo Federal",     area: "ti",        banca: "CESPE/CEBRASPE", categoria: "tecnologia-informacao" },
  { id: "analista-ti-trf",     nome: "Analista Judiciário — Tecnologia / TRF", orgao: "TRF",                      area: "ti",        banca: "CESPE/CEBRASPE", categoria: "tecnologia-informacao" },
  { id: "analista-ti-bb",      nome: "Analista de TI — Banco do Brasil",       orgao: "Banco do Brasil",          area: "ti",        banca: "CESGRANRIO",     categoria: "tecnologia-informacao" },
  { id: "tecnico-ti-cef",      nome: "Analista de TI — Caixa Econômica",       orgao: "Caixa Econômica Federal",  area: "ti",        banca: "CESGRANRIO",     categoria: "tecnologia-informacao" },

  // ── Diplomático ──────────────────────────────────────────────────────────────
  { id: "diplomata",           nome: "Diplomata (CAE) — CACD / MRE",           orgao: "Ministério das Relações Exteriores", area: "diplomatico", banca: "CESPE/CEBRASPE", categoria: "diplomacia" },
  { id: "oficial-chancelaria", nome: "Oficial de Chancelaria — MRE",           orgao: "Ministério das Relações Exteriores", area: "diplomatico", banca: "CESPE/CEBRASPE", categoria: "diplomacia" },
  { id: "aux-chancelaria",     nome: "Assistente de Chancelaria — MRE",        orgao: "Ministério das Relações Exteriores", area: "diplomatico", banca: "CESPE/CEBRASPE", categoria: "diplomacia" },

  // ── Militar / Defesa ─────────────────────────────────────────────────────────
  { id: "efomm",               nome: "Escola de Formação de Oficiais da MM",   orgao: "Marinha do Brasil",         area: "militar",   categoria: "militar" },
  { id: "epcar",               nome: "EPCAR — Escola Preparatória de Cadetes do Ar", orgao: "Aeronáutica",        area: "militar",   categoria: "militar" },
  { id: "espcex",              nome: "EsPCEx — Escola Prep. de Cadetes do Exército", orgao: "Exército Brasileiro", area: "militar",  categoria: "militar" },
  { id: "afa",                 nome: "AFA — Academia da Força Aérea",          orgao: "Aeronáutica",               area: "militar",   categoria: "militar" },
  { id: "aman",                nome: "AMAN — Academia Militar das Agulhas Negras", orgao: "Exército Brasileiro",  area: "militar",   categoria: "militar" },
  { id: "en",                  nome: "EN — Escola Naval",                       orgao: "Marinha do Brasil",        area: "militar",   categoria: "militar" },
  { id: "capf",                nome: "CAPF — Corpo de Bombeiros Federal",      orgao: "Corpo de Bombeiros",        area: "militar",   categoria: "militar" },

  // ── Saúde / Revalida ─────────────────────────────────────────────────────────
  { id: "revalida",            nome: "REVALIDA — Revalidação de Diploma Médico", orgao: "MEC / INEP",             area: "saude",     banca: "FUFMS/INEP",     categoria: "revalida" },
  { id: "medico-concurso",     nome: "Médico em Concurso Público (diversas áreas)", orgao: "SUS / Hospitais / Prefeituras", area: "saude", banca: "CESPE/CEBRASPE", categoria: "revalida" },
  { id: "enfermeiro",          nome: "Enfermeiro em Concurso Público",          orgao: "SUS / Hospitais",          area: "saude",     banca: "CESPE/CEBRASPE", categoria: "revalida" },

  // ── Ambiental / Agrário ──────────────────────────────────────────────────────
  { id: "ibama-analista",      nome: "Analista Ambiental — IBAMA",             orgao: "IBAMA",                    area: "ambiental", banca: "CESPE/CEBRASPE", categoria: "ambiental-agro" },
  { id: "inca-agronomia",      nome: "Analista Agropecuário — MAPA",           orgao: "Ministério da Agricultura", area: "ambiental", banca: "CESPE/CEBRASPE", categoria: "ambiental-agro" },
  { id: "embrapa",             nome: "Pesquisador / Analista — EMBRAPA",       orgao: "EMBRAPA",                  area: "ambiental", banca: "CESPE/CEBRASPE", categoria: "ambiental-agro" },
  { id: "icmbio",              nome: "Analista Ambiental — ICMBio",            orgao: "ICMBio",                   area: "ambiental", banca: "CESPE/CEBRASPE", categoria: "ambiental-agro" },

  // ── Administrativo / Geral ───────────────────────────────────────────────────
  { id: "eppgg",               nome: "Especialista em Políticas Públicas — EPPGG", orgao: "MPDG / Governo Federal", area: "administrativo", banca: "CESPE/CEBRASPE", categoria: "gestao-publica" },
  { id: "analista-mpu",        nome: "Analista / Técnico — MPU",               orgao: "Ministério Público da União", area: "administrativo", banca: "CESPE/CEBRASPE", categoria: "gestao-publica" },
  { id: "anac",                nome: "Técnico / Analista — ANAC",              orgao: "Agência Nacional de Aviação Civil", area: "administrativo", banca: "FCC",       categoria: "gestao-publica" },
  { id: "anatel",              nome: "Técnico / Analista — ANATEL",            orgao: "ANATEL",                   area: "administrativo", banca: "CESPE/CEBRASPE", categoria: "gestao-publica" },
  { id: "ana",                 nome: "Técnico / Analista — ANA",               orgao: "Agência Nacional de Águas",area: "administrativo", banca: "CESPE/CEBRASPE", categoria: "gestao-publica" },
  { id: "petrobras-tecnico",   nome: "Técnico de Administração — Petrobras",   orgao: "Petrobras",                area: "administrativo", banca: "CESGRANRIO",     categoria: "petrobras-estatais" },
  { id: "petrobras-eng",       nome: "Engenheiro / Profissional Jr — Petrobras", orgao: "Petrobras",              area: "administrativo", banca: "CESGRANRIO",     categoria: "petrobras-estatais" },
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

/** Busca cargos por texto (nome ou órgão) */
export function buscarCargos(query: string): Cargo[] {
  const q = query.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  return CARGOS.filter(c => {
    const nome = c.nome.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    const orgao = c.orgao.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    return nome.includes(q) || orgao.includes(q);
  });
}
