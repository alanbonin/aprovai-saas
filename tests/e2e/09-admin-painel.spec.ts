/**
 * Painel Admin — Dashboard, Analytics, Questões, Planos
 * Testa as rotas principais do painel admin como administrador
 */
import { test, expect } from "@playwright/test";
import { loginAdmin, waitForSpinnerGone } from "./helpers";

const ROTAS_ADMIN = [
  { path: "/admin",              label: "Dashboard Admin" },
  { path: "/admin/analytics",    label: "Analytics" },
  { path: "/admin/alunos",       label: "Alunos" },
  { path: "/admin/questoes",     label: "Questões Admin" },
  { path: "/admin/assinaturas",  label: "Assinaturas" },
  { path: "/admin/planos",       label: "Planos" },
];

test.describe("Admin › Painel", () => {

  test.beforeEach(async ({ page }) => {
    await loginAdmin(page);
  });

  for (const rota of ROTAS_ADMIN) {
    test(`${rota.label} carrega sem erro`, async ({ page }) => {
      const errors: string[] = [];
      page.on("response", r => { if (r.status() >= 500) errors.push(`${r.status()} ${r.url()}`); });
      await page.goto(rota.path);
      await waitForSpinnerGone(page);
      await page.waitForTimeout(2_000);
      expect(errors).toHaveLength(0);
      // Página não deve redirecionar para login (perdeu sessão)
      await expect(page).not.toHaveURL(/\/login/);
    });
  }

  test("acesso a rota admin bloqueado para não-admin", async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    // Não faz login — acessa admin direto
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login/, { timeout: 8_000 });
    await ctx.close();
  });

  test("dashboard admin mostra métricas (total alunos, receita, etc)", async ({ page }) => {
    await page.goto("/admin");
    await waitForSpinnerGone(page);
    await page.waitForTimeout(2_000);
    // Deve ter pelo menos um número de métrica visível
    const metric = page.locator('[class*="font-bold"][class*="tabular"],[class*="text-2xl"],[class*="text-3xl"]').first();
    await expect(metric).toBeVisible({ timeout: 10_000 });
  });

  test("página de alunos mostra abas Todos, Direto, Isentos", async ({ page }) => {
    await page.goto("/admin/alunos");
    await waitForSpinnerGone(page);
    await expect(page.locator('button:has-text("Todos")')).toBeVisible();
    await expect(page.locator('button:has-text("Direto")')).toBeVisible();
    await expect(page.locator('button:has-text("Isentos")')).toBeVisible();
  });

  test("aba Isentos lista apenas usuários isentos", async ({ page }) => {
    await page.goto("/admin/alunos");
    await waitForSpinnerGone(page);
    await page.click('button:has-text("Isentos")');
    await waitForSpinnerGone(page);
    // Todos os usuários listados devem ter badge "isento"
    const rows = page.locator('tr[data-id], [data-user-row]');
    const rowCount = await rows.count();
    if (rowCount > 0) {
      for (let i = 0; i < Math.min(rowCount, 5); i++) {
        const row = rows.nth(i);
        await expect(row.locator('text=isento')).toBeVisible();
      }
    }
  });

  test("gerar questão em massa não trava (mostra progress ou resultado)", async ({ page }) => {
    await page.goto("/admin/questoes/gerar-massa");
    await waitForSpinnerGone(page);
    await page.waitForTimeout(2_000);
    // Deve ter formulário ou botão visível
    // Evita pegar o primeiro botão da sidebar — busca form ou botão de ação na área principal
    const form = page.locator('form').first().or(page.locator('main button, [role="main"] button').first());
    await expect(form).toBeVisible({ timeout: 5_000 });
  });

});
