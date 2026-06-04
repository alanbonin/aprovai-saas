import { test, expect } from "@playwright/test";

// Garante que rotas protegidas redirecionam usuário não autenticado
const PROTECTED_ROUTES = [
  "/hoje",
  "/dashboard",
  "/questoes",
  "/simulado",
  "/flashcards",
  "/arena",
  "/ranking",
  "/perfil",
  "/configuracoes",
  "/metas",
  "/cronograma",
  "/conquistas",
  "/notas",
  "/mentor",
];

for (const route of PROTECTED_ROUTES) {
  test(`${route} redireciona para /login sem autenticação`, async ({ page }) => {
    await page.goto(route);
    await page.waitForURL(/\/(login|cadastro)/, { timeout: 15_000 });
    expect(page.url()).toMatch(/\/(login|cadastro)/);
  });
}

test("rota /admin bloqueia usuário sem role ADMIN", async ({ page }) => {
  await page.goto("/admin");
  // Deve redirecionar para login ou exibir 403/não autorizado
  const url = page.url();
  const isBlocked = /login|403|não autorizado|unauthorized/i.test(url) ||
    await page.getByText(/não autorizado|acesso negado|403/i).isVisible({ timeout: 5_000 }).catch(() => false);
  expect(isBlocked).toBeTruthy();
});
