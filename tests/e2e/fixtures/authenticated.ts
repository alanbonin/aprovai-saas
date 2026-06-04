import { test as base, Page } from "@playwright/test";
import { TEST_USER } from "./test-data";

// Fixture que injeta uma página já autenticada via login real
// (sem storageState para garantir que o fluxo de auth funciona em prod)

export const test = base.extend<{ authedPage: Page }>({
  authedPage: async ({ page }, use) => {
    if (!TEST_USER.password) {
      // Sem credenciais, pula graciosamente
      await use(page);
      return;
    }
    await page.goto("/login");
    await page.getByPlaceholder(/seu@email|e-mail/i).fill(TEST_USER.email);
    await page.locator("input[type=password]").fill(TEST_USER.password);
    await page.getByRole("button", { name: /entrar/i }).click();
    await page.waitForURL(/\/(hoje|dashboard|onboarding)/, { timeout: 20_000 });
    await use(page);
  },
});

export { expect } from "@playwright/test";
