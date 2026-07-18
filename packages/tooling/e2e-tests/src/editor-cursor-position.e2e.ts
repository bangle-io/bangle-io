import { expect, type Page, test } from '@playwright/test';
import {
  collapseEditorSelection,
  createBrowserWorkspaceAndNote,
  getEditorLocator,
  readStoredMarkdown,
  waitForEditorFocus,
} from './common';

const workspaceName = 'remember-cursor';

async function createNote(page: Page, noteName: string) {
  await page.getByRole('button', { name: 'Bangle.io' }).click();
  await page.getByRole('menuitem', { name: 'New Note' }).click();
  await page.getByLabel('Note name').fill(noteName);
  await page.getByRole('button', { name: 'Create' }).click();
  await expect(getEditorLocator(page, {})).toBeVisible();
  await waitForEditorFocus(page, {});
}

async function openNote(page: Page, fileName: string) {
  await page
    .getByTestId('bangle-file-explorer')
    .getByRole('treeitem', { name: fileName })
    .click();
  await expect(
    page.getByLabel('breadcrumb').getByRole('button', { name: fileName }),
  ).toBeVisible();
  await expect
    .poll(() => getEditorLocator(page, {}).getAttribute('data-editor-name'))
    .toContain(`:${fileName}:`);
  await waitForEditorFocus(page, {});
}

test('restores a note cursor after switching away and back', async ({
  page,
}) => {
  await createBrowserWorkspaceAndNote(page, {
    workspaceName,
    noteName: 'note-a',
  });
  const editor = getEditorLocator(page, {});
  await waitForEditorFocus(page, {});
  await editor.fill('alpha before middle after');
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, 'note-a'))
    .toBe('alpha before middle after');

  await createNote(page, 'note-b');
  await openNote(page, 'note-a.md');
  await expect(editor).toHaveText('alpha before middle after');
  await collapseEditorSelection(page, 'alpha before'.length);

  await openNote(page, 'note-b.md');
  await openNote(page, 'note-a.md');
  await expect(editor).toHaveText('alpha before middle after');
  await editor.focus();
  await page.keyboard.insertText(' RESTORED');

  await expect(editor).toHaveText('alpha before RESTORED middle after');
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, 'note-a'))
    .toBe('alpha before RESTORED middle after');
});
