import { test } from '@playwright/experimental-ct-react';

test('Submit workspace name', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: 'Acme Inc Enterprise' }).click();
  await page
    .locator('[data-radix-popper-content-wrapper]')
    .getByText('New Workspace')
    .click();

  // Select browser storage type
  await page.getByRole('radio', { name: /Browser Storage/i }).click();
  await page.getByRole('button', { name: /next/i }).click();

  // Fill workspace name
  await page.getByLabel('Workspace Name', { exact: true }).fill('test');

  await page.getByRole('button', { name: 'Create Workspace' }).click();
});
