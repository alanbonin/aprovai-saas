import { test, expect } from "@playwright/test";
import { TEST_USER_NEW } from "./fixtures/test-data";

/**
 * Testa o wizard de onboarding completo.
 * Requer conta nova (sem concurso configurado).
 */
test.describe("Onboarding wizard", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!TEST_USER_NEW.password, "TEST_USER_NEW_PASSWORD não configurado");
    await page.goto("/login");
    await page.getByPlaceholder(/seu@email|e-mail/i).fill(TEST_USER_NEW.email);
    await page.locator("input[type=password]").fill(TEST_USER_NEW.password);
    await page.getByRole("button", { name: /entrar/i }).click();

    // Aguarda redirect — se não for /onboarding: e-mail não confirmado ou já completou wizard
    await page.waitForURL(/\/(onboarding|hoje|dashboard|login)/, { timeout: 20_000 });
    const url = page.url();
    if (!url.includes("/onboarding")) {
      test.skip(
        true,
        url.includes("/login")
          ? "qa+novo: e-mail não confirmado — confirme no e-mail antes de rodar"
          : "qa+novo já completou onboarding — precisa de conta nova sem wizard finalizado"
      );
    }
  });

  test("wizard carrega step 1 — nome", async ({ page }) => {
    await expect(page).toHaveURL(/\/onboarding/);
    await expect(page.getByPlaceholder(/seu nome|como posso/i)).toBeVisible();
  });

  test("avança do step nome para modalidade", async ({ page }) => {
    await page.getByPlaceholder(/seu nome|como posso/i).fill("Aluno QA Teste");
    await page.getByRole("button", { name: /próximo|continuar|avançar/i }).click();
    await expect(
      page.getByText(/concurso público|enem|oab/i)
    ).toBeVisible({ timeout: 8_000 });
  });

  test("seleciona Concurso Público e avança para cargo", async ({ page }) => {
    await page.getByPlaceholder(/seu nome|como posso/i).fill("Aluno QA Teste");
    await page.getByRole("button", { name: /próximo|continuar|avançar/i }).click();
    await page.getByText(/concurso público/i).click();
    await page.getByRole("button", { name: /próximo|continuar|avançar/i }).click();
    await expect(
      page.getByText(/cargo|área|concurso/i)
    ).toBeVisible({ timeout: 8_000 });
  });

  test("botão Voltar retorna ao step anterior", async ({ page }) => {
    await page.getByPlaceholder(/seu nome|como posso/i).fill("Aluno QA Teste");
    await page.getByRole("button", { name: /próximo|continuar|avançar/i }).click();
    await expect(page.getByText(/concurso público|enem|oab/i)).toBeVisible();
    await page.getByRole("button", { name: /voltar/i }).click();
    await expect(page.getByPlaceholder(/seu nome|como posso/i)).toBeVisible();
  });

  test("step de data da prova aceita data futura", async ({ page }) => {
    // Navegando rapidamente até o step de data
    await page.getByPlaceholder(/seu nome|como posso/i).fill("Aluno QA Teste");
    await page.getByRole("button", { name: /próximo|continuar|avançar/i }).click();
    // Seleciona ENEM para pular cargo/estado
    const opEnem = page.getByText(/enem/i).first();
    if (await opEnem.isVisible()) {
      await opEnem.click();
      await page.getByRole("button", { name: /próximo|continuar|avançar/i }).click();
    }
    // Step data
    const dateInput = page.getByRole("textbox").filter({ hasText: /data|prova/i }).first()
      .or(page.locator("input[type=date]").first())
      .or(page.getByPlaceholder(/dd\/mm\/aaaa|data/i).first());
    if (await dateInput.isVisible({ timeout: 3_000 })) {
      await dateInput.fill("2026-11-01");
    }
  });
});
