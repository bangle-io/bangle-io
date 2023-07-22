import { expect } from '@playwright/test';

import { testWithConfig } from '../fixture-test-with-config';

testWithConfig.use({
  bangleDebugConfig: {
    writeSlowDown: 1211,
  },
});

testWithConfig.beforeEach(async ({ bangleApp, baseURL }, testInfo) => {
  await bangleApp.open();
});

testWithConfig(
  'loads debug value in window and worker',
  async ({ page, baseURL }) => {
    const title = await page.title();

    expect(title).toMatch('getting started.md - bangle.io');

    const writeSlowDown = await page.evaluate(() => {
      return window._nsmE2e?.config.debug?.writeSlowDown;
    }, []);

    expect(writeSlowDown).toBe(1211);

    expect(page.workers()).toHaveLength(1);
    for (const worker of page.workers()) {
      const writeSlowDown = await worker.evaluate(() => {
        const helpers = globalThis._e2eNaukarHelpers;

        return helpers?.config.debug?.writeSlowDown;
      });
      expect(writeSlowDown).toBe(1211);
    }
  },
);
