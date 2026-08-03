import { expect, test } from '@playwright/test';
import {
  collapseEditorSelectionAfterText,
  expectReadableContrast,
  getEditorLocator,
  pressAppShortcut,
  readSeededBrowserNote,
  seedBrowserWorkspaceAndNote,
  waitForEditorFocus,
  waitForSeededBrowserNote,
} from './common';

test('creates a code block through its keyboard lifecycle and persists the exact Markdown', async ({
  page,
}) => {
  const note = await seedBrowserWorkspaceAndNote(page, {
    noteName: 'Keyboard lifecycle',
    workspaceName: 'code-block-keyboard-lifecycle',
  });
  const editor = getEditorLocator(page, {});
  const code = 'const shortcutScope = true;';
  const prose = 'after keyboard lifecycle';
  const expected = `\`\`\`js\n${code}\n\n\n\`\`\`\n\n${prose}`;

  await editor.click();
  await waitForEditorFocus(page, {});
  await editor.pressSequentially('```js');
  await page.keyboard.press('Enter');
  await editor.pressSequentially(code);
  await expect(editor.locator('pre code')).toContainText(code);

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

  await collapseEditorSelectionAfterText(page, code);
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await page.keyboard.insertText(prose);

  await expect(editor.locator('p').filter({ hasText: prose })).toBeVisible();
  await expect.poll(() => readSeededBrowserNote(page, note)).toBe(expected);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForSeededBrowserNote(page, note);
  await expect(editor.locator('pre code')).toContainText(code);
  await expect(editor.locator('p').filter({ hasText: prose })).toBeVisible();
  await expect.poll(() => readSeededBrowserNote(page, note)).toBe(expected);
});

test('types a nested list code block, keeps Shift-Enter inside it, and reloads highlighted Markdown', async ({
  page,
}) => {
  const note = await seedBrowserWorkspaceAndNote(page, {
    noteName: 'Nested lifecycle',
    workspaceName: 'code-block-nested-lifecycle',
  });
  const editor = getEditorLocator(page, {});
  const firstLine = 'const listed: boolean = true;';
  const secondLine = 'return listed;';
  const expected = [
    '- ```ts',
    `  ${firstLine}`,
    `  ${secondLine}`,
    '  ```',
  ].join('\n');

  await editor.click();
  await waitForEditorFocus(page, {});
  await editor.pressSequentially('- ');
  await editor.pressSequentially('```ts');
  await page.keyboard.press('Enter');
  await editor.pressSequentially(firstLine);

  const codeBlock = editor.locator('pre').filter({ hasText: firstLine });
  const highlightedToken = codeBlock.locator('code .shiki').first();
  await expect(highlightedToken).toBeVisible({ timeout: 15_000 });
  await collapseEditorSelectionAfterText(page, firstLine);
  await page.keyboard.press('Shift+Enter');
  await page.keyboard.insertText(secondLine);

  await expect(codeBlock.locator('code')).toContainText(
    `${firstLine}\n${secondLine}`,
  );
  await expect.poll(() => readSeededBrowserNote(page, note)).toBe(expected);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForSeededBrowserNote(page, note);
  await expect(editor.locator('pre code')).toContainText(
    `${firstLine}\n${secondLine}`,
  );
  await expect(editor.locator('pre code .shiki').first()).toBeVisible({
    timeout: 15_000,
  });
  await expect.poll(() => readSeededBrowserNote(page, note)).toBe(expected);
});

