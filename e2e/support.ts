import { expect, type Page } from '@playwright/test';

export interface StoredEvent {
  id: string;
  profileId: string;
  pageId?: string;
  blockId?: string;
  type: string;
  occurredAt: string;
  utm?: Record<string, string>;
}

export interface Database {
  activeProfileId: string | null;
  profiles: Array<{ id: string; username: string; published: boolean; version: number; theme?: { id?: string } }>;
  pages: Array<{ id: string; profileId: string; slug: string; published: boolean; visibility: string; version: number }>;
  blocks: Array<{ id: string; pageId: string; type: string; title?: Record<string, string>; version: number }>;
  events: StoredEvent[];
}

/** Screens are bilingual, so the suite pins the copy it asserts against. */
export const useEnglish = (page: Page) => page.addInitScript(() => {
  window.localStorage.setItem('raloa_user_locale', 'en');
});

export const database = (page: Page) =>
  page.evaluate(() => JSON.parse(window.localStorage.getItem('raloa.db.v2') ?? '{"events":[]}') as unknown);

export const signIn = async (page: Page) => {
  await page.goto('/signin');
  await page.getByLabel(/email/i).fill('qa@raloa.app');
  await page.locator('input[type="password"]').fill('raloa-qa-password');
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/studio\/overview$/);
};
