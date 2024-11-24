import { WorkspaceDialogRootExample } from '@bangle.io/ui-components/src/workspace-dialog.stories';
import { expect, test } from '@playwright/experimental-ct-react';
import type { Locator, Page } from '@playwright/test';
import React from 'react';

test('Submit workspace name', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: 'Acme Inc Enterprise' }).click();
  await page.getByText('New Workspace').click();

  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByLabel('Name', { exact: true }).fill('test');

  await expect(
    page.getByRole('dialog', { name: /workspace/i }),
  ).toHaveScreenshot();
  await page.getByRole('button', { name: 'Create Workspace' }).click();
});
