import stories from '@bangle.io/ui-components/src/workspace-dialog.stories.portable';
import { test as base, expect } from '@playwright/experimental-ct-react';
import { createTest } from '@storybook/react/experimental-playwright';
import React from 'react';
const test = createTest(base);

test('Default dialog shows storage options and navigates', async ({
  mount,
  page,
}) => {
  await mount(<stories.Default />);
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Select a workspace type');

  // Test browser storage back button
  await page.getByRole('radio', { name: /Browser Storage/i }).click();
  await page.getByRole('button', { name: /next/i }).click();
  await page.getByRole('button', { name: /back/i }).click();
  await expect(dialog).toContainText('Select a workspace type');

  // Test native fs storage back button
  await page.getByRole('radio', { name: /Local File Storage/i }).click();
  await page.getByRole('button', { name: /next/i }).click();
  await page.getByRole('button', { name: /back/i }).click();
  await expect(dialog).toContainText('Select a workspace type');

  // Complete the flow
  await page.getByRole('radio', { name: /Browser Storage/i }).click();
  await page.getByRole('button', { name: /next/i }).click();
  await page.getByLabel('Workspace Name', { exact: true }).fill('my_workspace');
  await page.getByRole('button', { name: 'Create Workspace' }).click();
  await expect(page).toHaveScreenshot();
});

test('NativeFs dialog shows directory picker and navigates', async ({
  mount,
  page,
}) => {
  await mount(<stories.NativeFs />);
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Select a workspace type');

  await page.getByRole('radio', { name: /Local File Storage/i }).click();
  await page.getByRole('button', { name: /next/i }).click();

  // Test directory picking
  await page.getByRole('button', { name: /Pick Directory/i }).click();
  await expect(page.getByText('MyDirectory')).toBeVisible();

  // Test clear functionality
  await page.getByRole('button', { name: 'Clear' }).click();
  await expect(page.getByText('MyDirectory')).not.toBeVisible();
  await expect(
    page.getByRole('button', { name: /Pick Directory/i }),
  ).toBeVisible();

  // Pick directory again and create workspace
  await page.getByRole('button', { name: /Pick Directory/i }).click();
  await expect(page.getByText('MyDirectory')).toBeVisible();
  await page.getByRole('button', { name: 'Create Workspace' }).click();

  await expect(page).toHaveScreenshot();
});

test('NativeFs shows error when directory pick fails', async ({
  mount,
  page,
}) => {
  await mount(<stories.NativeFsError />);
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();

  await page.getByRole('radio', { name: /Local File Storage/i }).click();
  await page.getByRole('button', { name: /next/i }).click();

  await page.getByRole('button', { name: /Pick Directory/i }).click();
  await expect(page.getByText(/Failed to access directory/i)).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Create Workspace' }),
  ).toBeDisabled();
});

test('Shows error for invalid workspace name', async ({ mount, page }) => {
  await mount(<stories.InvalidWsName />);
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();

  await page.getByRole('radio', { name: /Browser Storage/i }).click();
  await page.getByRole('button', { name: /next/i }).click();

  await page.getByLabel('Workspace Name', { exact: true }).fill('invalid@name');
  await page.getByRole('button', { name: /Create Workspace/i }).click();

  await expect(page.getByText(/contains invalid characters/i)).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Create Workspace' }),
  ).toBeDisabled();
});
