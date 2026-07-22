import { expect, test } from '@playwright/test';
import { createBrowserWorkspace } from './common';

test('an outdated tab is blocked with a reload prompt when a newer version runs', async ({
  page,
}) => {
  // Creating a workspace guarantees the app database connection is open.
  await createBrowserWorkspace(page, { workspaceName: 'stale-tab-ws' });

  // Simulate a tab running a newer app version: opening the app database
  // with a higher version fires `versionchange` on this tab's connection.
  await page.evaluate(() => {
    indexedDB.open('bangle-io-db', 99);
  });

  const dialog = page.getByTestId('stale-tab-dialog');
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole('button', { name: 'Reload tab' }),
  ).toBeVisible();
  // The dialog is non-dismissable: Escape must not close it.
  await page.keyboard.press('Escape');
  await expect(dialog).toBeVisible();
  // Not clicking reload here: the test bumped the database to a fake version
  // 99, so a reloaded app in this browser context could not reopen it. The
  // reload button is a plain window.location.reload().
});
