import { expect, test } from '@playwright/test';

import { createNewNote, createWorkspace, runOperation } from '../helpers';

test.beforeEach(async ({ page, baseURL }) => {
  await page.goto(baseURL!, { waitUntil: 'networkidle' });
});

test('reload operation', async ({ page }) => {
  const wsName = await createWorkspace(page);
  await createNewNote(page, wsName, 'test123');

  await runOperation(
    page,
    'operation::@bangle.io/core-extension:reload-application',
  );

  await page.waitForSelector('[role="alertdialog"]');

  await expect(page.locator('[role="alertdialog"] h2')).toHaveText(
    'Reload Application',
  );

  await Promise.all([
    page.waitForNavigation(),
    // Reload button should be auto focused
    page.keyboard.press('Enter'),
  ]);
});
