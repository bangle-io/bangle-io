import { expect, test } from '@playwright/test';
import {
  clearEditor,
  createBrowserWorkspaceAndNote,
  ctrlKey,
  expectReadableContrast,
  getEditorLocator,
  isDarwin,
  pressAppShortcut,
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

test('converts a typed fenced-code marker inside a list item', async ({
  page,
}) => {
  const workspaceName = 'code-block-list-fence';
  const noteName = 'typed-list-code';
  await createBrowserWorkspaceAndNote(page, { workspaceName, noteName });

  const editor = getEditorLocator(page, {});
  await editor.click();
  await clearEditor(page, {});
  await editor.pressSequentially('- ');
  await editor.pressSequentially('```js');
  await page.keyboard.press('Enter');
  await editor.pressSequentially('console.log("listed");');

  await expect(editor.locator('pre code')).toContainText(
    'console.log("listed");',
  );
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, noteName))
    .toBe('- ```js\n  console.log("listed");\n  ```');
});

test('converts a typed fenced-code marker inside a blockquote', async ({
  page,
}) => {
  const workspaceName = 'code-block-blockquote-fence';
  const noteName = 'typed-blockquote-code';
  await createBrowserWorkspaceAndNote(page, { workspaceName, noteName });

  const editor = getEditorLocator(page, {});
  await editor.click();
  await clearEditor(page, {});
  await editor.pressSequentially('> ');
  await editor.pressSequentially('```ts');
  await page.keyboard.press('Enter');
  await editor.pressSequentially('const quoted = true;');

  await expect(editor.locator('blockquote pre code')).toContainText(
    'const quoted = true;',
  );
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, noteName))
    .toBe('> ```ts\n> const quoted = true;\n> ```');
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

test('keeps code action feedback after refocusing a code block', async ({
  context,
  page,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const workspaceName = 'code-block-action-feedback';
  const noteName = 'copy-feedback';
  const code = 'const copied = true;';
  const retained = 'const retained = true;';
  await createBrowserWorkspaceAndNote(page, { workspaceName, noteName });

  const editor = getEditorLocator(page, {});
  await editor.click();
  await clearEditor(page, {});
  await editor.pressSequentially('```ts');
  await page.keyboard.press('Enter');
  await page.keyboard.insertText(code);
  const codeBlock = editor.locator('pre').filter({ hasText: code });
  await expect(codeBlock.locator('code')).toContainText(code);
  await codeBlock.hover();

  const copyButton = editor.locator('.prosemirror-code-copy-button').first();
  await copyButton.click();
  await expect(copyButton).toHaveText('Copied');
  const codeBox = await codeBlock.locator('code').boundingBox();
  expect(codeBox).not.toBeNull();
  if (!codeBox) {
    return;
  }
  await page.mouse.click(codeBox.x + 8, codeBox.y + 12);
  for (let index = 0; index < code.length; index += 1) {
    await page.keyboard.press('ArrowRight');
  }

  await page.keyboard.type(`\n${retained}`);

  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, noteName))
    .toContain(retained);
  await expect(copyButton).toHaveText('Copied');
});

test('renders syntax-highlighted code with readable contrast in light mode', async ({
  page,
}) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('color-scheme', 'light');
  });

  const workspaceName = 'code-block-highlight-contrast';
  const noteName = 'contrast';
  await createBrowserWorkspaceAndNote(page, { workspaceName, noteName });
  await writeStoredMarkdown(
    page,
    workspaceName,
    noteName,
    '```ts\nconst readable = true;\n```',
  );
  await page.reload({ waitUntil: 'networkidle' });

  const token = getEditorLocator(page, {}).locator('pre code .shiki').first();
  await expect(token).toBeVisible({ timeout: 15_000 });
  await expectReadableContrast(token);
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

