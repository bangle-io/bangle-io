import { expect, type Page, test } from '@playwright/test';
import { createBrowserWorkspaceAndNote, getEditorLocator } from './common';

const workspaceName = 'history-nav-ws';

function editorUrl(relativePath: string): string {
  return `/ws#route=editor&wsPath=${encodeURIComponent(
    `${workspaceName}:${relativePath}`,
  )}`;
}

async function createNoteViaDialog(page: Page, noteName: string) {
  await page.getByRole('button', { name: 'Bangle.io' }).click();
  await page.getByRole('menuitem', { name: 'New Note' }).click();
  await page.getByLabel('Note name').fill(noteName);
  await page.getByRole('button', { name: 'Create' }).click();
  await expect(getEditorLocator(page, {})).toBeVisible();
}

async function openNoteFromExplorer(page: Page, fileName: string) {
  const explorer = page.getByTestId('bangle-file-explorer');
  await explorer.getByRole('treeitem', { name: fileName }).click();
  await expect(page).toHaveURL(editorUrl(fileName));
}

// Regression: opening a note from the file explorer must create exactly one
// browser-history entry. A stale implementation re-fired the tree's "open"
// callback when the active route (and therefore the tree selection) changed
// from browser back/forward, pushing a duplicate entry that silently destroyed
// the forward stack — so Back appeared to do nothing and Forward stopped
// working.
test('browser back and forward navigate between opened notes', async ({
  page,
}) => {
  await createBrowserWorkspaceAndNote(page, {
    workspaceName,
    noteName: 'note-a',
  });
  await createNoteViaDialog(page, 'note-b');

  // Establish a clean history: A then B, each a single navigation.
  await openNoteFromExplorer(page, 'note-a.md');
  await openNoteFromExplorer(page, 'note-b.md');

  // A single Back returns to A (no phantom duplicate entry to click through).
  await page.goBack();
  await expect(page).toHaveURL(editorUrl('note-a.md'));

  // The forward entry (B) must survive — this is the core of the bug.
  await page.goForward();
  await expect(page).toHaveURL(editorUrl('note-b.md'));

  // And Back still works afterwards, proving history is not corrupted.
  await page.goBack();
  await expect(page).toHaveURL(editorUrl('note-a.md'));
});
