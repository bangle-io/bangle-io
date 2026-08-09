import { expect, test } from '@playwright/test';
import { createBrowserWorkspaceAndNote } from './common';

test('titlebar note actions rename and safely delete the active note', async ({
  page,
}) => {
  const workspaceName = 'titlebar-note-actions-workspace';
  const sourceName = 'action-source';
  const renamedName = 'renamed-from-titlebar';
  const renamedWsPath = `${workspaceName}:${renamedName}.md`;

  await createBrowserWorkspaceAndNote(page, {
    workspaceName,
    noteName: sourceName,
  });

  const noteActions = page.getByRole('button', { name: 'Note actions' });
  await expect(noteActions).toBeVisible();
  await noteActions.click();

  const menu = page.getByRole('menu');
  await expect(menu.getByRole('menuitem')).toHaveText([
    'Rename',
    'Move',
    'Duplicate',
    'Copy Path',
    'Recover',
    'Delete',
  ]);
  await menu.getByRole('menuitem', { name: 'Rename' }).click();

  const renameDialog = page.getByRole('dialog', { name: 'Rename Note' });
  await renameDialog
    .getByRole('textbox', { name: 'New name' })
    .fill(renamedName);
  await renameDialog.getByRole('button', { name: 'Rename' }).click();

  await expect(page).toHaveURL(
    `/ws#route=editor&wsPath=${encodeURIComponent(renamedWsPath)}`,
  );
  const explorer = page.getByTestId('bangle-file-explorer');
  await expect(
    explorer.getByRole('treeitem', { name: `${renamedName}.md`, exact: true }),
  ).toBeVisible();

  await noteActions.click();
  await page.getByRole('menuitem', { name: 'Delete' }).click();

  const confirmation = page.getByRole('alertdialog');
  await expect(confirmation).toContainText(
    `Are you sure you want to delete "${renamedName}"?`,
  );
  await confirmation.getByRole('button', { name: 'Delete' }).click();

  await expect(
    explorer.getByRole('treeitem', { name: `${renamedName}.md`, exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('heading', { name: 'Note Not Found' }),
  ).toBeVisible();

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(
    page.getByRole('heading', { name: 'Note Not Found' }),
  ).toBeVisible();
});
