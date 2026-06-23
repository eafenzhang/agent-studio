import { test, expect } from '@playwright/test';

test('home page loads', async ({ page }) => {
  await page.goto('http://localhost:5174');
  await expect(page.locator('text=Agent Studio')).toBeVisible();
});

test('can navigate to settings', async ({ page }) => {
  await page.goto('http://localhost:5174');
  const settingsButton = page.locator('[aria-label="设置"]');
  if (await settingsButton.isVisible()) {
    await settingsButton.click();
    await expect(page.locator('text=系统设置')).toBeVisible();
  }
});

test('sidebar navigation works', async ({ page }) => {
  await page.goto('http://localhost:5174');
  // Navigate to experts page
  const expertsLink = page.locator('text=专家');
  if (await expertsLink.isVisible()) {
    await expertsLink.click();
    await expect(page.locator('text=专家')).toBeVisible();
  }
});

test('chat page accessible', async ({ page }) => {
  await page.goto('http://localhost:5174/chat/test-id');
  await expect(page.locator('text=暂无消息')).toBeVisible();
});
