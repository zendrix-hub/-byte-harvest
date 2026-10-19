import { expect, test, type Page } from '@playwright/test';

// Each Playwright test starts in a fresh browser context, so storage is already empty.
// (Clearing localStorage under a running app doesn't work: its pagehide save writes the state back.)
async function freshFarm(page: Page) {
  await page.goto('./');
  await expect(page.getByRole('dialog', { name: 'Almanac' })).toBeVisible();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
}

test('opens to the farm with the almanac and HUD', async ({ page }) => {
  await freshFarm(page);
  await expect(page.getByLabel('Farm', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Open almanac/ })).toContainText(/D-\d+|Festival/);
});

test('a sure-but-wrong miss plants a golden crop that survives a reload', async ({ page }) => {
  await freshFarm(page);
  await page.getByRole('button', { name: /^Pond/ }).click();
  await page.getByRole('combobox', { name: 'Paper', exact: true }).selectOption('2025S');
  await page.getByRole('combobox', { name: 'Order', exact: true }).selectOption('paper');
  await page.getByRole('combobox', { name: 'Size', exact: true }).selectOption('5');
  await page.getByRole('button', { name: 'Cast the line' }).click();
  await expect(page.getByText('(2025S, FE, Subject-A, Q1)')).toBeVisible();
  await page.getByRole('button', { name: 'b', exact: true }).click();
  await page.getByRole('button', { name: '1 · Sure' }).click();
  await page.getByRole('button', { name: 'Commit answer' }).click();
  await expect(page.getByText(/Sure but wrong/)).toBeVisible();
  await page.getByRole('button', { name: /K · Blight/ }).click();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.locator('[data-crop="paper:2025S_A_Q01"]')).toHaveCount(1);
  await page.reload();
  await expect(page.locator('[data-crop="paper:2025S_A_Q01"]')).toHaveCount(1);
});

test('no horizontal scrolling on a 360 px phone, even on a tall Subject B question', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobile', 'phone-only check');
  await freshFarm(page);
  await page.getByRole('button', { name: /^Mine/ }).click();
  await page.getByRole('combobox', { name: 'Paper', exact: true }).selectOption('2025S');
  await page.getByRole('combobox', { name: 'Order', exact: true }).selectOption('paper');
  await page.getByRole('button', { name: 'Start mining' }).click();
  const body = page.locator('.q-body');
  await expect(body).toBeVisible();
  await expect(page.getByText('(2025S, FE, Subject-B, Q1)')).toBeVisible();
  await expect(page.locator('img[src*=".webp"]')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
});
  await expect(img).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  await img.click();
  await expect(page.getByRole('dialog', { name: 'Zoomed question' })).toBeVisible();
  await page.getByRole('button', { name: 'Close zoom' }).click();
});

test('keeps the farm visible beside panels on a PC', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'desktop-only check');
  await freshFarm(page);
  await page.getByRole('button', { name: /^Pond/ }).click();
  await expect(page.getByRole('dialog', { name: 'Pond · Subject A' })).toBeVisible();
  const farm = page.getByLabel('Farm', { exact: true });
  await expect(farm).toBeVisible();
  expect((await farm.boundingBox())!.width).toBeGreaterThan(300);
});

test('works offline after the first visit', async ({ page, context }) => {
  await freshFarm(page);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByLabel('Farm', { exact: true })).toBeVisible();
  await context.setOffline(false);
});
