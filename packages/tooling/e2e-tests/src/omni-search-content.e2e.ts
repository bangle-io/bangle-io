import { expect, test } from '@playwright/test';
import {
  clearEditor,
  createBrowserWorkspaceAndNote,
  getEditorLocator,
  getEditorText,
  pressAppShortcut,
  readStoredMarkdown,
} from './common';

test('searches persisted note contents and highlights the matching text', async ({
  page,
}) => {
  const workspaceName = 'omni-content-search-workspace';
  const noteName = 'field-notes';
  const noteContent = 'The Aurora signal appeared beyond the northern ridge.';

  await createBrowserWorkspaceAndNote(page, {
    workspaceName,
    noteName,
  });

  const editor = getEditorLocator(page, {});
  await editor.click();
  await clearEditor(page, {});
  await editor.pressSequentially(noteContent, { delay: 10 });
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, noteName))
    .toContain(noteContent);

  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('link', { name: 'Home', exact: true }).click();
  await pressAppShortcut(page, 'k');

  const commandDialog = page.getByRole('dialog', {
    name: 'omni command bar',
  });
  await commandDialog
    .getByPlaceholder('Type a command or search...')
    .fill('aurora');

  const contentResult = commandDialog
    .getByRole('option')
    .filter({ hasText: 'field-notes.md' });
  await expect(contentResult).toBeVisible();
  await expect(contentResult.locator('mark')).toHaveText('Aurora');
  await expect(contentResult).toContainText('signal appeared');

  await contentResult.click();

  await expect(commandDialog).toBeHidden();
  await expect(
    page
      .getByLabel('breadcrumb')
      .getByRole('button', { name: 'field-notes.md' }),
  ).toBeVisible();
  await expect.poll(() => getEditorText(page, {})).toBe(noteContent);
});