test('does not invent language info when an empty language badge editor is cancelled or blurred', async ({
  page,
}) => {
  const workspaceName = 'code-block-empty-language';
  const noteName = 'code';
  const markdown = '```\nconsole.log("plain");\n```';
  await createBrowserWorkspaceAndNote(page, { workspaceName, noteName });
  await writeStoredMarkdown(page, workspaceName, noteName, markdown);
  await page.reload({ waitUntil: 'networkidle' });

  const editor = getEditorLocator(page, {});
  const codeBlock = editor.locator('pre').filter({ hasText: 'console.log' });
  await expect(codeBlock.locator('code')).toContainText(
    'console.log("plain");',
  );
  await codeBlock.hover();

  const languageButton = page.getByRole('button', { name: 'Edit language' });
  await expect(languageButton).toHaveText('TEXT', { timeout: 15_000 });
  await languageButton.click();
  await expect(
    page.getByRole('textbox', { name: 'Edit language' }),
  ).toHaveValue('');
  await page.keyboard.press('Escape');
  await expect(languageButton).toHaveText('TEXT');
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, noteName))
    .toBe(markdown);

  await languageButton.click();
  await expect(
    page.getByRole('textbox', { name: 'Edit language' }),
  ).toHaveValue('');
  await editor.click();
  await expect(languageButton).toHaveText('TEXT');
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, noteName))
    .toBe(markdown);
});

test('moves a code block with option arrow shortcuts and persists order', async ({
  page,
}) => {
  const workspaceName = 'code-block-move-shortcuts';
  const noteName = 'move';
  const code = 'const moved = true;';
  await createBrowserWorkspaceAndNote(page, { workspaceName, noteName });

  const editor = getEditorLocator(page, {});
  await editor.click();
  await clearEditor(page, {});
  await editor.pressSequentially('before');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await editor.pressSequentially('```js');
  await page.keyboard.press('Enter');
  await page.keyboard.insertText(code);
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, noteName))
    .toBe(`before\n\n\`\`\`js\n${code}\n\`\`\``);

  await page.keyboard.down('Alt');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.up('Alt');

  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, noteName))
    .toBe(`\`\`\`js\n${code}\n\`\`\`\n\nbefore`);

  await page.keyboard.down('Alt');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.up('Alt');

  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, noteName))
    .toBe(`before\n\n\`\`\`js\n${code}\n\`\`\``);
});

test('backspace turns an empty sole code block back into a paragraph', async ({
  page,
}) => {
  const workspaceName = 'code-block-empty-backspace';
  const noteName = 'empty-backspace';
  await createBrowserWorkspaceAndNote(page, { workspaceName, noteName });

  const editor = getEditorLocator(page, {});
  await editor.click();
  await clearEditor(page, {});
  await editor.pressSequentially('```js');
  await page.keyboard.press('Enter');
  await expect(editor.locator('pre')).toBeVisible();

  await page.keyboard.press('Backspace');

  await expect(editor.locator('pre')).toHaveCount(0);
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, noteName))
    .toBe('');
});

test('forward delete removes an empty paragraph before a code block', async ({
  page,
}) => {
  const workspaceName = 'code-block-forward-delete';
  const noteName = 'forward-delete';
  await createBrowserWorkspaceAndNote(page, { workspaceName, noteName });

  const editor = getEditorLocator(page, {});
  await editor.click();
  await clearEditor(page, {});
  await editor.pressSequentially('```js');
  await page.keyboard.press('Enter');
  await expect(editor.locator('pre')).toBeVisible();
  await page.keyboard.press('ArrowUp');

  await expect(editor.locator('p')).toHaveCount(1);
  await page.keyboard.press('Delete');

  await expect(editor.locator('pre')).toBeVisible();
  await expect(editor.locator('p')).toHaveCount(0);
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, noteName))
    .toBe('```js\n```');
});

test('clicking below a final code block creates a paragraph for typing', async ({
  page,
}) => {
  const workspaceName = 'code-block-click-below';
  const noteName = 'click-below';
  await createBrowserWorkspaceAndNote(page, { workspaceName, noteName });
  await writeStoredMarkdown(
    page,
    workspaceName,
    noteName,
    '```js\nconst finalBlock = true;\n```',
  );
  await page.reload({ waitUntil: 'networkidle' });

  const editor = getEditorLocator(page, {});
  const codeBlock = editor.locator('pre').filter({
    hasText: 'const finalBlock = true;',
  });
  await expect(codeBlock).toBeVisible();
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, noteName))
    .toBe('```js\nconst finalBlock = true;\n```');

  const editorBox = await editor.boundingBox();
  const codeBlockBox = await codeBlock.boundingBox();
  expect(editorBox).not.toBeNull();
  expect(codeBlockBox).not.toBeNull();
  if (!editorBox || !codeBlockBox) {
    return;
  }

  await page.mouse.click(
    editorBox.x + editorBox.width / 2,
    Math.min(
      codeBlockBox.y + codeBlockBox.height + 64,
      editorBox.y + editorBox.height - 16,
    ),
  );
  await page.keyboard.insertText('after code');

  await expect(
    editor.locator('p').filter({ hasText: 'after code' }),
  ).toBeVisible();
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, noteName))
    .toBe('```js\nconst finalBlock = true;\n```\n\nafter code');
});

