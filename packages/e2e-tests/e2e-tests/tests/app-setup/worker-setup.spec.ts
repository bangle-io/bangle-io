import { expect } from '@playwright/test';

import { test } from '../../fixture-with-bangle';

test.beforeEach(async ({ bangleApp }) => {
  await bangleApp.open();
});

test('creates worker thread', async ({ page }) => {
  expect(page.workers()).toHaveLength(1);
});

test('is worker ready', async ({ page }) => {
  expect(
    await page.evaluate(() => {
      return window._nsmE2e.naukar.isReady();
    }),
  ).toBe(true);
});
