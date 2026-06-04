import { test, expect } from "@playwright/test";

test.describe("Páginas públicas", () => {
  test("home exibe landing page pública", async ({ page }) => {
    await page.goto("/");
    // Pode ser landing page pública ou redirect para /login
    const url = page.url();
    const isLanding = /aprovai360\.com\.br\/?$/.test(url);
    const isLogin = url.includes("/login");
    expect(isLanding || isLogin).toBeTruthy();
    // Se for landing, deve ter conteúdo principal
    if (isLanding) {
      await expect(page.locator("body")).not.toContainText(/500|erro interno/i);
    }
  });

  test("página de login carrega corretamente", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveURL(/\/login/);
    // Inputs identificados por placeholder
    await expect(page.getByPlaceholder(/seu@email|e-mail/i)).toBeVisible();
    await expect(page.locator("input[type=password]")).toBeVisible();
    await expect(page.getByRole("button", { name: /entrar/i })).toBeVisible();
  });

  test("link 'criar conta' leva para /cadastro", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("link", { name: /criar conta|cadastr/i }).click();
    await expect(page).toHaveURL(/\/cadastro/);
  });

  test("link 'esqueci minha senha' exibe campo de recuperação", async ({ page }) => {
    await page.goto("/login");
    // "Esqueci minha senha" é um link/botão
    await page.getByText(/esqueci minha senha/i).click();
    await expect(page.getByRole("button", { name: /enviar|recuperar|redefinir/i })).toBeVisible({ timeout: 5_000 });
  });

  test("página de cadastro carrega corretamente", async ({ page }) => {
    await page.goto("/cadastro");
    await expect(page).toHaveURL(/\/cadastro/);
    await expect(page.getByPlaceholder(/seu nome/i)).toBeVisible();
    await expect(page.getByPlaceholder(/seu@email/i)).toBeVisible();
    await expect(page.locator("input[type=password]")).toBeVisible();
    await expect(page.getByRole("button", { name: /criar conta/i })).toBeVisible();
  });

  test("página /planos é acessível sem autenticação", async ({ page }) => {
    await page.goto("/planos");
    // Pode redirecionar para login ou exibir planos públicos
    const isLogin = page.url().includes("/login");
    const isPlanos = page.url().includes("/planos");
    expect(isLogin || isPlanos).toBeTruthy();
  });

  test("/termos carrega sem erros", async ({ page }) => {
    await page.goto("/termos");
    await expect(page).not.toHaveURL(/404|error/);
    await expect(page.locator("body")).toContainText(/termos/i);
  });

  test("/privacidade carrega sem erros", async ({ page }) => {
    await page.goto("/privacidade");
    await expect(page).not.toHaveURL(/404|error/);
    await expect(page.locator("body")).toContainText(/privacidade/i);
  });
});
