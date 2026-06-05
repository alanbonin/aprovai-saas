/**
 * Desafio Diário — carregamento, resposta, timer, resultado
 */
import { test, expect } from "@playwright/test";
import { loginAdmin, waitForSpinnerGone } from "./helpers";

test.describe("Desafio Diário", () => {

  test.beforeEach(async ({ page }) => {
    await loginAdmin(page);
    await page.goto("/desafio");
  });

  test("carrega desafio ou mostra questões insuficientes (não trava)", async ({ page }) => {
    // Pode ser: tela de início, questões insuficientes, ou já completou hoje
    const startBtn = page.locator('button:has-text("Iniciar"), button:has-text("Começar")');
    const insuficiente = page.locator("text=/insuficient|matéria/i");
    const completado = page.locator("text=/já completou|concluído hoje/i");
    const spinner = page.locator('[class*="animate-spin"]');

    // Espera sair do spinner
    await expect(spinner).not.toBeVisible({ timeout: 25_000 });

    const loaded = await startBtn.isVisible() || await insuficiente.isVisible() || await completado.isVisible();
    expect(loaded).toBe(true);
  });

  test("questões não pulam ao avançar — índice incrementa 1 a 1", async ({ page }) => {
    await page.waitForTimeout(3_000);
    const startBtn = page.locator('button:has-text("Iniciar"), button:has-text("Começar")');
    if (await startBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await startBtn.click();
    }

    // Responde Q1
    const optBtn = page.locator('button[class*="rounded-xl"]').filter({ hasText: /^[A-E]$/ }).first()
      .or(page.locator('button[class*="border"][class*="text"]').first());
    if (!await optBtn.isVisible({ timeout: 5_000 }).catch(() => false)) return; // desafio já feito hoje

    await optBtn.click();
    await page.waitForTimeout(500);

    // Clica qualidade ou próxima
    const qualBtn = page.locator('button:has-text("Boa!"), button:has-text("Fácil"), button:has-text("Difícil")').first();
    if (await qualBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await qualBtn.click();
    }
    const nextBtn = page.locator('button:has-text("Próxima"), button:has-text("Próxima →")');
    if (await nextBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await nextBtn.click();
      await page.waitForTimeout(400);
      // Deve ser questão 2
      await expect(page.locator("text=/2 \/ [0-9]+|questão 2/i")).toBeVisible({ timeout: 5_000 });
    }
  });

  test("duplo clique em Próxima não pula questão extra", async ({ page }) => {
    await page.waitForTimeout(3_000);
    const startBtn = page.locator('button:has-text("Iniciar"), button:has-text("Começar")');
    if (await startBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await startBtn.click();
    }

    const optBtn = page.locator('button[class*="rounded-xl"]').filter({ hasText: /^[A-E]$/ }).first()
      .or(page.locator('button[class*="border"][class*="text"]').first());
    if (!await optBtn.isVisible({ timeout: 5_000 }).catch(() => false)) return;

    await optBtn.click();
    await page.waitForTimeout(500);

    const qualBtn = page.locator('button:has-text("Boa!"), button:has-text("Fácil"), button:has-text("Difícil")').first();
    if (await qualBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await qualBtn.click();
    }
    const nextBtn = page.locator('button:has-text("Próxima"), button:has-text("Próxima →")');
    if (await nextBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await nextBtn.dblclick();
      await page.waitForTimeout(400);
      await expect(page.locator("text=/2 \/ [0-9]+|questão 2/i")).toBeVisible({ timeout: 5_000 });
    }
  });
});
