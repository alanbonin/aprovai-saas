export const AREAS = [
  { id: "penal",          label: "Direito Penal" },
  { id: "processual",     label: "Direito Processual Penal" },
  { id: "administrativo", label: "Direito Administrativo" },
  { id: "constitucional", label: "Direito Constitucional" },
  { id: "civil",          label: "Direito Civil" },
  { id: "tributario",     label: "Direito Tributário" },
  { id: "fiscal",         label: "Legislação Fiscal" },
  { id: "criminologia",   label: "Criminologia" },
  { id: "criminalistica", label: "Criminalística" },
  { id: "portugues",      label: "Língua Portuguesa" },
  { id: "raciocinio",     label: "Raciocínio Lógico" },
  { id: "informatica",    label: "Informática" },
  { id: "atualidades",    label: "Atualidades" },
  { id: "ddhh",           label: "Direitos Humanos" },
  { id: "eca",            label: "ECA" },
  { id: "medicina",       label: "Medicina Legal" },
  { id: "investigacao",   label: "Técnicas de Investigação" },
  { id: "transito",       label: "Legislação de Trânsito" },
  { id: "legislacao",     label: "Legislação Institucional" },
  { id: "pcba",           label: "Legislação PCBA" },
  { id: "racismo",        label: "Legislação Antirracismo" },
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
];

export function buildAgentSystemPrompt(area?: string, banca?: string): string {
  const areaLabel = AREAS.find(a => a.id === area)?.label ?? area ?? "concursos públicos";
  const bancaLabel = BANCAS.find(b => b.id === banca)?.label ?? banca;

  let prompt = `Você é um mentor especialista em ${areaLabel} para concursos públicos brasileiros.`;

  if (bancaLabel) {
    prompt += ` Você conhece profundamente o estilo de questões da banca ${bancaLabel}: o nível de dificuldade, as pegadinhas mais comuns, os temas mais cobrados e a forma de redigir os enunciados.`;
  }

  prompt += `

Seu papel é:
- Explicar conceitos de forma clara e didática
- Resolver dúvidas sobre questões de prova
- Indicar os pontos mais importantes para estudar
- Dar dicas práticas para a prova
- Analisar questões e identificar o raciocínio da banca

Seja objetivo, use exemplos práticos e sempre foque no que cai em prova.
Responda sempre em português brasileiro.`;

  return prompt;
}
