import { test, expect } from "./fixtures/authenticated";

test.describe("Perfil e configurações", () => {
  test("página /perfil carrega sem erros", async ({ authedPage: page }) => {
    await page.goto("/perfil");
    await expect(page).toHaveURL(/\/perfil/);
    await expect(page.locator("body")).not.toContainText(/500|erro interno/i);
  });

  test("perfil exibe e-mail ou nome do usuário", async ({ authedPage: page }) => {
    await page.goto("/perfil");
    // Aguarda carregamento do perfil (dados vêm de API)
    await page.waitForLoadState("networkidle");
    // Página exibe "qa" (nome) e "qa+teste@aprovai360.com.br" (email)
    await expect(
      page.getByText(/qa\+teste|@aprovai360|qa/i).first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test("página /configuracoes carrega", async ({ authedPage: page }) => {
    await page.goto("/configuracoes");
    await expect(page).toHaveURL(/\/configuracoes/);
    await expect(page.locator("body")).not.toContainText(/500|erro interno/i);
  });

  test("página de conquistas /conquistas carrega", async ({ authedPage: page }) => {
    await page.goto("/conquistas");
    await expect(page).toHaveURL(/\/conquistas/);
    await expect(page.locator("body")).not.toContainText(/404|500|not found/i);
  });

  test("página /metas carrega", async ({ authedPage: page }) => {
    await page.goto("/metas");
    await expect(page.locator("body")).not.toContainText(/500|erro interno/i);
  });

  test("página /cronograma carrega", async ({ authedPage: page }) => {
    await page.goto("/cronograma");
    await expect(page.locator("body")).not.toContainText(/500|erro interno/i);
  });
});
