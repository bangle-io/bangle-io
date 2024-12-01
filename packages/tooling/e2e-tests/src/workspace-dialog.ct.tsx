import stories from '@bangle.io/ui-components/src/workspace-dialog.stories.portable';
import { test as base, expect } from '@playwright/experimental-ct-react';
import { createTest } from '@storybook/react/experimental-playwright';
import React from 'react';
const test = createTest(base);

test('Default', async ({ mount, page }) => {
  await mount(<stories.Default />);

  await page.getByRole('button', { name: /Local File Storage/i }).click();
  await page.getByRole('button', { name: /next/i }).click();
  await expect(page).toHaveScreenshot({
    maxDiffPixelRatio: 0.01,
  });
});

test('Error', async ({ mount, page }) => {
  await mount(<stories.NativeFsError />);

  await page.getByRole('button', { name: /Local File Storage/i }).click();
  await page.getByRole('button', { name: /next/i }).click();

  await page.getByRole('button', { name: /Pick/i }).click();

  const dialog = page.getByLabel('Select Directory');
  expect(dialog).toContainText('Failed to access directory.');
  await expect(dialog).toHaveScreenshot({
    maxDiffPixelRatio: 0.01,
  });
});
