import { test, expect } from "./fixtures/authenticated";

test.describe("Dashboard — Hoje (/hoje)", () => {
  test("página /hoje carrega após login", async ({ authedPage: page }) => {
    await page.goto("/hoje");
    await expect(page).toHaveURL(/\/hoje/);
    await expect(page.locator("body")).not.toContainText(/erro|error|500/i);
  });

  test("sidebar de navegação está visível", async ({ authedPage: page }) => {
    await page.goto("/hoje");
    // Nav principal deve ter links para seções principais
    const nav = page.locator("nav, aside").first();
    await expect(nav).toBeVisible();
  });

  test("briefing do dia contém ao menos uma seção de conteúdo", async ({ authedPage: page }) => {
    await page.goto("/hoje");
    await expect(
      page.getByText(/hoje|briefing|agenda|questões do dia|simulado/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("navegação para /questoes funciona", async ({ authedPage: page }) => {
    await page.goto("/hoje");
    await page.getByRole("link", { name: /questões|questoes/i }).first().click();
    await expect(page).toHaveURL(/\/questoes/);
  });

  test("navegação para /simulado funciona", async ({ authedPage: page }) => {
    // /simulado não tem link direto na sidebar — navega direto
    await page.goto("/simulado");
    await expect(page).toHaveURL(/\/simulado/);
    await expect(page.locator("body")).not.toContainText(/500|erro interno/i);
  });

  test("navegação para /flashcards funciona", async ({ authedPage: page }) => {
    await page.goto("/flashcards");
    await expect(page).toHaveURL(/\/flashcards/);
    await expect(page.locator("body")).not.toContainText(/404|not found/i);
  });

  test("navegação para /arena funciona", async ({ authedPage: page }) => {
    await page.goto("/arena");
    await expect(page).toHaveURL(/\/arena/);
    await expect(page.locator("body")).not.toContainText(/404|not found/i);
  });

  test("navegação para /ranking funciona", async ({ authedPage: page }) => {
    await page.goto("/ranking");
    await expect(page).toHaveURL(/\/ranking/);
    await expect(page.locator("body")).not.toContainText(/404|not found/i);
  });
});
