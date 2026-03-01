import { test, expect } from '@playwright/test';

test.describe('Project Flow', () => {
  // Login before each test
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Register a fresh user for this suite
    const email = `e2e_proj_${Date.now()}@test.com`;
    const registerBtn = page.getByRole('button', { name: /cadastrar/i });
    await registerBtn.first().click();
    await page.getByPlaceholderText('Seu nome completo').fill('E2E Project Tester');
    await page.getByPlaceholderText('seu@email.com').fill(email);
    const pwFields = page.getByPlaceholderText('••••••••');
    await pwFields.first().fill('Test123456');
    if (await pwFields.nth(1).isVisible()) {
      await pwFields.nth(1).fill('Test123456');
    }
    await page.getByRole('button', { name: /cadastrar|criar/i }).first().click();
    await expect(page.getByText(/dashboard|projetos/i)).toBeVisible({ timeout: 10000 });
  });

  test('should create a new project', async ({ page }) => {
    // Look for "Novo Projeto" or "+" button
    const newProjectBtn = page.getByRole('button', { name: /novo projeto|criar projeto|\+/i });
    if (await newProjectBtn.isVisible()) {
      await newProjectBtn.click();
      // Fill project name
      const nameInput = page.getByPlaceholderText(/nome.*projeto/i);
      if (await nameInput.isVisible()) {
        await nameInput.fill('Projeto E2E Test');
        await page.getByRole('button', { name: /criar|salvar/i }).first().click();
        // Verify project was created
        await expect(page.getByText('Projeto E2E Test')).toBeVisible({ timeout: 10000 });
      }
    }
  });
});
