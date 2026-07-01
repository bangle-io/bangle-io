import { expect, type Page, test } from '@playwright/test';
import {
  clearEditor,
  createBrowserWorkspace,
  getEditorLocator,
  getEditorText,
  readStoredMarkdown,
} from './common';

async function expectContextMenuIsNotClipped(page: Page) {
  const menu = page.locator('[data-file-tree-context-menu-root="true"]');

  await expect(menu).toBeVisible();
  await expect
    .poll(
      () =>
        menu.evaluate((element) => {
          const rect = element.getBoundingClientRect();
          const viewportWidth = document.documentElement.clientWidth;
          const viewportHeight = document.documentElement.clientHeight;
          const samplePoints: Array<readonly [number, number]> = [
            [rect.left + rect.width / 2, rect.top + rect.height / 2],
            [rect.right - 4, rect.top + rect.height / 2],
            [rect.left + rect.width / 2, rect.bottom - 4],
          ];

          return (
            rect.left >= 0 &&
            rect.top >= 0 &&
            rect.right <= viewportWidth &&
            rect.bottom <= viewportHeight &&
            samplePoints.every(([x, y]) => {
              const hit = document.elementFromPoint(x, y);
              return hit ? element.contains(hit) : false;
            })
          );
        }),
      { message: 'Expected the file-tree context menu to be fully hittable' },
    )
    .toBe(true);
}

test('file explorer creates folders, opens notes, and survives reload', async ({
  page,
}) => {
  const workspaceName = `explorer-${Date.now()}`;
  await createBrowserWorkspace(page, { workspaceName });

  const explorer = page.getByTestId('bangle-file-explorer');
  await expect(explorer).toBeVisible();

  await test.step('use the app-level search instead of a duplicate explorer search', async () => {
    await expect(explorer.getByLabel('Search Files')).toHaveCount(0);
    await expect(explorer.getByPlaceholder('Search…')).toHaveCount(0);
  });

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

  await test.step('find and open a note through app-level search', async () => {
    await page.getByRole('button', { name: /Search/ }).click();
    const commandDialog = page.getByRole('dialog', {
      name: 'omni command bar',
    });
    await expect(commandDialog).toBeVisible();

    await commandDialog
      .getByPlaceholder('Type a command or search...')
      .fill('alpha');
    await expect(
      commandDialog.getByRole('option', { name: 'docs/alpha.md' }),
    ).toBeVisible();
    await page.keyboard.press('Enter');

    await expect(commandDialog).toBeHidden();
    await expect(
      page.getByLabel('breadcrumb').getByRole('button', { name: 'alpha.md' }),
    ).toBeVisible();
    await expect
      .poll(() => getEditorText(page, {}))
      .toBe('Alpha explorer content');
  });

  await test.step('create a second root folder for drag-and-drop moves', async () => {
    await explorer.getByLabel('New Folder').click();
    await page.getByPlaceholder('Input directory name').fill('archive');
    await page.getByRole('option', { name: 'Create' }).click();

    await expect(
      explorer.getByRole('treeitem', { name: /^archive$/ }),
    ).toBeVisible();
  });

  await test.step('three-dot file menu is fully visible and hittable', async () => {
    const alphaRow = explorer.getByRole('treeitem', { name: /alpha\.md/ });

    await alphaRow.hover();
    await explorer.getByRole('button', { name: 'Options' }).click();
    await expectContextMenuIsNotClipped(page);
    await page.keyboard.press('Escape');
  });

  await test.step('open the named note from the explorer', async () => {
    await explorer.getByRole('treeitem', { name: /alpha\.md/ }).click();

    await expect(
      page.getByLabel('breadcrumb').getByRole('button', { name: 'alpha.md' }),
    ).toBeVisible();
    await expect
      .poll(() => getEditorText(page, {}))
      .toBe('Alpha explorer content');
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
    await explorer.getByRole('treeitem', { name: /untitled-2\.md/ }).click();

    await expect(
      page
        .getByLabel('breadcrumb')
        .getByRole('button', { name: 'untitled-2.md' }),
    ).toBeVisible();
  });
});
