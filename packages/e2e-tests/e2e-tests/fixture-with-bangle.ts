import type { Page } from '@playwright/test';
import { test as base } from '@playwright/test';

const PORT = 1234;

export interface Fixture {
  bangleApp: {
    open: (opts?: unknown) => Promise<Page>;
  };
}
export const withBangle = base.extend<Fixture>({
  baseURL: `http://localhost:${PORT}`,
  bangleApp: [
    async ({ page, baseURL }, use) => {
      await use({
        open: async (opts = {}) => {
          await page.goto(`localhost:${PORT}`, {
            waitUntil: 'networkidle',
          });

          return page;
        },
      });
    },
    { auto: false, scope: 'test' },
  ],
});

export const test = withBangle;