test('copies, edits, and deletes code blocks through visible actions before reloading exact Markdown', async ({
  context,
  page,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const firstCode = 'const copied = true;';
  const secondCode = 'const remove = false;';
  const note = await seedBrowserWorkspaceAndNote(page, {
    initialMarkdown: [
      'before',
      '',
      '```js',
      firstCode,
      '```',
      '',
      '```ts',
      secondCode,
      '```',
      '',
      'after',
    ].join('\n'),
    noteName: 'Code actions',
    workspaceName: 'code-block-actions',
  });
  const editor = getEditorLocator(page, {});
  const firstBlock = editor.locator('pre').filter({ hasText: firstCode });
  const secondBlock = editor.locator('pre').filter({ hasText: secondCode });
  const expected = [
    'before',
    '',
    '```typescript',
    firstCode,
    '```',
    '',
    'after',
  ].join('\n');

  await expect(firstBlock.locator('code')).toContainText(firstCode);
  await expect(secondBlock.locator('code')).toContainText(secondCode);
  await firstBlock.hover();
  const copyButton = firstBlock.locator('.prosemirror-code-copy-button');
  await expect(copyButton).toHaveAccessibleName('Copy');
  await copyButton.focus();
  await expect(copyButton).toBeFocused();
  await page.keyboard.press('Enter');
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe(firstCode);
  await expect(copyButton).toHaveAccessibleName('Copied');
  await waitForEditorFocus(page, {});

  const languageButton = firstBlock.getByRole('button', {
    name: 'Edit language',
  });
  await languageButton.click();
  await page
    .getByRole('textbox', { name: 'Edit language' })
    .fill('  TypeScript  ');
  await page.keyboard.press('Enter');
  await expect(languageButton).toHaveText('TYPESCRIPT');
  await waitForEditorFocus(page, {});

  await secondBlock.hover();
  const deleteButton = secondBlock.getByRole('button', {
    exact: true,
    name: 'Delete code block',
  });
  await deleteButton.focus();
  await expect(deleteButton).toBeFocused();
  await deleteButton.click();
  await expect(secondBlock).toHaveCount(0);
  await waitForEditorFocus(page, {});
  await expect.poll(() => readSeededBrowserNote(page, note)).toBe(expected);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForSeededBrowserNote(page, note);
  await expect(editor.locator('pre')).toHaveCount(1);
  await expect(editor.locator('pre code')).toContainText(firstCode);
  await expect(
    editor.locator('pre').getByRole('button', { name: 'Edit language' }),
  ).toHaveText('TYPESCRIPT');
  await expect.poll(() => readSeededBrowserNote(page, note)).toBe(expected);
});

test('renders multiple readable Shiki token colors from computed CSS', async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem('color-scheme', 'light');
  });
  const highlightedMarkdown = [
    '```ts',
    'const total: number = 42;',
    'function greet(name: string) { return "Hello " + name; }',
    '```',
  ].join('\n');
  const note = await seedBrowserWorkspaceAndNote(page, {
    initialMarkdown: highlightedMarkdown,
    noteName: 'Syntax contrast',
    workspaceName: 'code-block-syntax-contrast',
  });
  const editor = getEditorLocator(page, {});
  const tokens = editor.locator('pre code .shiki');

  await expect(tokens.first()).toBeVisible({ timeout: 15_000 });
  const distinctColorIndexes = await tokens.evaluateAll((elements) => {
    const seen = new Set<string>();
    return elements.flatMap((element, index) => {
      const color = getComputedStyle(element).color;
      if (seen.has(color)) {
        return [];
      }
      seen.add(color);
      return [index];
    });
  });
  expect(distinctColorIndexes.length).toBeGreaterThanOrEqual(3);
  for (const index of distinctColorIndexes.slice(0, 3)) {
    await expectReadableContrast(tokens.nth(index));
  }
  await expect
    .poll(() => readSeededBrowserNote(page, note))
    .toBe(highlightedMarkdown);
});

test('ignores a modified trailing click, then creates and persists prose for an ordinary click', async ({
  page,
}) => {
  const code = 'const finalBlock = true;';
  const initialMarkdown = `\`\`\`js\n${code}\n\`\`\``;
  const prose = 'after code';
  const expected = `${initialMarkdown}\n\n${prose}`;
  const note = await seedBrowserWorkspaceAndNote(page, {
    initialMarkdown,
    noteName: 'Trailing layout',
    workspaceName: 'code-block-trailing-layout',
  });
  const editor = getEditorLocator(page, {});
  const codeBlock = editor.locator('pre').filter({ hasText: code });

  await expect(codeBlock).toBeVisible();
  const [editorBox, codeBlockBox] = await Promise.all([
    editor.boundingBox(),
    codeBlock.boundingBox(),
  ]);
  if (!editorBox || !codeBlockBox) {
    throw new Error('Expected editor and final code block bounds');
  }
  const gapTop = codeBlockBox.y + codeBlockBox.height;
  const gapBottom = editorBox.y + editorBox.height;
  expect(gapBottom - gapTop).toBeGreaterThan(16);
  const clickX = editorBox.x + editorBox.width / 2;
  const clickY = gapTop + (gapBottom - gapTop) / 2;

  await page.evaluate(() => {
    const externalControl = document.createElement('button');
    externalControl.textContent = 'External focus control';
    document.body.append(externalControl);
  });
  const externalControl = page.getByRole('button', {
    name: 'External focus control',
  });

  await externalControl.focus();
  await expect(externalControl).toBeFocused();
  await expect(editor).not.toBeFocused();
  await page.keyboard.down('Shift');
  await page.mouse.click(clickX, clickY);
  await page.keyboard.up('Shift');
  await expect(editor.locator('p')).toHaveCount(0);
  await expect
    .poll(() => readSeededBrowserNote(page, note))
    .toBe(initialMarkdown);

  await externalControl.focus();
  await expect(editor).not.toBeFocused();
  await page.mouse.click(clickX, clickY);
  await waitForEditorFocus(page, {});
  await page.keyboard.insertText(prose);
  await expect(editor.locator('p').filter({ hasText: prose })).toBeVisible();
  await expect.poll(() => readSeededBrowserNote(page, note)).toBe(expected);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForSeededBrowserNote(page, note);
  await expect(editor.locator('p').filter({ hasText: prose })).toBeVisible();
  await expect.poll(() => readSeededBrowserNote(page, note)).toBe(expected);
});
