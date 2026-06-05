/**
 * Revisão SM-2 — carregamento, resposta, qualidade, avanço, duplo clique
 */
import { test, expect } from "@playwright/test";
import { loginAdmin, waitForSpinnerGone } from "./helpers";

test.describe("Revisão SM-2", () => {

  test.beforeEach(async ({ page }) => {
    await loginAdmin(page);
    await page.goto("/revisao");
    await waitForSpinnerGone(page);
    await page.waitForTimeout(1_000);
  });

  test("carrega sem mensagem de erro", async ({ page }) => {
    const err = page.locator("text=/erro ao carregar|problema de conex/i");
    await expect(err).not.toBeVisible({ timeout: 15_000 });
  });

  test("responder acerto mostra opções de qualidade", async ({ page }) => {
    const opts = page.locator('button[class*="rounded-xl"][class*="border"]');
    if (await opts.count() === 0) return; // sem questões de revisão

    const correctBtn = page.locator('button[class*="green"]').first();
    if (!await correctBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      // Clica qualquer opção para revelar o gabarito
      await opts.first().click();
    }

    const qualOpts = page.locator('button:has-text("Dominei"), button:has-text("Entendi"), button:has-text("Difícil"), button:has-text("Errei")');
    await expect(qualOpts.first()).toBeVisible({ timeout: 5_000 });
  });

  test("avançar não pula questão — índice 1→2", async ({ page }) => {
    const progress = page.locator("text=/questão 1 de/i");
    if (!await progress.isVisible({ timeout: 12_000 }).catch(() => false)) return;

    const optBtn = page.locator('button[class*="rounded-xl"][class*="border"]').first();
    await optBtn.click();
    await page.waitForTimeout(400);

    // Clica qualidade ou "Pular"
    const actionBtn = page.locator(
      'button:has-text("Dominei"), button:has-text("Entendi"), button:has-text("Difícil"), button:has-text("Errei"), button:has-text("Pular")'
    ).first();
    if (await actionBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await actionBtn.click();
    }

    const nextBtn = page.locator('button:has-text("Próxima"), button:has-text("Próxima →")');
    if (await nextBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await nextBtn.click();
      await page.waitForTimeout(400);
      await expect(page.locator("text=/questão 2 de/i")).toBeVisible({ timeout: 5_000 });
    }
  });

  test("duplo clique em Próxima não pula para questão 3", async ({ page }) => {
    const progress = page.locator("text=/questão 1 de/i");
    if (!await progress.isVisible({ timeout: 12_000 }).catch(() => false)) return;

    const optBtn = page.locator('button[class*="rounded-xl"][class*="border"]').first();
    await optBtn.click();
    await page.waitForTimeout(400);

    const qualBtn = page.locator(
      'button:has-text("Dominei"), button:has-text("Entendi"), button:has-text("Difícil"), button:has-text("Errei")'
    ).first();
    if (await qualBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await qualBtn.click();
    }

    const nextBtn = page.locator('button:has-text("Próxima →")');
    if (await nextBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await nextBtn.dblclick();
      await page.waitForTimeout(400);
      await expect(page.locator("text=/questão 2 de/i")).toBeVisible({ timeout: 5_000 });
    }
  });

});
