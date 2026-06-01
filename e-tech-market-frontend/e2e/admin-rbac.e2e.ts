import { test, expect } from '@playwright/test';

test.describe('Admin RBAC E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/v1/store/config', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ maintenance_mode: false, chat: { service: 'none' } }),
      });
    });
  });

  test('redirects to login when accessing admin without auth', async ({ page }) => {
    // Mock unauthenticated /api/me
    await page.route('**/api/v1/me', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Unauthenticated.' }),
      });
    });

    await page.goto('/admin');
    
    // Should be redirected to /login
    await expect(page).toHaveURL(/\/login/);
  });

  test('redirects to login when accessing admin with customer role', async ({ page }) => {
    // Mock authenticated /api/me but customer role
    await page.route('**/api/v1/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 1,
          email: 'customer@example.com',
          roles: [{ slug: 'customer' }]
        }),
      });
    });

    await page.goto('/admin');
    
    // Should be redirected to /login because they are not staff/admin
    await expect(page).toHaveURL(/\/login/);
  });

  test('allows access when user has admin role', async ({ page }) => {
    // Mock authenticated /api/me with admin role
    await page.route('**/api/v1/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 1,
          email: 'admin@example.com',
          roles: [{ slug: 'admin' }]
        }),
      });
    });

    // Mock some common admin APIs to prevent failures during render
    await page.route('**/api/v1/admin/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [] }),
      });
    });
    
    // Additional general mock for other API calls to ensure no network errors interrupt test
    await page.route('**/api/v1/**', async (route, request) => {
      if (!request.url().includes('/me') && !request.url().includes('/store/config')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: [] }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/admin');
    
    // Should stay on /admin (or a subpath like /admin/dashboard)
    await expect(page).toHaveURL(/\/admin/);
  });
});
