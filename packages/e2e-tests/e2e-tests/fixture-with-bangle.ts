import type { Page } from '@playwright/test';
import { test as base } from '@playwright/test';

import { DebugFlags } from '@bangle.io/shared-types';

const PORT = 1234;

export interface Fixture {
  bangleApp: {
    open: (opts?: { debugFlags?: DebugFlags }) => Promise<Page>;
  };
}
export const withBangle = base.extend<Fixture>({
  baseURL: `http://localhost:${PORT}`,
  bangleApp: [
    async ({ page, baseURL }, use) => {
      await use({
        open: async (opts = {}) => {
          let queryParams: string | undefined;
          if (opts.debugFlags) {
            const params = new URLSearchParams();
            params.set('debug_flags', JSON.stringify(opts.debugFlags));

            queryParams = params.toString();
          }

          const path =
            `localhost:${PORT}` + (queryParams ? `?${queryParams}` : '');

          await page.goto(path, {
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
