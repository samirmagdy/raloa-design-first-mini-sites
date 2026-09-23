import { expect, test } from '@playwright/test';

test('public profile text meets the rendered contrast gate', async ({ page }) => {
  await page.goto('/p/elena');
  const failures = await page.locator('body *:visible').evaluateAll((elements) => elements.flatMap((element) => {
    if (!element.textContent?.trim()) return [];
    const styles = getComputedStyle(element);
    if (Number.parseFloat(styles.fontSize) < 12) return [];
    let background = element;
    while (background && getComputedStyle(background).backgroundColor === 'rgba(0, 0, 0, 0)') background = background.parentElement as HTMLElement;
    if (!background) return [];
    const parse = (value: string) => {
      const match = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (!match) return null;
      return [Number(match[1]), Number(match[2]), Number(match[3])].map((channel) => {
        const normalized = channel / 255;
        return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
      });
    };
    const foreground = parse(styles.color);
    const backdrop = parse(getComputedStyle(background).backgroundColor);
    if (!foreground || !backdrop) return [];
    const luminance = (rgb: number[]) => 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
    const lighter = Math.max(luminance(foreground), luminance(backdrop));
    const darker = Math.min(luminance(foreground), luminance(backdrop));
    const ratio = (lighter + 0.05) / (darker + 0.05);
    return ratio !== null && ratio < 4.5 ? [{ text: element.textContent.trim().slice(0, 60), ratio }] : [];
  }));
  expect(failures).toEqual([]);
});
