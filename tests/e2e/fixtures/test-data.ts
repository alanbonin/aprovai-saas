// Credenciais de teste — usar conta dedicada, nunca conta real de produção
export const TEST_USER = {
  email: process.env.TEST_USER_EMAIL ?? "qa+teste@aprovai360.com.br",
  password: process.env.TEST_USER_PASSWORD ?? "",
};

// Conta ainda sem onboarding concluído (para testar o wizard)
export const TEST_USER_NEW = {
  email: process.env.TEST_USER_NEW_EMAIL ?? "qa+novo@aprovai360.com.br",
  password: process.env.TEST_USER_NEW_PASSWORD ?? "",
};

export const BASE_URL = "https://www.aprovai360.com.br";

export const ROUTES = {
  home: "/",
  login: "/login",
  cadastro: "/cadastro",
  onboarding: "/onboarding",
  hoje: "/hoje",
  dashboard: "/dashboard",
  questoes: "/questoes",
  simulado: "/simulado",
  planos: "/planos",
  perfil: "/perfil",
  configuracoes: "/configuracoes",
  flashcards: "/flashcards",
  arena: "/arena",
  ranking: "/ranking",
};
