import { expect, test } from '@playwright/test';

test('creates a browser workspace from the workspace selector dialog', async ({
  page,
}) => {
  const workspaceName = `dialog-workspace-${Date.now()}`;

  await page.goto('/');

  await page.getByRole('button', { name: 'No workspace selected' }).click();
  await page.getByRole('menuitem', { name: 'New Workspace' }).click();
  await expect(
    page.getByRole('dialog', { name: 'Select a workspace type' }),
  ).toBeVisible();
  await expect(
    page.getByText('Choose where this workspace stores its notes.'),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(
    page.getByRole('dialog', { name: 'Select a workspace type' }),
  ).toBeHidden();

  await page.getByRole('button', { name: 'No workspace selected' }).click();
  await page.getByRole('menuitem', { name: 'New Workspace' }).click();

  await page
    .getByRole('radio', { name: 'Browser Save workspace data' })
    .click();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByLabel('Workspace Name', { exact: true }).fill(workspaceName);
  await page.getByRole('button', { name: 'Create' }).click();

  await expect(
    page.getByRole('heading', { name: workspaceName }),
  ).toBeVisible();

  await page.reload();

  await expect(
    page.getByRole('button', { name: `${workspaceName} browser` }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: workspaceName }),
  ).toBeVisible();
});
