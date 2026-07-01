import { expect, test } from '@playwright/test';
import {
  clearEditor,
  createBrowserWorkspaceAndNote,
  getEditorLocator,
  readStoredMarkdown,
  writeStoredMarkdown,
} from './common';

test('converts a typed fenced-code marker into a persisted code block', async ({
  page,
}) => {
  const workspaceName = 'code-block-fence';
  const noteName = 'typed-code';
  await createBrowserWorkspaceAndNote(page, { workspaceName, noteName });

  const editor = getEditorLocator(page, {});
  await editor.click();
  await clearEditor(page, {});
  await editor.pressSequentially('```js');
  await page.keyboard.press('Enter');
  await editor.pressSequentially('console.log("typed");');

  await expect(editor.locator('pre code')).toContainText(
    'console.log("typed");',
  );
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, noteName))
    .toBe('```js\nconsole.log("typed");\n```');
});

test('copies code-block text from the visible code action', async ({
  context,
  page,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const workspaceName = 'code-block-copy';
  const noteName = 'copy-code';
  const code = 'const copied = true;';
  await createBrowserWorkspaceAndNote(page, { workspaceName, noteName });
  await writeStoredMarkdown(
    page,
    workspaceName,
    noteName,
    `\`\`\`ts\n${code}\n\`\`\``,
  );
  await page.reload({ waitUntil: 'networkidle' });

  const editor = getEditorLocator(page, {});
  const codeBlock = editor.locator('pre').filter({ hasText: code });
  await expect(codeBlock.locator('code')).toContainText(code);
  await codeBlock.hover();

  const copyButton = codeBlock.getByRole('button', {
    exact: true,
    name: 'Copy',
  });
  await copyButton.click();
  await expect(copyButton).toHaveText('Copied');
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe(code);
});

test('edits a fenced code-block language badge and persists Markdown', async ({
  page,
}) => {
  const workspaceName = 'code-block-language';
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
