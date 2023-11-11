import { expect } from '@playwright/test';

import { test } from '../../fixture-with-bangle';

test.beforeEach(async ({ bangleApp }) => {
  await bangleApp.open();
});

test('shows error screen', async ({ bangleApp, page: oldPage }) => {
  const page = await bangleApp.open({
    debugFlags: {
      testShowAppRootError: true,
    },
  });

  const heading = page.getByRole('heading', {
    name: 'Bangle.io was unable to start due to an unexpected error',
  });

  await expect(heading).toBeVisible();

  const button = page.getByRole('link', { name: 'Report this Error' });

  await expect(button).toBeVisible();

  const [newPage] = await Promise.all([
    page.waitForEvent('popup'),
    button.click(),
  ]);

  await expect(newPage).toHaveURL(/github\.com/);

  await newPage.close();
  await oldPage.close();
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
