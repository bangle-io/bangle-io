import { expect, test } from '@playwright/test';
import {
  createBrowserWorkspaceAndNote,
  getEditorLocator,
  pressAppShortcut,
  readStoredMarkdown,
  waitForEditorFocus,
  writeStoredMarkdown,
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

test('omni search hides editor commands that cannot run', async ({ page }) => {
  const workspaceName = 'omni-editor-commands-unavailable';
  await createBrowserWorkspaceAndNote(page, {
    workspaceName,
    noteName: 'Home',
  });
  await writeStoredMarkdown(
    page,
    workspaceName,
    'Home',
    '| a | b |\n| --- | --- |\n| 1 | 2 |',
  );
  await page.reload({ waitUntil: 'networkidle' });

  const editor = getEditorLocator(page, {});
  await expect(editor.locator('table')).toBeVisible();
  await editor.locator('td', { hasText: '1' }).click();
  await waitForEditorFocus(page, {});

  // Table cells hold inline content only, so heading toggles cannot apply.
  await pressAppShortcut(page, 'k');
  const dialog = page.getByRole('dialog', { name: 'omni command bar' });
  await dialog
    .getByPlaceholder('Type a command or search...')
    .fill('toggle heading 1');
  await expect(dialog.getByText('Toggle Heading 1')).toHaveCount(0);
  await expect(dialog.getByText('No results found.')).toBeVisible();

  await dialog
    .getByPlaceholder('Type a command or search...')
    .fill('insert table');
  await expect(dialog.getByText('Insert Table')).toHaveCount(0);
  await expect(dialog.getByText('No results found.')).toBeVisible();
  await expect(editor.locator('table')).toHaveCount(1);
  await expect(editor.getByRole('heading')).toHaveCount(0);
});
