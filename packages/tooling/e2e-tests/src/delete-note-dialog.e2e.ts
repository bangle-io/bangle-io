import { expect, test } from '@playwright/test';
import { createBrowserWorkspaceAndNote, pressAppShortcut } from './common';

test('delete note command opens confirmation without an intermediate picker', async ({
  page,
}) => {
  const workspaceName = 'delete-note-dialog-workspace';
  await createBrowserWorkspaceAndNote(page, {
    workspaceName,
    noteName: 'delete-target',
  });

  await pressAppShortcut(page, 'k');
  await page
    .getByPlaceholder('Type a command or search...')
    .fill('Delete Note');
  await page.getByRole('option', { name: 'Delete Note' }).click();

  const confirmation = page.getByRole('alertdialog');
  await expect(confirmation).toBeVisible();
  await expect(confirmation).not.toHaveClass(/slide-in-from-left/);
  await expect(confirmation).toContainText(
    'Are you sure you want to delete "delete-target"?',
  );
  await expect(page.getByRole('dialog', { name: 'Delete Note' })).toBeHidden();
  await expect(
    confirmation.getByRole('button', { name: 'Delete' }),
  ).toBeVisible();

  await confirmation.getByRole('button', { name: 'Delete' }).click();

  const explorer = page.getByTestId('bangle-file-explorer');
  const deletedNoteTreeItem = explorer.getByRole('treeitem', {
    name: /delete-target\.md/,
  });
  await expect(deletedNoteTreeItem).toHaveCount(0);
  await expect(
    page.getByRole('heading', { name: 'Note Not Found' }),
  ).toBeVisible();

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(
    page.getByRole('heading', { name: 'Note Not Found' }),
  ).toBeVisible();
  await expect(deletedNoteTreeItem).toHaveCount(0);
});

test('move note dialog accepts directory destinations from the file tree', async ({
  page,
}) => {
  const workspaceName = 'file-modal-move-workspace';
  await createBrowserWorkspaceAndNote(page, {
    workspaceName,
    noteName: 'move-target',
  });

  await pressAppShortcut(page, 'k');
  await page.getByPlaceholder('Type a command or search...').fill('New Folder');
  await page.getByRole('option', { name: 'New Folder' }).click();

  const createDirectory = page.getByRole('dialog', {
    name: 'Create Folder',
  });
  await createDirectory.getByLabel('Folder name').fill('Projects');
  await createDirectory.getByRole('button', { name: 'Create' }).click();

  const explorer = page.getByTestId('bangle-file-explorer');
  const targetTreeItem = explorer.getByRole('treeitem', {
    name: /^move-target\.md$/,
  });
  await expect(targetTreeItem).toBeVisible();
  await expect(page.getByRole('link', { name: 'untitled-1.md' })).toBeVisible();

  const openMoveDialog = async () => {
    await targetTreeItem.click({ button: 'right' });
    await page
      .locator('[data-file-tree-context-menu-root="true"]')
      .getByRole('button', { name: 'Move' })
      .click();
  };

  await openMoveDialog();

  const moveDialog = page.getByRole('dialog', { name: 'Move "move-target"' });
  await expect(moveDialog).toBeVisible();
  await moveDialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(moveDialog).toBeHidden();
  await expect(targetTreeItem).toBeVisible();

  await openMoveDialog();
  await expect(moveDialog).toBeVisible();
  await moveDialog.getByRole('option', { name: /Projects\/?/ }).click();
  await expect(moveDialog).toBeHidden();

  const movedTreeItem = explorer
    .getByRole('treeitem', { name: /^move-target\.md$/ })
    .and(explorer.getByRole('treeitem', { level: 2 }));
  const expectedUrl = `/ws#route=editor&wsPath=${encodeURIComponent(
    `${workspaceName}:Projects/move-target.md`,
  )}`;

  // The move settles the durable store and tree props asynchronously, so open
  // the relocated note by retrying until the click actually navigates.
  await expect(async () => {
    await movedTreeItem.click();
    await expect(page).toHaveURL(expectedUrl, { timeout: 1000 });
  }).toPass();
});

test('move note dialog offers folder creation when there is no destination', async ({
  page,
}) => {
  await createBrowserWorkspaceAndNote(page, {
    workspaceName: 'move-note-empty-destination-workspace',
    noteName: 'root-note',
  });

  await pressAppShortcut(page, 'k');
  await page.getByPlaceholder('Type a command or search...').fill('Move Note');
  await page.getByRole('option', { name: 'Move Note' }).click();

  const moveDialog = page.getByRole('dialog', { name: 'Move "root-note"' });
  await expect(moveDialog).toBeVisible();
  await expect(moveDialog).toContainText('No folders to move this note into.');
  await moveDialog.getByRole('button', { name: 'Create Folder' }).click();

  await expect(moveDialog).toBeHidden();
  await expect(
    page.getByRole('dialog', { name: 'Create Folder' }),
  ).toBeVisible();
});
