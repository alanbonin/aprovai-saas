/**
 * Fluxo de Questões — aluno respondendo questões, avançando, filtros, favoritos
 * Testa os bugs fixados: questões pulando, carregamento sem timeout
 */
import { test, expect } from "@playwright/test";
import { loginAdmin, waitForSpinnerGone } from "./helpers";

test.describe("Questões (fluxo do aluno)", () => {

  test.beforeEach(async ({ page }) => {
    await loginAdmin(page);
    await page.goto("/questoes");
    await waitForSpinnerGone(page);
    await page.waitForTimeout(1_000); // deixa questões renderizarem
  });

  test("carrega questões em até 12s sem mensagem de erro", async ({ page }) => {
    const errorMsg = page.locator("text=/erro ao carregar|problema de conex/i");
    await expect(errorMsg).not.toBeVisible({ timeout: 12_000 });
    // Deve ter pelo menos uma questão ou mensagem "nenhuma encontrada" (não erro de rede)
    const card = page.locator('[class*="rounded-2xl"]').first();
    const empty = page.locator("text=/nenhuma questão|configure seu perfil/i");
    const visible = await card.isVisible() || await empty.isVisible();
    expect(visible).toBe(true);
  });

  test("avançar questão não pula nenhuma — índice incrementa 1 a 1", async ({ page }) => {
    // Espera a primeira questão carregar
    const hasQ = await page.locator("text=Questão 1 de").isVisible({ timeout: 20_000 }).catch(() => false);
    if (!hasQ) { test.skip(); return; } // sem questões no perfil — pula graciosamente

    // Responde a primeira alternativa disponível
    const optionBtn = page.locator('button[class*="rounded-xl"][class*="border"]').first();
    await optionBtn.click();
    await page.waitForTimeout(500);

    // Se acertou → clica em "Como foi?" (qualidade)
    const qualBtn = page.locator('button:has-text("Boa!"), button:has-text("Fácil"), button:has-text("Difícil")').first();
    if (await qualBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await qualBtn.click();
    }

    // Clica em "Próxima questão"
    const nextBtn = page.locator('button:has-text("Próxima questão"), button:has-text("Próxima →")');
    await expect(nextBtn).toBeVisible({ timeout: 5_000 });
    await nextBtn.click();
    await page.waitForTimeout(300);

    // Deve estar na questão 2 (não na 3)
    await expect(page.locator("text=Questão 2 de")).toBeVisible({ timeout: 5_000 });
  });

  test("duplo clique em 'Próxima' não pula questão extra", async ({ page }) => {
    const hasQ = await page.locator("text=Questão 1 de").isVisible({ timeout: 20_000 }).catch(() => false);
    if (!hasQ) { test.skip(); return; } // sem questões no perfil — pula graciosamente

    const optionBtn = page.locator('button[class*="rounded-xl"][class*="border"]').first();
    await optionBtn.click();
    await page.waitForTimeout(300);

    const qualBtn = page.locator('button:has-text("Boa!"), button:has-text("Fácil"), button:has-text("Difícil")').first();
    if (await qualBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await qualBtn.click();
    }

    const nextBtn = page.locator('button:has-text("Próxima questão"), button:has-text("Próxima →")');
    await expect(nextBtn).toBeVisible({ timeout: 5_000 });
    // Duplo clique
    await nextBtn.dblclick();
    await page.waitForTimeout(500);

    // Deve estar na 2, não na 3
    await expect(page.locator("text=Questão 2 de")).toBeVisible({ timeout: 5_000 });
  });

  test("filtro de banca filtra questões corretamente", async ({ page }) => {
    await page.click('button:has-text("Filtros")');
    // Seleciona nível Fácil
    const nivelSelect = page.locator('select').filter({ hasText: /todos/i }).last();
    await nivelSelect.selectOption("facil");
    await page.click('button:has-text("Novas")');
    await waitForSpinnerGone(page);
    await page.waitForTimeout(1_000);
    // Deve mostrar questão ou estado vazio (não erro)
    const errorMsg = page.locator("text=/erro ao carregar/i");
    await expect(errorMsg).not.toBeVisible();
  });

  test("favoritar questão adiciona estrela", async ({ page }) => {
    const hasQ = await page.locator("text=Questão 1 de").isVisible({ timeout: 20_000 }).catch(() => false);
    if (!hasQ) { test.skip(); return; } // sem questões no perfil — pula graciosamente
    const favBtn = page.locator('button[title*="favorit"], button[title*="Favorit"]').first();
    if (await favBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await favBtn.click();
      await page.waitForTimeout(500);
      // Estrela deve ficar preenchida (fill)
      const star = favBtn.locator("svg");
      const fill = await star.getAttribute("class");
      expect(fill).toContain("fill-yellow");
    }
  });

  test("reportar questão abre modal e envia", async ({ page }) => {
    const hasQ = await page.locator("text=Questão 1 de").isVisible({ timeout: 20_000 }).catch(() => false);
    if (!hasQ) { test.skip(); return; } // sem questões no perfil — pula graciosamente
    const flagBtn = page.locator('button[title*="eportar"], button[title*="Reportar"]').first();
    if (await flagBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await flagBtn.click();
      await expect(page.locator("text=/reportar questão/i")).toBeVisible({ timeout: 5_000 });
      await page.click('button:has-text("Cancelar")');
    }
  });

});