test('modified click below a final code block does not create a paragraph', async ({
  page,
}) => {
  const workspaceName = 'code-block-modified-click-below';
  const noteName = 'modified-click-below';
  const markdown = '```js\nconst finalBlock = true;\n```';
  await createBrowserWorkspaceAndNote(page, { workspaceName, noteName });
  await writeStoredMarkdown(page, workspaceName, noteName, markdown);
  await page.reload({ waitUntil: 'networkidle' });

  const editor = getEditorLocator(page, {});
  const codeBlock = editor.locator('pre').filter({
    hasText: 'const finalBlock = true;',
  });
  await expect(codeBlock).toBeVisible();

  const editorBox = await editor.boundingBox();
  const codeBlockBox = await codeBlock.boundingBox();
  expect(editorBox).not.toBeNull();
  expect(codeBlockBox).not.toBeNull();
  if (!editorBox || !codeBlockBox) {
    return;
  }

  await page.keyboard.down('Shift');
  await page.mouse.click(
    editorBox.x + editorBox.width / 2,
    Math.min(
      codeBlockBox.y + codeBlockBox.height + 64,
      editorBox.y + editorBox.height - 16,
    ),
  );
  await page.keyboard.up('Shift');

  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, noteName))
    .toBe(markdown);
});

test('option backspace deletes the previous word inside a code block on macOS', async ({
  page,
}) => {
  test.skip(!isDarwin, 'Option+Backspace is a macOS word-delete shortcut');

  const workspaceName = 'code-block-option-backspace';
  const noteName = 'option-backspace';
  await createBrowserWorkspaceAndNote(page, { workspaceName, noteName });

  const editor = getEditorLocator(page, {});
  await editor.click();
  await clearEditor(page, {});
  await editor.pressSequentially('```js');
  await page.keyboard.press('Enter');
  await editor.pressSequentially('singlelongword');
  await page.keyboard.down('Alt');
  await page.keyboard.press('Backspace');
  await page.keyboard.up('Alt');

  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, noteName))
    .toBe('```js\n```');

  await editor.click();
  await clearEditor(page, {});
  await editor.pressSequentially('```js');
  await page.keyboard.press('Enter');
  await editor.pressSequentially('two words');
  await page.keyboard.down('Alt');
  await page.keyboard.press('Backspace');
  await page.keyboard.up('Alt');

  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, noteName))
    .toBe('```js\ntwo \n```');
});

test('tab and shift tab indent code block lines and persist Markdown', async ({
  page,
}) => {
  const workspaceName = 'code-block-tab-indent';
  const noteName = 'tab-indent';
  await createBrowserWorkspaceAndNote(page, { workspaceName, noteName });

  const editor = getEditorLocator(page, {});
  await editor.click();
  await clearEditor(page, {});
  await editor.pressSequentially('```js');
  await page.keyboard.press('Enter');
  await page.keyboard.insertText('const value = true;');
  await page.keyboard.press('Tab');

  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, noteName))
    .toBe('```js\nconst value = true;  \n```');

  await editor.click();
  await clearEditor(page, {});
  await editor.pressSequentially('```js');
  await page.keyboard.press('Enter');
  await page.keyboard.insertText('  const value = true;');
  await page.keyboard.press('Shift+Tab');

  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, noteName))
    .toBe('```js\nconst value = true;\n```');
});

test('moves down from a sole code block into a new paragraph', async ({
  page,
}) => {
  const workspaceName = 'code-block-arrow-down';
  const noteName = 'down';
  await createBrowserWorkspaceAndNote(page, { workspaceName, noteName });

  const editor = getEditorLocator(page, {});
  await editor.click();
  await clearEditor(page, {});
  await editor.pressSequentially('```js');
  await page.keyboard.press('Enter');
  await editor.pressSequentially('console.log("down");');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.insertText('after down');

  await expect(editor.locator('pre')).toBeVisible();
  await expect(
    editor.locator('p').filter({ hasText: 'after down' }),
  ).toBeVisible();
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, noteName))
    .toBe('```js\nconsole.log("down");\n```\n\nafter down');
});

