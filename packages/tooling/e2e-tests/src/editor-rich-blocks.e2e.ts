import { expect, test } from '@playwright/test';
import {
  createBrowserWorkspaceAndNote,
  getEditorLocator,
  readStoredMarkdown,
  writeStoredMarkdown,
} from './common';

test.describe.configure({ mode: 'serial' });

test('renders a Markdown table and persists table edits across reload', async ({
  page,
}) => {
  const workspaceName = 'rich-block-table';
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

test('edits a fenced code-block language badge and persists Markdown', async ({
  page,
}) => {
  const workspaceName = 'rich-block-code';
  const noteName = 'code';
  await createBrowserWorkspaceAndNote(page, { workspaceName, noteName });
  await writeStoredMarkdown(
    page,
    workspaceName,
    noteName,
    '```js\nconsole.log("hi");\n```',
  );
  await page.reload({ waitUntil: 'networkidle' });

  const editor = getEditorLocator(page, {});
  const codeBlock = editor.locator('pre').filter({ hasText: 'console.log' });
  await expect(codeBlock.locator('code')).toContainText('console.log("hi");');
  await codeBlock.hover();

  const languageButton = page.getByRole('button', { name: 'Edit language' });
  await expect(languageButton).toHaveText('JS', { timeout: 15_000 });
  await languageButton.click();
  await page.getByRole('textbox', { name: 'Edit language' }).fill('typescript');
  await page.keyboard.press('Enter');

  await expect(page.getByRole('button', { name: 'Edit language' })).toHaveText(
    'TYPESCRIPT',
  );
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, noteName))
    .toBe('```typescript\nconsole.log("hi");\n```');

  await page.reload({ waitUntil: 'networkidle' });
  await codeBlock.hover();
  await expect(page.getByRole('button', { name: 'Edit language' })).toHaveText(
    'TYPESCRIPT',
  );
});
