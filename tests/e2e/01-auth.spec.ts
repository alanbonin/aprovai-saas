/**
 * Testes de autenticação — login, logout, proteção de rotas
 */
import { test, expect } from "@playwright/test";
import { loginAdmin, ADMIN } from "./helpers";

test.describe("Auth", () => {

  test("login admin com credenciais válidas redireciona para painel", async ({ page }) => {
    await loginAdmin(page);
    await expect(page).toHaveURL(/\/(admin|hoje)/);
  });

  test("login com senha errada mostra erro", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[type="email"]', ADMIN.email);
    await page.fill('input[type="password"]', "senhaerrada123");
    await page.click('button[type="submit"]');
    // Não deve redirecionar — deve mostrar mensagem de erro
    await expect(page).toHaveURL(/\/login/);
    const err = page.locator("text=/inválid|incorret|erro|wrong/i").first();
    await expect(err).toBeVisible({ timeout: 8_000 });
  });

  test("rota protegida /admin redireciona para login se não autenticado", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login/, { timeout: 8_000 });
  });

  test("rota protegida /hoje redireciona para login se não autenticado", async ({ page }) => {
    await page.goto("/hoje");
    await expect(page).toHaveURL(/\/login/, { timeout: 8_000 });
  });

  test("logout funciona na primeira tentativa", async ({ page }) => {
    await loginAdmin(page);
    await page.waitForLoadState("networkidle");

    // Clica no botão Sair via Playwright locator (force=true ignora visibilidade/viewport).
    // O React 18 propaga o evento corretamente via delegação no root container.
    // Há dois botões "Sair" no DOM (mobile e desktop); pega o visível no viewport atual
    const sairBtn = page.locator('button[title="Sair"]:visible').first();
    await sairBtn.click();

    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
    await page.goto("/hoje");
    await expect(page).toHaveURL(/\/login/);
  });

});
