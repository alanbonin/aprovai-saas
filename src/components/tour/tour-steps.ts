import type { DriveStep } from "driver.js";

/* ── Hoje (Dashboard) ───────────────────────────────────────────────── */
export const HOJE_STEPS: DriveStep[] = [
  {
    element: "#tour-hoje-boas-vindas",
    popover: { title: "☀️ Briefing do Dia", description: "Aqui começa seu dia de estudos! Veja seu progresso diário, sequência de dias (streak) e o que precisa fazer hoje para se manter no rumo da aprovação.", side: "bottom" },
  },
  {
    element: "#tour-hoje-streak",
    popover: { title: "🔥 Sequência de Dias", description: "Seu streak mostra quantos dias seguidos você está estudando. Mantenha a sequência — consistência é o maior diferencial entre aprovados e reprovados!", side: "bottom" },
  },
  {
    element: "#tour-hoje-acoes",
    popover: { title: "⚡ Ações do Dia", description: "A IA montou um plano personalizado para hoje com base no seu concurso. Cada item é uma tarefa — conclua tudo para manter o streak e ganhar XP.", side: "top" },
  },
  {
    element: "#tour-hoje-prioridade",
    popover: { title: "🎯 Matéria Prioritária", description: "A IA analisou seu desempenho e identificou a matéria que mais precisa de atenção hoje. Foque aqui para recuperar pontos importantes!", side: "top" },
  },
  {
    element: "#tour-theme-toggle",
    popover: { title: "🌙☀️ Modo Escuro / Claro", description: "Alterne entre o tema escuro e claro a qualquer momento! Basta clicar no interruptor no menu lateral. Escuro cansa menos os olhos à noite — claro é ideal para ambientes iluminados.", side: "right" },
  },
];

/* ── Workspace (Questões) ───────────────────────────────────────────── */
export const WORKSPACE_STEPS: DriveStep[] = [
  {
    element: "#tour-workspace-filtros",
    popover: { title: "🔍 Filtros de Estudo", description: "Escolha por qual concurso, matéria ou banca quer estudar. Quanto mais específico, mais direcionado fica seu treino. Você pode misturar ou focar em uma matéria só.", side: "right" },
  },
  {
    element: "#tour-workspace-questao",
    popover: { title: "📝 Questão", description: "Aqui aparece a questão selecionada pela IA. Leia com atenção antes de responder — o sistema analisa seu padrão de erros para personalizar os próximos exercícios.", side: "top" },
  },
  {
    element: "#tour-workspace-alternativas",
    popover: { title: "✅ Alternativas", description: "Clique na alternativa que você considera correta. Após responder, o sistema mostra o gabarito com explicação detalhada — mesmo que acerte, leia a justificativa!", side: "top" },
  },
  {
    element: "#tour-workspace-progresso",
    popover: { title: "📊 Progresso da Semana", description: "Acompanhe quantas questões você já respondeu esta semana. A barra vai enchendo conforme você estuda — o objetivo é manter consistência todos os dias.", side: "left" },
  },
];

/* ── Flashcards ─────────────────────────────────────────────────────── */
export const FLASHCARDS_STEPS: DriveStep[] = [
  {
    element: "#tour-flashcards-deck",
    popover: { title: "🗂️ Seus Flashcards", description: "Flashcards são cartões de revisão rápida. A IA cria automaticamente com base nas matérias que você estuda — você também pode criar os seus próprios.", side: "bottom" },
  },
  {
    element: "#tour-flashcards-card",
    popover: { title: "👆 Como Usar", description: "Veja a pergunta na frente do cartão, pense na resposta e clique para virar. Depois avalie se acertou ou errou — isso ensina o sistema a priorizar o que você ainda não domina.", side: "top" },
  },
  {
    element: "#tour-flashcards-botoes",
    popover: { title: "🟢 Fácil / 🔴 Difícil", description: "Seja honesto na avaliação! O algoritmo SM-2 agenda automaticamente quando você deve rever cada cartão para fixar na memória de longo prazo.", side: "top" },
  },
  {
    element: "#tour-flashcards-criar",
    popover: { title: "✏️ Criar Flashcard", description: "Crie seus próprios cartões com termos, fórmulas ou conceitos que quer memorizar. Quanto mais personalizado, mais eficiente é a revisão.", side: "left" },
  },
];

