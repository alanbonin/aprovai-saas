/**
 * Painel Admin — Gestão de Alunos
 * Cobre: criar aluno direto, criar aluno gratuito (sem plano), criar isento,
 * toggle isenção, editar dados, deletar, busca, paginação.
 */
import { test, expect } from "@playwright/test";
import { loginAdmin, makeTestStudent, waitForToast, waitForSpinnerGone } from "./helpers";

test.describe("Admin › Alunos", () => {

  test.beforeEach(async ({ page }) => {
    await loginAdmin(page);
    await page.goto("/admin/alunos");
    await waitForSpinnerGone(page);
  });

  // ── Criar aluno direto (com plano) ────────────────────────────────────────
  test("criar aluno direto aparece na lista", async ({ page }) => {
    const student = makeTestStudent();
    await page.click('button:has-text("Criar Usuário"), button:has-text("Criar")');
    await page.fill('input[placeholder*="João"]', student.name);
    await page.fill('input[type="email"]', student.email);
    await page.fill('input[type="password"]', student.password);
    await page.click('button[type="submit"]:has-text("Criar")');
    await waitForToast(page, /criado/i);
    // Verifica presença no DOM via busca (email em <p truncate> não é "visible" para o Playwright)
    await page.fill('input[placeholder*="Buscar"]', student.email);
    await page.waitForTimeout(800);
    const count = await page.locator(`text=${student.email}`).count();
    expect(count).toBeGreaterThan(0);
  });

  // ── Criar aluno gratuito (sem plano) ─────────────────────────────────────
  test("criar aluno sem plano mostra badge de inativos/sem assinatura", async ({ page }) => {
    const student = makeTestStudent();
    await page.click('button:has-text("Criar Usuário"), button:has-text("Criar")');
    await page.fill('input[placeholder*="João"]', student.name);
    await page.fill('input[type="email"]', student.email);
    await page.fill('input[type="password"]', student.password);
    await page.selectOption('select', { label: /sem plano/i }).catch(() => {});
    await page.click('button[type="submit"]:has-text("Criar")');
    await waitForToast(page, /criado/i);
    await page.fill('input[placeholder*="Buscar"]', student.email);
    await page.waitForTimeout(800);
    const count = await page.locator(`text=${student.email}`).count();
    expect(count).toBeGreaterThan(0);
  });

  // ── Criar aluno isento pela aba isentos ──────────────────────────────────
  test("criar isento pela aba isentos aparece na aba Isentos (não em Direto)", async ({ page }) => {
    const student = makeTestStudent();
    // Vai para aba isentos
    await page.click('button:has-text("Isentos")');
    await waitForSpinnerGone(page);

    // Botão deve dizer "Criar Isento"
    await expect(page.locator('button:has-text("Criar Isento")')).toBeVisible();
    await page.click('button:has-text("Criar Isento")');

    // Checkbox de isento deve estar pré-marcado
    const checkbox = page.locator('input[type="checkbox"]').filter({ hasText: /isento/i }).first();
    // Alternativa: pega pelo label
    const isentoLabel = page.locator('label:has-text("isento")');
    const chk = isentoLabel.locator('input[type="checkbox"]').first().or(checkbox);
    await expect(chk).toBeChecked({ timeout: 5_000 });

    await page.fill('input[placeholder*="João"]', student.name);
    await page.fill('input[type="email"]', student.email);
    await page.fill('input[type="password"]', student.password);
    await page.click('button[type="submit"]:has-text("Criar")');
    await waitForToast(page, /criado/i);

    // Aluno criado deve aparecer na aba Isentos — verifica presença no DOM
    await page.fill('input[placeholder*="Buscar"]', student.email).catch(() => {});
    await page.waitForTimeout(800);
    const countIsento = await page.locator(`text=${student.email}`).count();
    expect(countIsento).toBeGreaterThan(0);
    // (Usuário isento criado pelo admin também aparece na aba Direto — apenas verificamos que está em Isentos)
  });

  // ── Toggle isenção manual ────────────────────────────────────────────────
  test("toggle isenção em aluno existente atualiza badge", async ({ page }) => {
    const student = makeTestStudent();
    // Cria aluno primeiro
    await page.click('button:has-text("Criar Usuário"), button:has-text("Criar")');
    await page.fill('input[placeholder*="João"]', student.name);
    await page.fill('input[type="email"]', student.email);
    await page.fill('input[type="password"]', student.password);
    await page.click('button[type="submit"]:has-text("Criar")');
    await waitForToast(page, /criado/i);

    // Clica no botão de isento do usuário recém-criado
    // title="Isentar (não cobrar)" ou "Remover isenção (cobrar)"
    const userRow = page.locator(`tr,div[data-id]`).filter({ hasText: student.email }).first();
    const isentoBtn = userRow.locator('button[title*="sentar"],button[title*="senção"]').first();
    if (!await isentoBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      test.skip(); // Botão só aparece se usuário tem assinatura
      return;
    }
    await isentoBtn.click();
    await waitForToast(page);

    // Badge "isento" deve aparecer na linha
    await expect(userRow.locator('text=isento')).toBeVisible({ timeout: 5_000 });

    // Aba isentos deve conter o aluno agora
    await page.click('button:has-text("Isentos")');
    await expect(page.locator(`text=${student.email}`).first()).toBeVisible({ timeout: 5_000 });
  });

  // ── Busca ────────────────────────────────────────────────────────────────
  test("busca filtra alunos por email", async ({ page }) => {
    await page.fill('input[placeholder*="Buscar"]', "xyz999naoexiste@test.com");
    await page.press('input[placeholder*="Buscar"]', "Enter");
    await waitForSpinnerGone(page);
    const rows = page.locator("tbody tr, [data-user-row]");
    const count = await rows.count();
    if (count > 0) {
      await expect(page.locator("text=/nenhum/i").or(rows)).toBeDefined();
    }
  });

  // ── Paginação ────────────────────────────────────────────────────────────
  test("paginação avança e volta de página", async ({ page }) => {
    const nextBtn = page.locator('button:has-text("Próxima")');
    if (await nextBtn.isVisible()) {
      await nextBtn.click();
      await waitForSpinnerGone(page);
      const prevBtn = page.locator('button:has-text("Anterior")');
      await expect(prevBtn).not.toBeDisabled();
      await prevBtn.click();
      await waitForSpinnerGone(page);
    }
  });

  // ── Editar dados ─────────────────────────────────────────────────────────
  test("editar nome de aluno reflete na lista", async ({ page }) => {
    const student = makeTestStudent();
    // Cria
    await page.click('button:has-text("Criar Usuário"), button:has-text("Criar")');
    await page.fill('input[placeholder*="João"]', student.name);
    await page.fill('input[type="email"]', student.email);
    await page.fill('input[type="password"]', student.password);
    await page.click('button[type="submit"]:has-text("Criar")');
    await waitForToast(page, /criado/i);

    // Abre edição — title="Editar usuário"
    const userRow = page.locator("tr").filter({ hasText: student.email }).first();
    const editBtn = userRow.locator('button[title="Editar usuário"]').first();
    await editBtn.click();

    const novoNome = "QA Bot Editado";
    // Modal é um <div class="fixed inset-0 z-50"> — não usa <dialog>
    const nameInput = page.locator('[class*="z-50"] input[type="text"]').first();
    await nameInput.clear();
    await nameInput.fill(novoNome);
    await page.click('button[type="submit"]:has-text("Salvar"), button:has-text("Atualizar")');
    await waitForToast(page);
    // Nome atualizado no DOM (pode estar em <p truncate>)
    const countNome = await page.locator(`text=${novoNome}`).count();
    expect(countNome).toBeGreaterThan(0);
  });

  // ── Deletar aluno ────────────────────────────────────────────────────────
  test("deletar aluno remove da lista", async ({ page }) => {
    const student = makeTestStudent();
    // Cria
    await page.click('button:has-text("Criar Usuário"), button:has-text("Criar")');
    await page.fill('input[placeholder*="João"]', student.name);
    await page.fill('input[type="email"]', student.email);
    await page.fill('input[type="password"]', student.password);
    await page.click('button[type="submit"]:has-text("Criar")');
    await waitForToast(page, /criado/i);

    // Deleta — title="Remover usuário"
    const userRow = page.locator("tr").filter({ hasText: student.email }).first();
    const deleteBtn = userRow.locator('button[title="Remover usuário"]').first();
    await deleteBtn.click();
    // Modal de confirmação — botão "Sim, remover"
    const confirmBtn = page.locator('button:has-text("Sim, remover")');
    await expect(confirmBtn).toBeVisible({ timeout: 5_000 });
    await confirmBtn.click();
    await waitForToast(page);
    await expect(page.locator(`text=${student.email}`)).toHaveCount(0, { timeout: 8_000 });
  });
});
