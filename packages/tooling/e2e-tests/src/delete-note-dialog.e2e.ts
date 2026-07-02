import { expect, test } from '@playwright/test';
import { createBrowserWorkspaceAndNote, pressAppShortcut } from './common';

test('delete note picker opens a confirmation step before deleting', async ({
  page,
}) => {
  await createBrowserWorkspaceAndNote(page, {
    workspaceName: 'delete-note-dialog-workspace',
    noteName: 'delete-target',
  });

  await pressAppShortcut(page, 'k');
  await page
    .getByPlaceholder('Type a command or search...')
    .fill('Delete Note');
  await page.getByRole('option', { name: '> Delete Note' }).click();

  const picker = page.getByRole('dialog', { name: 'Delete Note' });
  const deleteBadge = picker.getByText('Delete Note', { exact: true });
  await expect(deleteBadge).toBeVisible();
  await expect(deleteBadge).not.toHaveClass(/text-destructive/);
  await expect(
    picker.getByText('Select a note to confirm deletion'),
  ).toBeVisible();
  await expect(page.getByRole('alertdialog')).toBeHidden();

  await page.getByRole('option', { name: 'delete-target.md' }).click();

  const confirmation = page.getByRole('alertdialog');
  await expect(confirmation).toBeVisible();
  await expect(confirmation).toContainText(
    'Are you sure you want to delete "delete-target"?',
  );
  await expect(
    confirmation.getByRole('button', { name: 'Delete' }),
  ).toBeVisible();
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
  await page
    .getByPlaceholder('Type a command or search...')
    .fill('New Directory');
  await page.getByRole('option', { name: '> New Directory' }).click();

  const createDirectory = page.getByRole('dialog', {
    name: 'Create Directory',
  });
  await createDirectory
    .getByPlaceholder('Input directory name')
    .fill('Projects');
  await createDirectory.getByRole('button', { name: 'Create' }).click();
  const targetTreeItem = page
    .locator('[data-sidebar="menu-button"]')
    .filter({ hasText: 'move-target.md' })
    .first();
  await expect(targetTreeItem).toBeVisible();
  await expect(page.getByRole('link', { name: 'untitled-1.md' })).toBeVisible();

  await targetTreeItem.hover();
  await page
    .getByRole('button', { name: 'More actions for move-target.md' })
    .click();
  await page.getByRole('menuitem', { name: 'Move' }).click();

  const moveDialog = page.getByRole('dialog', { name: 'Move "move-target"' });
  await expect(moveDialog).toBeVisible();
  await moveDialog.getByRole('option', { name: /Projects\/?/ }).click();

  await targetTreeItem.click();
  await expect(page).toHaveURL(
    `/ws#route=editor&wsPath=${encodeURIComponent(
      `${workspaceName}:Projects/move-target.md`,
    )}`,
  );
});
