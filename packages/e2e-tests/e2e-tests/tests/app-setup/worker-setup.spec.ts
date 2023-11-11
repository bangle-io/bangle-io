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
      return window._nsmE2e.naukar.ok();
    }),
  ).toBe(true);
});

test('worker gets debug flags', async ({ bangleApp, page: oldPage }) => {
  const page = await bangleApp.open({
    debugFlags: {
      testNoOp: true,
    },
  });

  expect(
    await page.evaluate(() => {
      return window._nsmE2e.naukar.getDebugFlags();
    }),
  ).toEqual({ testNoOp: true });

  await oldPage.close();
  await page.close();
});

test('worker gets debug flags with delay', async ({
  bangleApp,
  page: oldPage,
}) => {
  const page = await bangleApp.open({
    debugFlags: {
      testNoOp: true,
      testDelayWorkerInitialize: 100,
    },
  });

  expect(
    await page.evaluate(() => {
      return window._nsmE2e.naukar.getDebugFlags();
    }),
  ).toEqual({ testNoOp: true, testDelayWorkerInitialize: 100 });

  await oldPage.close();
  await page.close();
});
