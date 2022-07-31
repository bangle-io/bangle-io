import { expect } from '@playwright/test';

import { test } from '../test-extension';

test.use({
  bangleDebugConfig: {
    writeSlowDown: 1211,
  },
});

test.beforeEach(async ({ page, baseURL }, testInfo) => {
  await page.goto(baseURL!, { waitUntil: 'networkidle' });
});

test('loads debug value in window and worker', async ({ page, baseURL }) => {
  const title = await page.title();

  expect(title).toMatch('getting started.md - bangle.io');

  const writeSlowDown = await page.evaluate(() => {
    const _newE2eHelpers2 = window._newE2eHelpers2;

    return _newE2eHelpers2?.config.debug?.writeSlowDown;
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
});