/* ── Simulado ───────────────────────────────────────────────────────── */
export const SIMULADO_STEPS: DriveStep[] = [
  {
    element: "#tour-simulado-tipos",
    popover: { title: "🎯 Tipos de Simulado", description: "Escolha entre os modos disponíveis: acesso rápido por estilo de prova ou personalizado com seus próprios filtros. Cada modo tem um objetivo diferente.", side: "bottom" },
  },
  {
    element: "#tour-simulado-historico",
    popover: { title: "📈 Histórico de Resultados", description: "Veja sua evolução ao longo do tempo — média de acertos, tempo por simulado e tendência de melhora. Identifique padrões e ajuste seu plano de estudos.", side: "top" },
  },
];

/* ── Cronograma ─────────────────────────────────────────────────────── */
export const CRONOGRAMA_STEPS: DriveStep[] = [
  {
    element: "#tour-cronograma-plano",
    popover: { title: "📅 Seu Plano de Estudos", description: "A IA criou um cronograma personalizado baseado no seu concurso-alvo, data da prova e horas disponíveis por dia. Cada matéria tem peso proporcional ao edital.", side: "bottom" },
  },
  {
    element: "#tour-cronograma-semana",
    popover: { title: "📆 Semana Atual", description: "Veja o que está programado para cada dia desta semana. As matérias são distribuídas de forma inteligente — priorizando os temas com mais peso na prova.", side: "bottom" },
  },
  {
    element: "#tour-cronograma-ajuste",
    popover: { title: "🔄 Gerar / Ajustar", description: "Pulou um dia? Clique aqui para regerar o cronograma. A IA redistribui automaticamente o conteúdo para compensar o tempo perdido.", side: "top" },
  },
];

/* ── Mentor IA ──────────────────────────────────────────────────────── */
export const MENTOR_STEPS: DriveStep[] = [
  {
    element: "#tour-mentor-contexto",
    popover: { title: "🎓 Seus Mentores de IA", description: "Cada mentor é especializado no cargo que você está estudando — Analista, Técnico, Auditor e outros. Ative o mentor do seu cargo-alvo para receber orientações alinhadas ao perfil e às exigências da vaga.", side: "right" },
  },
  {
    element: "#tour-mentor-chat",
    popover: { title: "💬 Chat com o Mentor", description: "O Mentor conhece seu histórico de estudos e seu concurso-alvo. Pergunte qualquer coisa — dúvidas de conteúdo, estratégias de prova, dicas de estudo.", side: "left" },
  },
  {
    element: "#tour-mentor-input",
    popover: { title: "✍️ Como Perguntar", description: "Escreva em linguagem natural. Exemplos: 'Explica direito constitucional', 'Qual a diferença entre ato administrativo e ato de governo?', 'Dicas para prova CESPE'.", side: "top" },
  },
];

