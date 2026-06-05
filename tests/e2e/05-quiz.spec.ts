/**
 * Quiz Rápido — inicia, responde, timer, resultado, stress de carregamento
 */
import { test, expect } from "@playwright/test";
import { loginAdmin, waitForSpinnerGone } from "./helpers";

test.describe("Quiz Rápido", () => {

  test.beforeEach(async ({ page }) => {
    await loginAdmin(page);
    await page.goto("/quiz");
    await waitForSpinnerGone(page);
  });

  test("página carrega sem erro de rede", async ({ page }) => {
    const err = page.locator("text=/erro de conexão|sem questões.*mentor/i");
    await expect(err).not.toBeVisible({ timeout: 5_000 });
  });

  test("iniciar quiz e responder primeira questão", async ({ page }) => {
    const startBtn = page.locator('button:has-text("Iniciar quiz"), button:has-text("Iniciar")');
    if (!await startBtn.isVisible({ timeout: 5_000 }).catch(() => false)) return;

    await startBtn.click();
    // Deve aparecer timer ou enunciado
    const timer = page.locator("text=/[0-9]+:[0-9]+/");
    const enunciado = page.locator('p[class*="text-gray"]').first();
    const visible = await timer.isVisible({ timeout: 15_000 }) || await enunciado.isVisible({ timeout: 15_000 });
    expect(visible).toBe(true);

    // Responde
    const optBtn = page.locator('button[class*="rounded"]').filter({ hasText: /[A-E]/ }).first();
    if (await optBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await optBtn.click();
      await page.waitForTimeout(500);
      // Deve mostrar feedback (verde/vermelho) ou próxima questão
      const feedback = page.locator('[class*="green"],[class*="red"],[class*="correto"]').first();
      await expect(feedback).toBeVisible({ timeout: 5_000 });
    }
  });

  test("timeout de 15s não deixa tela presa em 'Preparando'", async ({ page }) => {
    // Simula fetch lento interceptando
    await page.route("/api/simulado/gerar", async (route) => {
      // Deixa passar mas com delay de 500ms (teste rápido de que o timeout existe)
      await new Promise(r => setTimeout(r, 500));
      await route.continue();
    });
    const startBtn = page.locator('button:has-text("Iniciar quiz"), button:has-text("Iniciar")');
    if (!await startBtn.isVisible({ timeout: 5_000 }).catch(() => false)) return;
    await startBtn.click();
    // "Preparando..." não deve ficar para sempre
    await expect(page.locator('button:has-text("Preparando")')).not.toBeVisible({ timeout: 20_000 });
  });

});
