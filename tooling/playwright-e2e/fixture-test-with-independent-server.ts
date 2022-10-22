import type { Page } from '@playwright/test';
import { test as base } from '@playwright/test';

interface Fixture {
  packageName: `@bangle.io/${string}`;
  independent: {
    open: () => Promise<Page>;
  };
}
export const testWithIndependentServer = base.extend<Fixture>({
  packageName: '@bangle.io/<fill_me_with_test.use()>',
  independent: [
    async ({ page, baseURL, packageName }, use) => {
      await use({
        open: async () => {
          await page.goto(`localhost:1235/${packageName}`, {
            waitUntil: 'networkidle',
          });

          return page;
        },
      });
    },
    { auto: false, scope: 'test' },
  ],
});
