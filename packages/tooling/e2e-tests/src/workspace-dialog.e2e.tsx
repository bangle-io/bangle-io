import { expect, test } from '@playwright/test';

test('Submit workspace name', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: 'No workspace selected' }).click();
  await page
    .locator('[data-radix-popper-content-wrapper]')
    .getByText('New Workspace')
    .click();
  await expect(
    page.getByRole('dialog', { name: 'Select a workspace type' }),
  ).not.toHaveClass(/slide-in-from-left/);
  await expect(
    page.getByText('Choose where this workspace stores its notes.'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(
    page.getByRole('dialog', { name: 'Select a workspace type' }),
  ).toBeHidden();

  await page.getByRole('button', { name: 'No workspace selected' }).click();
  await page
    .locator('[data-radix-popper-content-wrapper]')
    .getByText('New Workspace')
    .click();

  // Select browser storage type
  await page.getByRole('radio', { name: /Browser Storage/i }).click();
  await page.getByRole('button', { name: /next/i }).click();

  // Fill workspace name
  await page.getByLabel('Workspace Name', { exact: true }).fill('test');

  await page.getByRole('button', { name: 'Create' }).click();
});
