import { test, expect } from "./fixtures/authenticated";

test.describe("Fluxo de questões (/questoes)", () => {
  test.beforeEach(async ({ authedPage: page }) => {
    await page.goto("/questoes");
    await expect(page).toHaveURL(/\/questoes/);
  });

  test("página de questões carrega sem erros", async ({ authedPage: page }) => {
    await expect(page.locator("body")).not.toContainText(/500|erro interno/i);
    // Deve ter algum conteúdo de questão ou filtro
    await expect(
      page.getByText(/questão|matéria|disciplina|filtrar|banca/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("filtros de matéria estão acessíveis", async ({ authedPage: page }) => {
    const filtroBtn = page.getByRole("button", { name: /filtrar|filtros|matéria/i }).first();
    if (await filtroBtn.isVisible({ timeout: 3_000 })) {
      await filtroBtn.click();
      await expect(
        page.getByRole("dialog").or(page.locator("[data-radix-popper-content-wrapper]"))
      ).toBeVisible({ timeout: 5_000 });
    }
  });

  test("clicar em responder uma questão exibe opções de resposta", async ({ authedPage: page }) => {
    // Aguarda questão aparecer
    const questaoText = page.locator("[class*='questao'], [class*='question'], article").first();
    if (await questaoText.isVisible({ timeout: 8_000 })) {
      // As alternativas devem ser visíveis
      const alternativas = page.locator("button, label").filter({ hasText: /^[A-E]\)|^[A-E]\s/ });
      const count = await alternativas.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test("responder questão e ver gabarito", async ({ authedPage: page }) => {
    const alternativa = page.locator("button, label").filter({ hasText: /^[A-E]\)|^A\s|^A\)/ }).first();
    if (await alternativa.isVisible({ timeout: 8_000 })) {
      await alternativa.click();
      // Deve aparecer indicação de correto/errado
      await expect(
        page.getByText(/correto|errado|gabarito|acertou|errou/i)
      ).toBeVisible({ timeout: 8_000 });
    }
  });

  test("questão filtrada por banca — AOCP aparece como opção", async ({ authedPage: page }) => {
    const bancaFilter = page.getByRole("button", { name: /banca/i })
      .or(page.getByText(/banca/i).first());
    if (await bancaFilter.isVisible({ timeout: 3_000 })) {
      await bancaFilter.click();
      await expect(page.getByText(/AOCP/i)).toBeVisible({ timeout: 5_000 });
    }
  });
});
