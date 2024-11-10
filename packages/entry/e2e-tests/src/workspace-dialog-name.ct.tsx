import { WorkspaceDialogNameExample } from '@bangle.io/ui-components/src/workspace-dialog-name.stories';
import { expect, test } from '@playwright/experimental-ct-react';
import type { Locator, Page } from '@playwright/test';
import React from 'react';

test('Submit workspace name', async ({ mount, page }) => {
  await mount(<WorkspaceDialogNameExample />);
  await page
    .getByRole('button', { name: 'Open Workspace Dialog Name' })
    .click();

  await page.getByLabel('Name', { exact: true }).click();
  await page.getByLabel('Name', { exact: true }).fill('My Workspace');
  await expect(page.getByLabel('Name', { exact: true })).toHaveValue(
    'My Workspace',
  );

  await expect(page).toHaveScreenshot();
});
