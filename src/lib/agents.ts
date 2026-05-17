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
];

export const BANCAS = [
  { id: "cespe",   label: "CESPE / CEBRASPE" },
  { id: "fgv",     label: "FGV" },
  { id: "vunesp",  label: "VUNESP" },
  { id: "aocp",    label: "Instituto AOCP" },
  { id: "fcc",     label: "FCC" },
  { id: "ibfc",    label: "IBFC" },
  { id: "idecan",  label: "IDECAN" },
  { id: "iades",   label: "IADES" },
  { id: "esaf",    label: "ESAF" },
  { id: "cesgranrio", label: "CESGRANRIO" },
];

export function buildAgentSystemPrompt(categoriaId?: string | null, banca?: string | null): string {
  const key = categoriaId ?? banca ?? null;
  const persona = getPersona(key);

  const categoria = CATEGORIAS.find(c => c.id === categoriaId);
  const bancaLabel = BANCAS.find(b => b.id === banca)?.label ?? banca;

  // Começa com a identidade da persona
  let prompt = persona.personality;

  prompt += `\n\nVocê é um mentor especialista em concursos públicos`;

  if (categoria) {
    prompt += ` para a área de **${categoria.label}** (${categoria.description}).`;
    prompt += `\n\nOs cargos que você domina incluem: ${categoria.cargos.join(", ")}.`;
    prompt += `\n\nVocê conhece profundamente o conteúdo programático, os editais mais recentes, as disciplinas cobradas e o perfil de cada cargo dessa área.`;
  }

  if (bancaLabel) {
    prompt += `\n\nVocê também é especialista na banca **${bancaLabel}**: conhece o estilo das questões, as pegadinhas mais comuns, os temas favoritos da banca e como ela avalia os candidatos.`;
  }

  prompt += `

Seu papel é:
- Explicar o conteúdo de forma clara e objetiva, com a sua personalidade característica
- Analisar questões e identificar o raciocínio da banca
- Indicar os temas mais cobrados para cada cargo
- Dar dicas de estudo e gestão de tempo
- Orientar sobre editais, requisitos e etapas do concurso
- Criar questões no estilo da banca quando solicitado

Seja direto, prático e foque no que realmente cai em prova. Mantenha sempre sua identidade como ${persona.personaName}. Responda sempre em português brasileiro.`;

  return prompt;
}
