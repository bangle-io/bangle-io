import { expect } from '@playwright/test';

import { test } from '../../fixture-with-bangle';

test.beforeEach(async ({ bangleApp }) => {
  await bangleApp.open();
});

test('shows root error screen', async ({ bangleApp, page: oldPage }) => {
  const page = await bangleApp.open({
    debugFlags: {
      testShowAppRootSetupError: true,
    },
  });

  const heading = page.getByRole('heading', {
    name: 'Bangle.io was unable to start due to an unexpected error',
  });

  await expect(heading).toBeVisible();

  const button = page.getByRole('link', { name: 'Report this Error' });

  await expect(button).toBeVisible();

  const [githubPage] = await Promise.all([
    page.waitForEvent('popup'),
    button.click(),
  ]);

  await expect(githubPage).toHaveURL(/github\.com/);

  await githubPage.close();
  await oldPage.close();
  await page.close();
});

test('shows root react error screen', async ({ bangleApp, page: oldPage }) => {
  const page = await bangleApp.open({
    debugFlags: {
      testShowAppRootSetupError: true,
    },
  });

  const button = page.getByRole('link', { name: 'Report this Error' });

  await expect(button).toBeVisible();

  await page.close();
  await oldPage.close();
});
