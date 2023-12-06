import { expect } from '@playwright/test';

import { test } from '../../fixture-with-bangle';
import { sleep } from '../utils';

test.beforeEach(async ({ bangleApp }) => {
  await bangleApp.open();
});

test('select correct workspace type', async ({ page }) => {
  await page.getByRole('button', { name: 'New' }).click();
  await expect(page.getByText('Local File Storage')).toBeVisible();

  const selected = page.locator('[aria-selected="true"]');

  expect(await selected.getAttribute('data-key')).toBe('nativefs');

  const browserStorageLocator = page.getByText('Browser Storage', {
    exact: true,
  });

  await expect(browserStorageLocator).toBeVisible();

  await browserStorageLocator.click();

  await expect(selected).toBeVisible();

  expect(await selected.getAttribute('data-key')).toBe('browser');
});
