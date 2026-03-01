import { test, expect } from '@playwright/test';

// E2E test for authentication flow
// Requires both backend (port 8000) and frontend (port 3000) running

test.describe('Authentication Flow', () => {
  const testEmail = `e2e_${Date.now()}@test.com`;
  const testPassword = 'Test123456';
  const testName = 'E2E Test User';

  test('should show login screen on first visit', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByPlaceholderText('seu@email.com')).toBeVisible();
  });

  test('should register a new user', async ({ page }) => {
    await page.goto('/');
    // Click on register tab
    const registerBtn = page.getByRole('button', { name: /cadastrar/i });
    await registerBtn.first().click();
    // Fill form
    await page.getByPlaceholderText('Seu nome completo').fill(testName);
    await page.getByPlaceholderText('seu@email.com').fill(testEmail);
    const passwordFields = page.getByPlaceholderText('••••••••');
    await passwordFields.first().fill(testPassword);
    // If confirm password field exists
    if (await passwordFields.nth(1).isVisible()) {
      await passwordFields.nth(1).fill(testPassword);
    }
    // Submit
    await page.getByRole('button', { name: /cadastrar|criar/i }).first().click();
    // Should redirect to dashboard or show success
    await expect(page.getByText(/dashboard|projetos|bem-vindo/i)).toBeVisible({ timeout: 10000 });
  });

  test('should login with existing user', async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholderText('seu@email.com').fill(testEmail);
    await page.getByPlaceholderText('••••••••').first().fill(testPassword);
    await page.getByRole('button', { name: /entrar/i }).first().click();
    await expect(page.getByText(/dashboard|projetos/i)).toBeVisible({ timeout: 10000 });
  });
});
