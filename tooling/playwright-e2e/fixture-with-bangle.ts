import type { Page } from '@playwright/test';
import { test as base } from '@playwright/test';

export interface Fixture {
  bangleApp: {
    open: (opts?: {}) => Promise<Page>;
  };
}
export const withBangle = base.extend<Fixture>({
  baseURL: 'http://localhost:1234',
  bangleApp: [
    async ({ page, baseURL }, use) => {
      await use({
        open: async (opts = {}) => {
          await page.goto(`localhost:1234`, {
            waitUntil: 'networkidle',
          });

          return page;
        },
      });
    },
    { auto: false, scope: 'test' },
  ],
});
