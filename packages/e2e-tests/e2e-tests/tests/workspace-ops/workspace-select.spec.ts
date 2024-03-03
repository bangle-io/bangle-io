import { expect, Page } from '@playwright/test';

import { test } from '../../fixture-with-bangle';
import { sleep } from '../utils';

test.beforeEach(async ({ bangleApp }) => {
  await bangleApp.open();
});

async function createWorkspace(
  page: Page,
  {
    wsName,
  }: {
    wsName: string;
  },
) {
  await page.getByRole('button', { name: 'New Workspace' }).click();
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

  await page.getByText('next').click();

  await page.getByLabel('Workspace Name').fill(wsName);

  await page.getByRole('button', { name: 'Create' }).click();

  await expect(page.getByRole('heading', { name: wsName })).toBeVisible();
}

test('create workspace', async ({ page }) => {
  const wsName = 'test-ws-1';
  await createWorkspace(page, { wsName });

  await page.getByRole('heading', { name: wsName }).click();

  await expect(page).toHaveURL(new RegExp(`ws/${wsName}`));
});

test('delete workspace', async ({ page }) => {
  const wsName = 'test-ws-1';

  await createWorkspace(page, { wsName });

  await page.getByRole('button', { name: 'Workspace Options' }).click();

  await page.getByRole('menuitem', { name: 'Delete' }).click();

  await page.getByRole('button', { name: 'Confirm Delete' }).click();

  await expect(page.getByRole('heading', { name: wsName })).not.toBeVisible();
});
