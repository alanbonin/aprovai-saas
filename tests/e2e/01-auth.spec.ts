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
    // Clica em Sair (sidebar desktop ou header mobile)
    const sairBtn = page.locator('button:has-text("Sair")').first();
    await sairBtn.click();
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
    // Tenta acessar rota protegida — deve redirecionar
    await page.goto("/hoje");
    await expect(page).toHaveURL(/\/login/);
  });

});
