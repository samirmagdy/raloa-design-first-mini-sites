import { expect, test } from '@playwright/test';
import { database, signIn, useEnglish, type Database } from './support';

test.beforeEach(async ({ page }) => {
  useEnglish(page);
  await signIn(page);
});

const blockTitle = async (page: import('@playwright/test').Page, blockId: string) => {
  const db = (await database(page)) as Database;
  return db.blocks.find((block) => block.id === blockId)?.title?.en;
};

test('editing a block autosaves through the repository and survives a reload', async ({ page }) => {
  await page.goto('/studio/editor');
  await page.locator('[role="listitem"]').first().click();

  const titleField = page.locator('[aria-label$="(EN)"]').first();
  await expect(titleField).toBeVisible();
  const blockId = await page.locator('[role="listitem"]').first().getAttribute('data-block-id');
  const value = `QA ${Date.now()}`;
  await titleField.fill(value);

  await expect.poll(() => blockTitle(page, blockId ?? '')).toBe(value);

  await page.reload();
  await page.goto('/studio/editor');
  await page.locator('[role="listitem"]').first().click();
  await expect(page.locator('[aria-label$="(EN)"]').first()).toHaveValue(value);
});

test('undo reverts the last edit and the revert is persisted', async ({ page }) => {
  await page.goto('/studio/editor');
  const firstBlock = page.locator('[role="listitem"]').first();
  await firstBlock.click();
  const blockId = await firstBlock.getAttribute('data-block-id');
  const titleField = page.locator('[aria-label$="(EN)"]').first();

  const original = await blockTitle(page, blockId ?? '');
  await titleField.fill(`Replaced ${Date.now()}`);
  await expect.poll(() => blockTitle(page, blockId ?? '')).not.toBe(original);

  await page.getByRole('button', { name: /undo/i }).click();
  await expect.poll(() => blockTitle(page, blockId ?? '')).toBe(original);
});

test('a theme chosen in the editor is stored and reaches the preview screen', async ({ page }) => {
  await page.goto('/studio/theme');
  await page.getByRole('button', { name: 'midnight' }).click();
  await expect
    .poll(async () => {
      const db = (await database(page)) as Database;
      return db.profiles.find((profile) => profile.id === db.activeProfileId)?.theme?.id;
    })
    .toBe('midnight');

  await page.goto('/studio/preview');
  const surface = page.locator('[style*="--profile-background"]').first();
  await expect(surface).toBeVisible();
  await expect
    .poll(() => surface.evaluate((element) => getComputedStyle(element).backgroundColor))
    .toBe('rgb(15, 23, 42)');
});
