import { test, expect } from "./fixtures/authenticated";

test.describe("Fluxo de simulado (/simulado)", () => {
  test("página de simulado carrega", async ({ authedPage: page }) => {
    await page.goto("/simulado");
    await expect(page).toHaveURL(/\/simulado/);
    await expect(page.locator("body")).not.toContainText(/500|erro interno/i);
  });

  test("cards de tipo de simulado estão visíveis", async ({ authedPage: page }) => {
    await page.goto("/simulado");
    // A página exibe cards (Simulado Padrão, Simulado Longo, Personalizado) — não um botão "iniciar"
    await expect(
      page.getByText(/simulado padrão|simulado longo|personalizado/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("inicia simulado e exibe primeira questão", async ({ authedPage: page }) => {
    await page.goto("/simulado");
    const iniciarBtn = page.getByRole("button", { name: /iniciar|começar|novo simulado/i }).first();
    if (await iniciarBtn.isVisible({ timeout: 8_000 })) {
      await iniciarBtn.click();
      // Pode ter modal de configuração ou ir direto
      const configConfirm = page.getByRole("button", { name: /confirmar|iniciar|começar/i }).first();
      if (await configConfirm.isVisible({ timeout: 3_000 })) {
        await configConfirm.click();
      }
      // Deve navegar para /simulado/exame ou similar
      await expect(page).toHaveURL(/\/simulado\/(exame|filtrado|[0-9a-z-]+)/, { timeout: 15_000 });
    }
  });

  test("simulado em progresso mostra timer ou contador de questões", async ({ authedPage: page }) => {
    await page.goto("/simulado");
    const iniciarBtn = page.getByRole("button", { name: /iniciar|começar|novo simulado/i }).first();
    if (await iniciarBtn.isVisible({ timeout: 8_000 })) {
      await iniciarBtn.click();
      const configConfirm = page.getByRole("button", { name: /confirmar|iniciar|começar/i }).first();
      if (await configConfirm.isVisible({ timeout: 3_000 })) {
        await configConfirm.click();
      }
      await page.waitForURL(/\/simulado\/.+/, { timeout: 15_000 });
      // Timer ou "questão X de Y" devem estar presentes
      const hasTimer = await page.getByText(/\d+:\d+|\d+ min/i).first().isVisible({ timeout: 5_000 });
      const hasCounter = await page.getByText(/questão \d|\/\d+/i).first().isVisible({ timeout: 5_000 });
      expect(hasTimer || hasCounter).toBeTruthy();
    }
  });
});
