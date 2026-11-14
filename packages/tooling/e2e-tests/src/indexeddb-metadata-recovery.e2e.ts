import { expect, test } from '@playwright/test';
import {
  createBrowserWorkspaceAndNote,
  getEditorLocator,
  readStoredMarkdown,
} from './common';

test('notes remain editable and follow durable renames when metadata storage fails', async ({
  page,
}) => {
  // Fail only the auxiliary timestamp database, leaving the actual file
  // database usable throughout creation, autosave, rename, and reload.
  await page.addInitScript(() => {
    const transaction = IDBDatabase.prototype.transaction;
    IDBDatabase.prototype.transaction = function (storeNames, mode, options) {
      if (this.name === 'baby-idb-meta-3') {
        throw new DOMException(
          'Injected metadata storage failure',
          'QuotaExceededError',
        );
      }
      return transaction.call(this, storeNames, mode, options);
    };
  });

  const workspaceName = 'metadata-storage-recovery';
  await createBrowserWorkspaceAndNote(page, {
    workspaceName,
    noteName: 'source',
  });
  const editor = getEditorLocator(page, {});
  await expect(editor).toHaveAttribute('contenteditable', 'true');
  await editor.fill('Content saved while metadata is unavailable');
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, 'source'))
    .toContain('Content saved while metadata is unavailable');

  const explorer = page.getByTestId('bangle-file-explorer');
  await explorer
    .getByRole('treeitem', { name: 'source.md', exact: true })
    .click({ button: 'right' });
  await page
    .locator('[data-file-tree-context-menu-root="true"]')
    .getByRole('button', { name: 'Rename' })
    .click();
  const dialog = page.getByRole('dialog', { name: 'Rename Note' });
  const name = dialog.getByRole('textbox', { name: 'New name' });
  await name.fill('renamed');
  await name.press('Enter');

  await expect(dialog).toHaveCount(0);
  await expect(page).toHaveURL(
    `/ws#route=editor&wsPath=${encodeURIComponent(`${workspaceName}:renamed.md`)}`,
  );
  await expect(
    explorer.getByRole('treeitem', { name: 'source.md', exact: true }),
  ).toHaveCount(0);
  await expect(
    explorer.getByRole('treeitem', { name: 'renamed.md', exact: true }),
  ).toBeVisible();
  await expect(editor).toHaveAttribute('contenteditable', 'true');
  await editor.fill('Renamed note can still save new content');
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, 'renamed'))
    .toContain('Renamed note can still save new content');
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, 'source'))
    .toBeUndefined();

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(editor).toHaveAttribute('contenteditable', 'true');
  await expect(editor).toContainText('Renamed note can still save new content');
  await expect(page.getByRole('button', { name: 'Retry save' })).toHaveCount(0);
});
