import { Page, expect } from "@playwright/test";

export class AuthPage {
  constructor(private page: Page) {}

  async goToLogin() {
    await this.page.goto("/login");
    await expect(this.page).toHaveURL(/\/login/);
  }

  async login(email: string, password: string) {
    await this.goToLogin();
    await this.page.getByPlaceholder(/seu@email|e-mail/i).fill(email);
    await this.page.locator("input[type=password]").fill(password);
    await this.page.getByRole("button", { name: /entrar/i }).click();
  }

  async loginAndWait(email: string, password: string) {
    await this.login(email, password);
    // Aguarda redirect pós-login (vai para /hoje)
    await this.page.waitForURL(/\/(hoje|onboarding|dashboard)/, { timeout: 15_000 });
  }

  async logout() {
    // Tenta via menu de perfil
    const profileBtn = this.page.getByRole("button", { name: /perfil|conta|sair/i }).first();
    if (await profileBtn.isVisible()) {
      await profileBtn.click();
      const logoutBtn = this.page.getByRole("menuitem", { name: /sair/i });
      if (await logoutBtn.isVisible()) {
        await logoutBtn.click();
        await this.page.waitForURL(/\/login/, { timeout: 10_000 });
        return;
      }
    }
    // Fallback: navega direto para endpoint de logout
    await this.page.goto("/api/auth/signout");
  }

  async expectLoginError() {
    await expect(
      this.page.getByText(/e-mail ou senha incorretos/i)
    ).toBeVisible({ timeout: 8_000 });
  }
}