/* ── Redação ────────────────────────────────────────────────────────── */
export const REDACAO_STEPS: DriveStep[] = [
  {
    element: "#tour-redacao-header",
    popover: { title: "✍️ Redação Oficial", description: "Pratique redação no estilo das principais bancas: CESPE, FGV, FCC e ENEM. Cada tema é selecionado com base no seu concurso-alvo.", side: "bottom" },
  },
  {
    element: "#tour-redacao-tema",
    popover: { title: "📌 Tema e Coletânea", description: "Leia a proposta com atenção antes de escrever. Bancas como CESPE e FGV cobram uso dos textos motivadores — cite-os na sua redação para ganhar pontos.", side: "bottom" },
  },
  {
    element: "#tour-redacao-editor",
    popover: { title: "📝 Editor de Texto", description: "Escreva sua redação aqui. O contador de palavras ajuda a manter o tamanho ideal (geralmente 25–35 linhas para concursos). Capriche na introdução e conclusão.", side: "top" },
  },
  {
    element: "#tour-redacao-enviar",
    popover: { title: "🤖 Correção por IA", description: "Clique em Enviar para a IA corrigir sua redação em segundos. Você receberá notas por critério (coesão, argumentação, adequação à proposta) e sugestões de melhoria.", side: "top" },
  },
];

/* ── Revisão SM-2 ───────────────────────────────────────────────────── */
export const REVISAO_STEPS: DriveStep[] = [
  {
    element: "#tour-revisao-header",
    popover: { title: "🔄 Revisão Inteligente", description: "O sistema SM-2 agenda automaticamente as questões que você errou para revisão no momento certo — quando está prestes a esquecer. Isso fixa o conteúdo na memória de longo prazo.", side: "bottom" },
  },
  {
    element: "#tour-revisao-questao",
    popover: { title: "📋 Questão para Revisar", description: "Estas são questões que você errou anteriormente. Tente responder novamente — se acertar, o sistema espera mais tempo para trazer de volta. Se errar, volta logo.", side: "top" },
  },
  {
    element: "#tour-revisao-progresso",
    popover: { title: "✅ Progresso de Revisão", description: "Veja quantas questões ainda precisam ser revisadas hoje. Zere essa fila diariamente para garantir que o conteúdo está fixando de verdade.", side: "top" },
  },
];

/* ── Desafio Diário ─────────────────────────────────────────────────── */
export const DESAFIO_STEPS: DriveStep[] = [
  {
    element: "#tour-desafio-header",
    popover: { title: "⚡ Desafio Diário", description: "10 questões cronometradas por dia — o melhor aquecimento para sua rotina de estudos. Complete todos os dias para manter o streak e ganhar XP extra.", side: "bottom" },
  },
  {
    element: "#tour-desafio-timer",
    popover: { title: "⏱️ Cronômetro", description: "O tempo é limitado — assim como na prova real. Isso treina sua velocidade de raciocínio e decisão sob pressão. A média de concurseiros aprovados é de 2-3 min por questão.", side: "bottom" },
  },
  {
    element: "#tour-desafio-questao",
    popover: { title: "🎯 Questão do Desafio", description: "As questões são selecionadas com base no seu concurso-alvo e nas matérias que você mais precisa treinar. Qualidade > quantidade — foco total em cada uma.", side: "top" },
  },
];

/* ── Casos Práticos ─────────────────────────────────────────────────── */
export const CASO_STEPS: DriveStep[] = [
  {
    element: "#tour-caso-header",
    popover: { title: "🔍 Casos Práticos", description: "Exercícios de aplicação do conteúdo em situações reais — como as questões discursivas e testes de perfil das bancas mais exigentes (CESPE, FGV, TRT).", side: "bottom" },
  },
  {
    element: "#tour-caso-tema",
    popover: { title: "📋 Descrição do Caso", description: "Leia o cenário com atenção antes de responder. Casos práticos avaliam raciocínio jurídico, análise crítica ou aplicação de normas — não apenas memorização.", side: "bottom" },
  },
  {
    element: "#tour-caso-resposta",
    popover: { title: "✍️ Sua Resposta", description: "Escreva sua análise de forma estruturada: identifique o problema, cite a norma aplicável e justifique sua conclusão. A IA avalia fundamentação, clareza e correção.", side: "top" },
  },
];

