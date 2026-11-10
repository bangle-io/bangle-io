import { expect, test } from '@playwright/test';
import { createBrowserWorkspaceAndNote } from './common';

// The browser tab/window title names the open note and workspace, so several
// Bangle tabs can be told apart.
test('document title follows the open note and workspace', async ({ page }) => {
  await createBrowserWorkspaceAndNote(page, {
    workspaceName: 'title-ws',
    noteName: 'Groceries',
  });
  await expect(page).toHaveTitle('Groceries.md - title-ws - Bangle.io');

  // The title is derived from the URL, so it survives a reload.
  await page.reload();
  await expect(page).toHaveTitle('Groceries.md - title-ws - Bangle.io');

  // From the note, the header's first link goes to the workspace home...
  await page.getByRole('link', { name: 'Home' }).click();
  await expect(page).toHaveURL(/#route=ws-home\b/);
  await expect(page).toHaveTitle('title-ws - Bangle.io');

  // ...and from there to the app home.
  await page.getByRole('link', { name: 'Home' }).click();
  await expect(page).not.toHaveURL(/route=ws-home|wsName=|wsPath=/);
  await expect(page).toHaveTitle('Bangle.io');
});
