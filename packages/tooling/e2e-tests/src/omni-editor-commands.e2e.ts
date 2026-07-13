import { expect, test } from '@playwright/test';
import {
  createBrowserWorkspaceAndNote,
  getEditorLocator,
  pressAppShortcut,
  readStoredMarkdown,
  waitForEditorFocus,
} from './common';

test('omni search runs editor block commands on the active note', async ({
  page,
}) => {
  const workspaceName = 'omni-editor-commands';
  await createBrowserWorkspaceAndNote(page, {
    workspaceName,
    noteName: 'Home',
  });

  const editor = getEditorLocator(page, {});
  await editor.click();
  await waitForEditorFocus(page, {});
  await page.keyboard.insertText('Make me a heading');

  // Toggle the current block into a heading from omni search.
  await pressAppShortcut(page, 'k');
  const dialog = page.getByRole('dialog', { name: 'omni command bar' });
  await dialog
    .getByPlaceholder('Type a command or search...')
    .fill('toggle heading 1');
  await dialog.getByText('Toggle Heading 1').click();

  await expect(
    editor.getByRole('heading', { name: 'Make me a heading', level: 1 }),
  ).toBeVisible();

  // The command refocuses the editor: keep typing without clicking back.
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');

  // Insert a table from omni search and type straight into its first cell.
  await pressAppShortcut(page, 'k');
  await dialog
    .getByPlaceholder('Type a command or search...')
    .fill('insert table');
  await dialog.getByText('Insert Table').click();

  await expect(editor.locator('table')).toBeVisible();
  await page.keyboard.insertText('first cell');
  await expect(editor.locator('table')).toContainText('first cell');

  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, 'Home'))
    .toMatch(/^# Make me a heading[\s\S]*\| first cell/);
});
