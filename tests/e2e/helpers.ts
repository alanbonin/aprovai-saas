import { Page, expect } from "@playwright/test";

export const ADMIN = {
  email: process.env.TEST_ADMIN_EMAIL ?? "",
  password: process.env.TEST_ADMIN_PASSWORD ?? "",
};

// Aluno temporário — criado/deletado a cada run pelo admin
export function makeTestStudent() {
  return {
    name: "QA Bot Teste",
    email: `qabot+${Date.now()}@aprovai360-test.com`,
    password: "Teste@12345",
  };
}

export async function loginAdmin(page: Page) {
  await page.goto("/login");
  await page.fill('input[type="email"]', ADMIN.email);
  await page.fill('input[type="password"]', ADMIN.password);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/(admin|hoje)/, { timeout: 15_000 });
}

export async function loginStudent(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/hoje/, { timeout: 15_000 });
}

export async function waitForToast(page: Page, text?: string | RegExp) {
  // Toast usa "fixed ... rounded-*" — sidebar e header mobile não têm rounded
  const locator = page.locator(
    '[class*="toast"],[class*="Toast"],[role="status"],[role="alert"],' +
    '[class*="fixed"][class*="rounded"]'
  ).first();
  await expect(locator).toBeVisible({ timeout: 8_000 });
  if (text) await expect(locator).toContainText(text);
}

export async function waitForSpinnerGone(page: Page) {
  await page.waitForSelector('[class*="animate-spin"]', { state: "hidden", timeout: 20_000 }).catch(() => {});
}
