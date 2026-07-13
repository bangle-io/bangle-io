import { expect, test } from '@playwright/test';
import {
  collapseEditorSelectionAfterText,
  createBrowserWorkspaceAndNote,
  ctrlKey,
  getEditorLocator,
  readStoredMarkdown,
  waitForEditorFocus,
} from './common';

test('authors, edits, copies, and persists inline and display math', async ({
  context,
  page,
}) => {
  const invalidSelectionWarnings: string[] = [];
  page.on('console', (message) => {
    if (
      message
        .text()
        .includes(
          'TextSelection endpoint not pointing into a node with inline content',
        )
    ) {
      invalidSelectionWarnings.push(message.text());
    }
  });
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const workspaceName = 'editor-math-workspace';
  const noteName = 'Math';
  await createBrowserWorkspaceAndNote(page, { workspaceName, noteName });

  const editor = getEditorLocator(page, {});
  await editor.click();
  await waitForEditorFocus(page, {});

  await test.step('type, render, and edit inline math', async () => {
    await editor.pressSequentially(String.raw`Euler $e^{i\pi} + 1 = 0$`, {
      delay: 20,
    });
    const inlineMath = editor.locator('math-inline');
    await expect(inlineMath.locator('.katex')).toBeVisible();

    await inlineMath.locator('.math-render').click();
    const sourceEditor = inlineMath.locator('.math-src .ProseMirror');
    await expect(sourceEditor).toBeVisible();
    await expect(sourceEditor).toHaveText(String.raw`e^{i\pi} + 1 = 0`);
    await sourceEditor.fill(String.raw`e^{i\pi} + 1 = 1`);
    await sourceEditor.press('Control+Enter');

    await expect(inlineMath.locator('.math-render')).toBeVisible();
    await expect
      .poll(() => readStoredMarkdown(page, workspaceName, noteName))
      .toBe(String.raw`Euler $e^{i\pi} + 1 = 1$`);
    expect(invalidSelectionWarnings).toEqual([]);
  });

  await test.step('insert and edit a display block through the slash menu', async () => {
    await page.keyboard.press('Enter');
    await page.keyboard.insertText('/');
    const mathCommand = page.getByText('Math block', { exact: true });
    await expect(mathCommand).toBeVisible();
    await mathCommand.click();

    const displayMath = editor.locator('math-display');
    await expect(displayMath).toHaveAttribute('data-bangle-math-view', '');
    const sourceEditor = displayMath.locator('.math-src .ProseMirror');
    await expect(sourceEditor).toBeVisible();
    await sourceEditor.fill(String.raw`\frac{a}{b} + \sqrt{x}`);
    await sourceEditor.press('End');
    await sourceEditor.press('ArrowRight');
    await expect(displayMath.locator('.math-render .katex')).toBeVisible();
    await expect
      .poll(() => readStoredMarkdown(page, workspaceName, noteName))
      .toBe(
        String.raw`Euler $e^{i\pi} + 1 = 1$

$$
\frac{a}{b} + \sqrt{x}
$$`,
      );
    expect(invalidSelectionWarnings).toEqual([]);
  });

  await test.step('show invalid TeX without discarding its source', async () => {
    const displayMath = editor.locator('math-display');
    await displayMath.locator('.math-render').click();
    const sourceEditor = displayMath.locator('.math-src .ProseMirror');
    await sourceEditor.fill(String.raw`\notacommand{`);
    await sourceEditor.press('Control+Enter');

    const error = displayMath.locator('.katex-error');
    await expect(error).toBeVisible();
    await expect(error).toContainText(String.raw`\notacommand{`);

    await error.click();
    await expect(sourceEditor).toBeVisible();
    await expect(sourceEditor).toHaveText(String.raw`\notacommand{`);
    await sourceEditor.press('Control+Enter');
    expect(invalidSelectionWarnings).toEqual([]);
  });

  await test.step('copy inline math with Markdown delimiters', async () => {
    await collapseEditorSelectionAfterText(page, 'Euler ');
    await page.keyboard.press('Shift+ArrowRight');
    await page.keyboard.press(`${ctrlKey}+c`);
    await expect
      .poll(() => page.evaluate(() => navigator.clipboard.readText()))
      .toBe(String.raw`$e^{i\pi} + 1 = 1$`);
  });

  await test.step('reload with rendered and invalid source persisted', async () => {
    const expected = String.raw`Euler $e^{i\pi} + 1 = 1$

$$
\notacommand{
$$`;
    await expect
      .poll(() => readStoredMarkdown(page, workspaceName, noteName))
      .toBe(expected);

    await page.reload({ waitUntil: 'networkidle' });
    const reloadedEditor = getEditorLocator(page, {});
    await expect(reloadedEditor.locator('math-inline .katex')).toBeVisible();
    const reloadedDisplay = reloadedEditor.locator('math-display');
    await expect(reloadedDisplay.locator('.katex-error')).toBeVisible();
    await reloadedDisplay.locator('.math-render').click();
    await expect(reloadedDisplay.locator('.math-src .ProseMirror')).toHaveText(
      String.raw`\notacommand{`,
    );
    expect(await readStoredMarkdown(page, workspaceName, noteName)).toBe(
      expected,
    );
  });

  expect(invalidSelectionWarnings).toEqual([]);
});
