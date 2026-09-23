import { expect, test } from '@playwright/test';
import { database, signIn, useEnglish, type Database } from './support';

test.beforeEach(({ page }) => useEnglish(page));

const countEvents = async (page: import('@playwright/test').Page, predicate: (event: Database['events'][number]) => boolean) => {
  const db = (await database(page)) as Database;
  return db.events.filter(predicate).length;
};

test('the landing page renders without script errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  expect(errors).toEqual([]);
});

test('a visit records a view, a campaign attribution and a per-block click', async ({ page }) => {
  await page.goto('/p/elena?utm_source=newsletter&utm_campaign=autumn');
  const block = page.locator('[data-block-id] a[href]').first();
  await expect(block).toBeVisible();

  await expect
    .poll(() => countEvents(page, (event) => event.type === 'view' && event.profileId === 'profile-elena' && event.utm?.source === 'newsletter'))
    .toBeGreaterThan(0);

  const clicksBefore = await countEvents(page, (event) => event.type === 'click' && event.profileId === 'profile-elena');
  await block.click();

  await expect
    .poll(() => countEvents(page, (event) => event.type === 'click' && !!event.blockId))
    .toBeGreaterThan(clicksBefore);
});

test('studio navigation swaps the screen without reloading the document', async ({ page }) => {
  await signIn(page);
  await page.evaluate(() => {
    (window as unknown as { __raloaDocumentMarker: string }).__raloaDocumentMarker = 'alive';
  });

  await page.getByRole('navigation').first().getByRole('button', { name: /editor/i }).click();

  await expect(page).toHaveURL(/\/studio\/editor$/);
  await expect(page.locator('[role="listitem"]').first()).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { __raloaDocumentMarker?: string }).__raloaDocumentMarker)).toBe('alive');
});

test('management tools use the authenticated repository surface', async ({ page }) => {
  await signIn(page);
  await page.goto('/manage/qr');
  await expect(page.getByRole('heading', { name: /QR & sharing/i })).toBeVisible();
  await expect(page.locator('img[alt*="QR code"]')).toBeVisible();
  await page.getByRole('button', { name: /API keys/i }).click();
  await expect(page.getByRole('heading', { name: /API keys/i }).first()).toBeVisible();
});

test('unknown routes render the not-found screen', async ({ page }) => {
  await page.goto('/definitely-not-a-page');
  await expect(page).toHaveTitle(/404/);
  await expect(page.getByRole('heading').first()).toBeVisible();
});