/* ── Plano Semanal ──────────────────────────────────────────────────── */
export const PLANO_SEMANAL_STEPS: DriveStep[] = [
  {
    element: "#tour-plano-header",
    popover: { title: "🤖 Plano IA da Semana", description: "A IA gerou um plano de estudos personalizado para esta semana com base no seu concurso, edital e desempenho atual. É uma visão detalhada do que estudar em cada dia.", side: "bottom" },
  },
  {
    element: "#tour-plano-dias",
    popover: { title: "📅 Dias da Semana", description: "Cada card representa um dia com as matérias e o tempo sugerido. Clique em um dia para ver os tópicos detalhados e links diretos para o conteúdo.", side: "bottom" },
  },
  {
    element: "#tour-plano-ajuste",
    popover: { title: "🔄 Regerar Plano", description: "Mudou sua disponibilidade de horários? Clique aqui para a IA gerar um novo plano adaptado. O histórico anterior é preservado para comparação.", side: "top" },
  },
];

/* ── Metas ──────────────────────────────────────────────────────────── */
export const METAS_STEPS: DriveStep[] = [
  {
    element: "#tour-metas-header",
    popover: { title: "🎯 Suas Metas", description: "Defina objetivos semanais ou mensais — questões respondidas, horas de estudo, simulados feitos. Metas claras aumentam em 3x a chance de aprovação.", side: "bottom" },
  },
  {
    element: "#tour-metas-progresso",
    popover: { title: "📊 Progresso das Metas", description: "Acompanhe em tempo real o quanto você avançou em cada meta. O sistema atualiza automaticamente conforme você estuda.", side: "bottom" },
  },
];

/* ── Histórico de Simulados ─────────────────────────────────────────── */
export const HISTORICO_STEPS: DriveStep[] = [
  {
    element: "#tour-historico-header",
    popover: { title: "📈 Histórico de Simulados", description: "Veja sua evolução ao longo do tempo. Gráficos de desempenho por matéria, tendência de acertos e comparação entre provas — essencial para identificar pontos fracos.", side: "bottom" },
  },
  {
    element: "#tour-historico-tabela",
    popover: { title: "📋 Seus Simulados", description: "Lista completa de todos os simulados feitos. Clique em qualquer um para rever o gabarito comentado — entender os erros é mais importante que a nota.", side: "top" },
  },
];

/* ── Caderno de Erros ───────────────────────────────────────────────── */
export const CADERNO_ERROS_STEPS: DriveStep[] = [
  {
    element: "#tour-caderno-header",
    popover: { title: "📒 Caderno de Erros", description: "Todas as questões que você errou ficam salvas aqui automaticamente. Revisitar os erros é uma das técnicas mais eficientes para fixar conteúdo.", side: "bottom" },
  },
  {
    element: "#tour-caderno-filtros",
    popover: { title: "🔍 Filtrar por Matéria", description: "Filtre os erros por matéria ou banca para fazer revisões focadas. Identifique em qual área você erra mais e concentre seus esforços ali.", side: "bottom" },
  },
  {
    element: "#tour-caderno-questao",
    popover: { title: "📝 Questão e Explicação", description: "Veja o enunciado, sua resposta errada e a resposta correta com explicação. Releia até entender o porquê do erro — não apenas decorar a resposta certa.", side: "top" },
  },
];

/* ── Quiz Rápido ────────────────────────────────────────────────────── */
export const QUIZ_STEPS: DriveStep[] = [
  {
    element: "#tour-quiz-header",
    popover: { title: "🏃 Quiz Rápido", description: "Sessão rápida de 5-10 questões sem cronômetro — ideal para estudar em qualquer momento livre. Ônibus, fila, pausa do trabalho: 5 minutos já fazem diferença.", side: "bottom" },
  },
  {
    element: "#tour-quiz-questao",
    popover: { title: "❓ Questão", description: "Responda no seu ritmo. O Quiz Rápido usa as mesmas questões do banco da plataforma — cada acerto e erro é registrado para melhorar seu perfil de aprendizado.", side: "top" },
  },
];
