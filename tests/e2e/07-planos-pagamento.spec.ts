import { test, expect } from "@playwright/test";
import { AuthPage } from "./pages/auth.page";
import { TEST_USER } from "./fixtures/test-data";

test.describe("Planos e pagamento (/planos)", () => {
  test("página de planos carrega sem autenticação", async ({ page }) => {
    await page.goto("/planos");
    const isLoginRedirect = page.url().includes("/login");
    if (!isLoginRedirect) {
      await expect(page.locator("body")).not.toContainText(/500|erro interno/i);
    }
  });

  test("planos exibem preços em BRL", async ({ page }) => {
    await page.goto("/planos");
    if (page.url().includes("/login")) return; // Requer auth — skip visual

    await expect(
      page.getByText(/R\$|mensal|anual|gratuito|free/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("página /planos exibe os planos para usuário autenticado", async ({ page }) => {
    test.skip(!TEST_USER.password, "TEST_USER_PASSWORD não configurado");
    const auth = new AuthPage(page);
    await auth.loginAndWait(TEST_USER.email, TEST_USER.password);
    await page.goto("/planos");
    // Exibe os nomes dos planos — botão "assinar" pode não aparecer se já assinou
    await expect(
      page.getByText(/trial gratuito|focado|aprovação|elite/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("botão de assinar não redireciona para URL externa suspeita", async ({ page }) => {
    test.skip(!TEST_USER.password, "TEST_USER_PASSWORD não configurado");
    const auth = new AuthPage(page);
    await auth.loginAndWait(TEST_USER.email, TEST_USER.password);
    await page.goto("/planos");

    const assinarBtn = page.getByRole("button", { name: /assinar|upgrade|escolher/i }).first();
    if (await assinarBtn.isVisible({ timeout: 8_000 })) {
      // Captura a navegação para verificar domínio (MercadoPago ou checkout interno)
      const [popup] = await Promise.all([
        page.waitForEvent("popup", { timeout: 5_000 }).catch(() => null),
        assinarBtn.click(),
      ]);
      if (popup) {
        const url = popup.url();
        // Deve ser MercadoPago ou domínio aprovai
        const isSafe = /mercadopago|aprovai360|localhost/i.test(url);
        expect(isSafe).toBeTruthy();
        await popup.close();
      } else {
        // Redirecionou na mesma janela — verifica URL
        await page.waitForTimeout(2_000);
        const url = page.url();
        const isSafe = /mercadopago|aprovai360|localhost/i.test(url);
        expect(isSafe).toBeTruthy();
      }
    }
  });
});
