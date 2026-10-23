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

test('keeps the farm visible beside panels on a PC', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'desktop-only check');
  await freshFarm(page);
  await page.getByRole('button', { name: /^Pond/ }).click();
  await expect(page.getByRole('dialog', { name: 'Pond · Subject A' })).toBeVisible();
  const farm = page.getByLabel('Farm', { exact: true });
  await expect(farm).toBeVisible();
  expect((await farm.boundingBox())!.width).toBeGreaterThan(300);
});

/** Answers whatever check type is on screen; correctness doesn't matter here, only completeness. */
async function answerCheck(page: Page) {
  if (await page.locator('.chk-mcq').count()) {
    await page.locator('.chk-mcq-opt').first().click();
  } else if (await page.locator('.chk-numeric').count()) {
    await page.getByLabel('Answer', { exact: true }).fill('1');
  } else if (await page.locator('.chk-match').count()) {
    const rows = page.locator('.chk-match-row');
    const n = await rows.count();
    for (let i = 0; i < n; i++) await rows.nth(i).locator('.chk-chip').first().click();
  } else if (await page.locator('.chk-bucket').count()) {
    const rows = page.locator('.chk-bucket-row');
    const n = await rows.count();
    for (let i = 0; i < n; i++) await rows.nth(i).locator('.chk-seg-opt').first().click();
  } else if (await page.locator('.chk-order').count()) {
    const n = await page.locator('.chk-order-opt').count();
    for (let i = 0; i < n; i++) await page.locator('.chk-order-opt').first().click();
  }
}

/** Steps through hook → model → worked example → every check (answered Sure) → summary. */
async function stepThroughLesson(page: Page) {
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  while (await page.getByRole('button', { name: 'Next step' }).isVisible()) {
    await page.getByRole('button', { name: 'Next step' }).click();
  }
  await page.getByRole('button', { name: 'Start checks' }).click();
  for (;;) {
    await answerCheck(page);
    await page.getByRole('button', { name: 'Sure', exact: true }).click();
    await page.getByRole('button', { name: 'Check', exact: true }).click();
    const seeSummary = page.getByRole('button', { name: 'See summary' });
    if (await seeSummary.isVisible()) {
      await seeSummary.click();
      break;
    }
    await page.getByRole('button', { name: 'Next check' }).click();
  }
}

test('learns a seed packet and plants a concept crop', async ({ page }) => {
  await freshFarm(page);
  await expect(page.getByRole('button', { name: /^Market Garden: 0 crops/ })).toBeVisible();
  await page.getByRole('button', { name: /^Town/ }).click();
  await expect(page.getByRole('dialog', { name: 'Town', exact: true })).toBeVisible();
  await page.locator('.packet-row').first().click();
  await stepThroughLesson(page);
  await expect(page.locator('.summary-big')).toBeVisible();
  await page.getByRole('button', { name: 'Back to the farm' }).click();
  await expect(page.getByRole('button', { name: /^Market Garden: 1 crops/ })).toBeVisible();
});

test('lesson fits a 360 px phone', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobile', 'phone-only check');
  await freshFarm(page);
  await page.getByRole('button', { name: /^Town/ }).click();
  await page.locator('.packet-row', { hasText: 'Benchmarking' }).click();
  expect(await page.evaluate(() => document.scrollingElement!.scrollWidth)).toBeLessThanOrEqual(360);
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  while (await page.getByRole('button', { name: 'Next step' }).isVisible()) {
    await page.getByRole('button', { name: 'Next step' }).click();
  }
  await page.getByRole('button', { name: 'Start checks' }).click();
  await expect(page.locator('.chk-match')).toBeVisible();
  expect(await page.evaluate(() => document.scrollingElement!.scrollWidth)).toBeLessThanOrEqual(360);
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
