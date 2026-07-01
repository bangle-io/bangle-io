import { expect, test } from '@playwright/test';
import {
  createBrowserWorkspaceAndNote,
  getEditorLocator,
  readStoredMarkdown,
  writeStoredMarkdown,
} from './common';

test('renders a Markdown table and persists table edits across reload', async ({
  page,
}) => {
  const workspaceName = 'editor-tables';
  const noteName = 'table';
  await createBrowserWorkspaceAndNote(page, { workspaceName, noteName });
  await writeStoredMarkdown(
    page,
    workspaceName,
    noteName,
    '| First |\n| --- |\n| alpha |',
  );
  await page.reload({ waitUntil: 'networkidle' });

  const editor = getEditorLocator(page, {});
  const firstCell = editor.locator('td').first();
  await firstCell.click();
  await page.keyboard.insertText('alpha');

  await expect(editor.locator('table')).toBeVisible();
  await expect(firstCell).toContainText('alpha');
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, noteName))
    .toContain('| alphaalpha |');

  await page.reload({ waitUntil: 'networkidle' });
  await expect(editor.locator('table')).toBeVisible();
  await expect(firstCell).toContainText('alphaalpha');
});

test('inserts a table from the slash command and reloads it as a table', async ({
  page,
}) => {
  const workspaceName = 'editor-tables-slash';
  const noteName = 'table';
  await createBrowserWorkspaceAndNote(page, { workspaceName, noteName });

  const editor = getEditorLocator(page, {});
  await editor.click();
  await page.keyboard.insertText('/');
  await page.getByText('Insert table').click();

  const firstHeader = editor.locator('th').first();
  await expect(firstHeader).toBeVisible();
  await firstHeader.click();
  await page.keyboard.insertText('Name');

  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, noteName))
    .toContain('| Name |');

  await page.reload({ waitUntil: 'networkidle' });
  await expect(editor.locator('table')).toBeVisible();
  await expect(firstHeader).toContainText('Name');
});
