import type { RawDebugConfig } from '@bangle.io/config-template';
import { BangleConfig } from '@bangle.io/config-template';

import { withBangle } from './fixture-with-bangle';

export type TestCustomOptions = {
  bangleDebugConfig: Partial<RawDebugConfig>;
};

export type TestFixtures = {
  injectConfig: void;
};

const defaultBangleDebugConfig: Partial<RawDebugConfig> = {};

// TODO fixtures are a great way to improve test quality.
export const testWithConfig = withBangle.extend<
  TestCustomOptions & TestFixtures
>({
  bangleDebugConfig: [defaultBangleDebugConfig, { option: true }],
  // This fixture injects a custom debug configuration to alter the behaviour
  // of the application during tests.
  injectConfig: [
    async ({ page, bangleDebugConfig }, use) => {
      // This works directly by replacing the magic word in the source code.
      // Yes it is a bit of a hack, but is the only way (I found) to provide a config
      // during the runtime for a worker and window.
      await page.route('**/*.js', async (route) => {
        const response = await page.request.fetch(route.request());

        let body = await response.text();

        if (Object.keys(bangleDebugConfig).length > 0) {
          let config = new BangleConfig({
            debug: bangleDebugConfig,
          });

          const stringMatch = 'globalThis.__BANGLE_INJECTED_CONFIG__';

          body = body.replace(stringMatch, JSON.stringify(config.serialize()));
        }

        route.fulfill({
          status: response.status(),
          response,
          body,
        });
      });
      await use();
    },
    { auto: true, scope: 'test' },
  ],
});
