import { test, expect } from '@playwright/test';

test.describe('E-Tech Market Basic Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/v1/store/config', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ maintenance_mode: false, chat: { service: 'none' } }),
      })
    });

    await page.route('**/api/v1/me', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Unauthenticated.' }),
      })
    });
  });

  test('homepage loads and shows products', async ({ page }) => {
    // Navigate to homepage
    await page.goto('/');

    // Expect the page to have a title (adjust to your actual title)
    await expect(page).toHaveTitle(/E-Tech/i);

    // Ensure the main navigation is visible
    await expect(page.locator('nav')).toBeVisible();

    // Since products might load asynchronously, wait for the product grid or skeleton
    // This is a basic check. You can expand this to test "Add to cart" etc.
  });

  test('login modal can be opened', async ({ page }) => {
    await page.goto('/');

    // Example: Click the login button (adjust selector based on your UI)
    // await page.click('button:has-text("Đăng nhập")');
    // await expect(page.locator('form:has-text("Email")')).toBeVisible();
  });
});