test('moves up from a sole code block into a new paragraph', async ({
  page,
}) => {
  const workspaceName = 'code-block-arrow-up';
  const noteName = 'up';
  await createBrowserWorkspaceAndNote(page, { workspaceName, noteName });

  const editor = getEditorLocator(page, {});
  await editor.click();
  await clearEditor(page, {});
  await editor.pressSequentially('```js');
  await page.keyboard.press('Enter');
  await editor.pressSequentially('const warmup = true;');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.insertText('warmup paragraph');
  await page.reload({ waitUntil: 'networkidle' });
  await editor.click();
  await clearEditor(page, {});

  await editor.pressSequentially('```ts');
  await page.keyboard.press('Enter');
  await editor.pressSequentially('const up = true;');
  await page.keyboard.press('Home');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.insertText('before up');

  await expect(
    editor.locator('p').filter({ hasText: 'before up' }),
  ).toBeVisible();
  await expect(editor.locator('pre code')).toContainText('const up = true;');
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, noteName))
    .toBe('before up\n\n```ts\nconst up = true;\n```');
});

test('exits a code block with repeated Enter at the end', async ({ page }) => {
  const workspaceName = 'code-block-enter-exit';
  const noteName = 'enter';
  await createBrowserWorkspaceAndNote(page, { workspaceName, noteName });

  const editor = getEditorLocator(page, {});
  await editor.click();
  await clearEditor(page, {});
  await editor.pressSequentially('```js');
  await page.keyboard.press('Enter');
  await editor.pressSequentially('const enterExit = true;');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await page.keyboard.insertText('after enter');

  await expect(editor.locator('pre code')).toContainText(
    'const enterExit = true;',
  );
  await expect(
    editor.locator('p').filter({ hasText: 'after enter' }),
  ).toBeVisible();
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, noteName))
    .toBe('```js\nconst enterExit = true;\n\n\n```\n\nafter enter');
});

test('inserts paragraphs around a code block with primary Enter shortcuts', async ({
  page,
}) => {
  const workspaceName = 'code-block-primary-enter';
  const noteName = 'primary-enter';
  await createBrowserWorkspaceAndNote(page, { workspaceName, noteName });

  const editor = getEditorLocator(page, {});
  await editor.click();
  await clearEditor(page, {});
  await editor.pressSequentially('```js');
  await page.keyboard.press('Enter');
  await editor.pressSequentially('const below = true;');
  await page.keyboard.down(ctrlKey);
  await page.keyboard.press('Enter');
  await page.keyboard.up(ctrlKey);
  await page.keyboard.insertText('after primary enter');

  await expect(editor.locator('pre code')).toContainText('const below = true;');
  await expect(
    editor.locator('p').filter({ hasText: 'after primary enter' }),
  ).toBeVisible();
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, noteName))
    .toBe('```js\nconst below = true;\n```\n\nafter primary enter');

  await editor.click();
  await clearEditor(page, {});
  await editor.pressSequentially('```ts');
  await page.keyboard.press('Enter');
  await editor.pressSequentially('const above = true;');
  await page.keyboard.down(ctrlKey);
  await page.keyboard.down('Shift');
  await page.keyboard.press('Enter');
  await page.keyboard.up('Shift');
  await page.keyboard.up(ctrlKey);
  await page.keyboard.insertText('before primary enter');

  await expect(
    editor.locator('p').filter({ hasText: 'before primary enter' }),
  ).toBeVisible();
  await expect(editor.locator('pre code')).toContainText('const above = true;');
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, noteName))
    .toBe('before primary enter\n\n```ts\nconst above = true;\n```');
});

test('keeps app shortcuts working while the cursor is in a code block', async ({
  page,
}) => {
  const workspaceName = 'code-block-app-shortcuts';
  const noteName = 'app-shortcuts';
  await createBrowserWorkspaceAndNote(page, { workspaceName, noteName });

  const editor = getEditorLocator(page, {});
  await editor.click();
  await clearEditor(page, {});
  await editor.pressSequentially('```js');
  await page.keyboard.press('Enter');
  await editor.pressSequentially('const shortcutScope = true;');

  const sidebar = page.locator('[data-side="left"][data-state]').first();
  await expect(sidebar).toHaveAttribute('data-state', 'expanded');
  await pressAppShortcut(page, 'k');
  await expect(
    page.getByRole('dialog', { name: 'omni command bar' }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await editor.click();
  await pressAppShortcut(page, 'Backslash');
  await expect(sidebar).toHaveAttribute('data-state', 'collapsed');
  await expect(editor.locator('pre code')).toContainText(
    'const shortcutScope = true;',
  );
});
