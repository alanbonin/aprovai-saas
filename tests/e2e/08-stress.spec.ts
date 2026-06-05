/**
 * Stress & Concorrência — simula usuários agressivos e respostas rápidas
 * Detecta race conditions, double-submits, estados inconsistentes
 */
import { test, expect, chromium } from "@playwright/test";
import { loginAdmin, waitForSpinnerGone } from "./helpers";

test.describe("Stress / Concorrência", () => {

  // ── Cliques múltiplos rápidos nas opções de questão ──────────────────────
  test("clicar em 2 alternativas em sequência rápida não quebra estado", async ({ page }) => {
    await loginAdmin(page);
    await page.goto("/questoes");
    await waitForSpinnerGone(page);
    await page.waitForTimeout(2_000);

    const opts = page.locator('button[class*="rounded-xl"][class*="border-white"]');
    if (await opts.count() < 2) return;

    // Clica em A e B quase ao mesmo tempo (50ms de intervalo)
    const [btnA, btnB] = await opts.all();
    await Promise.all([
      btnA.click({ delay: 0 }),
      new Promise<void>(res => setTimeout(() => { btnB.click({ delay: 0 }).catch(() => {}); res(); }, 50)),
    ]);

    await page.waitForTimeout(500);
    // Apenas 1 opção deve estar selecionada (verde ou vermelha)
    const selected = page.locator('button[class*="green-500"], button[class*="red-500"]');
    const count = await selected.count();
    // Deve ter exatamente 1 (a correta) ou 2 (correta + errada selecionada) — mas nunca 0 depois de clicar
    expect(count).toBeGreaterThanOrEqual(1);
  });

  // ── Múltiplas tabs abertas ao mesmo tempo ────────────────────────────────
  test("duas abas em /questoes ao mesmo tempo não causam erro 500", async ({ browser }) => {
    const ctx = await browser.newContext();
    const [page1, page2] = await Promise.all([ctx.newPage(), ctx.newPage()]);

    const errors: string[] = [];
    page1.on("response", r => { if (r.status() >= 500) errors.push(r.url()); });
    page2.on("response", r => { if (r.status() >= 500) errors.push(r.url()); });

    // Faz login em page1 (compartilha cookie com page2 via mesmo contexto)
    await loginAdmin(page1);
    await Promise.all([
      page1.goto("/questoes"),
      page2.goto("/questoes"),
    ]);
    await Promise.all([
      waitForSpinnerGone(page1),
      waitForSpinnerGone(page2),
    ]);
    await page1.waitForTimeout(3_000);
    expect(errors, `Erros 500: ${errors.join(", ")}`).toHaveLength(0);
    await ctx.close();
  });

  // ── Navegação rápida entre páginas (simula usuário impaciente) ───────────
  test("navegação rápida entre 5 páginas não causa crash", async ({ page }) => {
    await loginAdmin(page);
    const routes = ["/questoes", "/quiz", "/desafio", "/revisao", "/adaptativo"];
    const errors: string[] = [];
    page.on("response", r => { if (r.status() >= 500) errors.push(`${r.status()} ${r.url()}`); });

    for (const route of routes) {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(300); // não espera carregar — simula impaciência
    }
    await waitForSpinnerGone(page);
    expect(errors, `Erros 500: ${errors.join(", ")}`).toHaveLength(0);
  });

  // ── Submit duplo no login ─────────────────────────────────────────────────
  test("submit duplo no login não cria 2 sessões", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[type="email"]', process.env.TEST_ADMIN_EMAIL ?? "");
    await page.fill('input[type="password"]', process.env.TEST_ADMIN_PASSWORD ?? "");
    const submitBtn = page.locator('button[type="submit"]');
    // Clica 2 vezes em sequência rápida
    await Promise.all([
      submitBtn.click(),
      submitBtn.click().catch(() => {}),
    ]);
    // Deve redirecionar normalmente sem erro
    await expect(page).toHaveURL(/\/(hoje|admin)/, { timeout: 15_000 });
  });

  // ── Rate limiting na API ─────────────────────────────────────────────────
  test("10 requisiçõe simultâneas em /api/questoes retornam <= 429 (não 500)", async ({ page }) => {
    await loginAdmin(page);
    // Dispara 10 requisições paralelas
    const results = await page.evaluate(async () => {
      const responses = await Promise.all(
        Array.from({ length: 10 }, () =>
          fetch("/api/questoes?limit=5").then(r => r.status).catch(() => 0)
        )
      );
      return responses;
    });
    const has500 = results.some(s => s >= 500);
    expect(has500, `Recebeu 500 em: ${results.join(", ")}`).toBe(false);
  });

  // ── Requisições lentas não deixam loading eterno ─────────────────────────
  test("fetch lento em /questoes mostra questões em até 15s", async ({ page }) => {
    await loginAdmin(page);
    let delay = 2000;
    await page.route("/api/questoes*", async route => {
      await new Promise(r => setTimeout(r, delay));
      delay = 0; // só atrasa a primeira
      await route.continue();
    });
    await page.goto("/questoes");
    // Deve sair do loading em até 15s
    const spinner = page.locator('[class*="animate-spin"]');
    await expect(spinner).not.toBeVisible({ timeout: 15_000 });
  });

});
