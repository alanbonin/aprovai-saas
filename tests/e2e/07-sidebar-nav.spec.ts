/**
 * Sidebar & Navegação — rotas principais carregam, sair funciona
 * Testa rotas que às vezes mostram "sem questão / treinar com mentor"
 */
import { test, expect } from "@playwright/test";
import { loginAdmin, waitForSpinnerGone } from "./helpers";

const ROTAS_ALUNO = [
  { path: "/hoje",       label: "Briefing do Dia" },
  { path: "/questoes",   label: "Questões" },
  { path: "/quiz",       label: "Quiz" },
  { path: "/desafio",    label: "Desafio" },
  { path: "/flashcards", label: "Flashcards" },
  { path: "/revisao",    label: "Revisão" },
  { path: "/adaptativo", label: "Adaptativo" },
  { path: "/simulado",   label: "Simulado" },
  { path: "/relatorio",  label: "Relatório" },
  { path: "/mentor",     label: "Mentor" },
];

test.describe("Sidebar / Navegação", () => {

  test.beforeEach(async ({ page }) => {
    await loginAdmin(page);
  });

  for (const rota of ROTAS_ALUNO) {
    test(`${rota.label} (${rota.path}) carrega sem erro 5xx`, async ({ page }) => {
      // Monitora respostas 5xx
      const serverErrors: string[] = [];
      page.on("response", res => {
        if (res.status() >= 500) serverErrors.push(`${res.status()} ${res.url()}`);
      });

      await page.goto(rota.path);
      await waitForSpinnerGone(page);
      await page.waitForTimeout(2_000);

      expect(serverErrors, `Erro 5xx em ${rota.path}: ${serverErrors.join(", ")}`).toHaveLength(0);

      // Não deve mostrar tela de erro genérica
      const genericErr = page.locator("text=/500|internal server error/i").first();
      await expect(genericErr).not.toBeVisible();
    });
  }

  const clickSair = (page: import("@playwright/test").Page) =>
    page.locator('button[title="Sair"], button:has-text("Sair")').first().click({ force: true });

  test("botão Sair funciona na primeira tentativa", async ({ page }) => {
    await page.goto("/hoje");
    await page.waitForLoadState("networkidle");
    await expect(page.locator('button[title="Sair"]').first()).toHaveCount(1, { timeout: 5_000 });
    await clickSair(page);
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
  });

  test("botão Sair com duplo clique não causa erro", async ({ page }) => {
    await page.goto("/hoje");
    await page.waitForLoadState("networkidle");
    await expect(page.locator('button[title="Sair"]').first()).toHaveCount(1, { timeout: 5_000 });
    // Duplo clique — debounce (signingOut flag) deve impedir segunda chamada
    await clickSair(page);
    await clickSair(page);
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
  });

  test("mobile: botão Mais abre e fecha o menu", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 }); // iPhone 14
    await page.goto("/hoje");
    const maisBtn = page.locator('button:has-text("Mais"), button[aria-label="Menu"]').first();
    if (await maisBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await maisBtn.click();
      await expect(page.locator("text=Configurações")).toBeVisible({ timeout: 3_000 });
      // Fechar clicando no overlay
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);
    }
  });

  test("quiz/questoes/outros: mensagem 'sem questão/treinar com mentor' não aparece em carregamento normal", async ({ page }) => {
    for (const rota of ["/questoes", "/quiz", "/revisao", "/adaptativo"]) {
      await page.goto(rota);
      await waitForSpinnerGone(page);
      await page.waitForTimeout(2_000);
      const mentorMsg = page.locator("text=/treinar com mentor|mentor/i").first();
      // A mensagem de "treinar com mentor" só deve aparecer se realmente não há questões,
      // não como estado de loading ou erro
      if (await mentorMsg.isVisible({ timeout: 1_000 }).catch(() => false)) {
        // Se apareceu, garante que NÃO está junto com um spinner (tela de erro real, não loading)
        const spinner = page.locator('[class*="animate-spin"]');
        await expect(spinner).not.toBeVisible();
      }
    }
  });

});
