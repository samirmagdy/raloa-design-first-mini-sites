import { expect, test } from '@playwright/test';

test('the public profile fits a phone screen without horizontal overflow', async ({ page }) => {
  await page.goto('/p/elena');
  const surface = page.locator('[style*="--profile-background"]').first();
  await expect(surface).toBeVisible();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);

  // The theme paints the surface itself, so a phone shows no white band under a dark theme.
  const fills = await surface.evaluate((element) => element.getBoundingClientRect().height >= window.innerHeight - 1);
  expect(fills).toBe(true);
});

test('Arabic renders the profile right-to-left', async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem('raloa_user_locale', 'ar'));
  await page.goto('/p/elena');
  const root = page.locator('[style*="--profile-background"]').first();
  await expect(root).toBeVisible();
  await expect(root).toHaveAttribute('dir', 'rtl');
});

test('the public profile has no horizontal overflow at the 320px gate', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto('/p/elena');
  await expect(page.locator('[data-block-id]').first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});
