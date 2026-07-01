import { expect, test } from '@playwright/test';
import {
  clearEditor,
  createBrowserWorkspace,
  getEditorLocator,
  getEditorText,
  readStoredMarkdown,
} from './common';

test('file explorer creates folders, searches files, opens notes, and survives reload', async ({
  page,
}) => {
  const workspaceName = `explorer-${Date.now()}`;
  await createBrowserWorkspace(page, { workspaceName });

  const explorer = page.getByTestId('bangle-file-explorer');
  await expect(explorer).toBeVisible();

  await test.step('create a folder from the explorer root action', async () => {
    await explorer.getByLabel('New Folder').click();
    await page.getByPlaceholder('Input directory name').fill('docs');
    await page.getByRole('option', { name: 'Create' }).click();

    await expect(
      page
        .getByLabel('breadcrumb')
        .getByRole('button', { name: 'untitled-1.md' }),
    ).toBeVisible();
  });

  await test.step('create a named nested note through the existing dialog', async () => {
    await page.getByRole('button', { name: 'Bangle.io' }).click();
    await page.getByRole('menuitem', { name: 'New Note' }).click();
    await page.getByPlaceholder('Input a note name').fill('docs/alpha');
    await page.getByRole('option', { name: 'Create' }).click();

    const editor = getEditorLocator(page, {});
    await expect(editor).toBeVisible();
    await editor.click();
    await clearEditor(page, {});
    await editor.pressSequentially('Alpha explorer content', { delay: 10 });
    await expect
      .poll(() => getEditorText(page, {}))
      .toBe('Alpha explorer content');
  });

  await test.step('create a sibling note from the directory context menu', async () => {
    await explorer.getByRole('treeitem', { name: /^docs$/ }).focus();
    await page.keyboard.press('Shift+F10');
    await page.getByRole('button', { name: 'New Note Here' }).click();

    await expect(
      page
        .getByLabel('breadcrumb')
        .getByRole('button', { name: 'untitled-2.md' }),
    ).toBeVisible();
  });

  await test.step('create a second root folder for drag-and-drop moves', async () => {
    await explorer.getByLabel('New Folder').click();
    await page.getByPlaceholder('Input directory name').fill('archive');
    await page.getByRole('option', { name: 'Create' }).click();

    await expect(
      explorer.getByRole('treeitem', { name: /^archive$/ }),
    ).toBeVisible();
  });

  await test.step('search and open the named note from the explorer', async () => {
    await explorer.getByLabel('Search Files').click();
    await explorer.getByPlaceholder('Search…').fill('alpha');
    await page.keyboard.press('Enter');

    await expect(
      page.getByLabel('breadcrumb').getByRole('button', { name: 'alpha.md' }),
    ).toBeVisible();
    await expect
      .poll(() => getEditorText(page, {}))
      .toBe('Alpha explorer content');

    await explorer.getByPlaceholder('Search…').fill('');
  });

  await test.step('drag a note into another folder', async () => {
    const source = explorer.getByRole('treeitem', { name: 'alpha.md' });
    const target = explorer.getByRole('treeitem', { name: /^archive$/ });

    await expect(source).toBeVisible();
    await expect(target).toBeVisible();
    await source.dragTo(target);

    await expect
      .poll(() => readStoredMarkdown(page, workspaceName, 'archive/alpha'))
      .toBe('Alpha explorer content');
  });

  await test.step('right-click folder rename moves every child note', async () => {
    await explorer
      .getByRole('treeitem', { name: /^archive$/ })
      .click({ button: 'right' });
    await page.getByRole('button', { name: 'Rename' }).click();
    await page.getByPlaceholder('Provide a new folder name').fill('vault');
    await page.getByRole('option', { name: 'Confirm folder rename' }).click();

    await expect
      .poll(() => readStoredMarkdown(page, workspaceName, 'vault/alpha'))
      .toBe('Alpha explorer content');
    await expect
      .poll(() => readStoredMarkdown(page, workspaceName, 'archive/alpha'))
      .toBeUndefined();
  });

  await test.step('right-click rename and delete file operations work', async () => {
    await explorer
      .getByRole('treeitem', { name: /alpha\.md/ })
      .click({ button: 'right' });
    await page.getByRole('button', { name: 'Rename' }).click();
    await page.getByPlaceholder('Provide a new name').fill('beta');
    await page.getByRole('option', { name: 'Confirm name change' }).click();

    await expect
      .poll(() => readStoredMarkdown(page, workspaceName, 'vault/beta'))
      .toBe('Alpha explorer content');

    await explorer
      .getByRole('treeitem', { name: /beta\.md/ })
      .click({ button: 'right' });
    await page.getByRole('button', { name: 'Delete' }).click();
    await page.getByRole('option', { name: /vault\/beta\.md/ }).click();
    const confirmDeleteDialog = page.getByRole('alertdialog', {
      name: 'Confirm Delete',
    });
    await expect(confirmDeleteDialog).toBeVisible();
    await confirmDeleteDialog.getByRole('button', { name: 'Delete' }).click();

    await expect
      .poll(() => readStoredMarkdown(page, workspaceName, 'vault/beta'))
      .toBeUndefined();
  });

  await test.step('right-click folder delete removes contained notes', async () => {
    await explorer
      .getByRole('treeitem', { name: /^vault$/ })
      .click({ button: 'right' });
    await page.getByRole('button', { name: 'Delete' }).click();
    const confirmDeleteDialog = page.getByRole('alertdialog', {
      name: 'Confirm Delete',
    });
    await expect(confirmDeleteDialog).toBeVisible();
    await confirmDeleteDialog
      .getByRole('button', { name: 'Delete Folder' })
      .click();

    await expect
      .poll(() => readStoredMarkdown(page, workspaceName, 'vault/untitled-3'))
      .toBeUndefined();
    await expect(
      explorer.getByRole('treeitem', { name: /^vault$/ }),
    ).toBeHidden();
  });

  await test.step('reload preserves the remaining explorer state', async () => {
    await page.reload();

    await expect(
      explorer.getByRole('treeitem', { name: /^docs$/ }),
    ).toBeVisible();
    await explorer.getByLabel('Search Files').click();
    await explorer.getByPlaceholder('Search…').fill('untitled-2');
    await page.keyboard.press('Enter');

    await expect(
      page
        .getByLabel('breadcrumb')
        .getByRole('button', { name: 'untitled-2.md' }),
    ).toBeVisible();
  });
});
