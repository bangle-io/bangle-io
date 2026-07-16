import { expect, test } from '@playwright/test';
import {
  collapseEditorSelectionAfterText,
  createBrowserWorkspaceAndNote,
  ctrlKey,
  expectNoPageHorizontalOverflow,
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
    await editor.pressSequentially(
      String.raw`Euler $e^{i\pi} + 1 = 0$ and $a **b**$`,
      { delay: 20 },
    );
    const inlineMath = editor.locator('math-inline').first();
    await expect(inlineMath.locator('.katex')).toBeVisible();

    await inlineMath.locator('.math-render').click();
    const sourceEditor = inlineMath.locator('.math-src .ProseMirror');
    await expect(sourceEditor).toBeVisible();
    await expect(sourceEditor).toHaveText(String.raw`e^{i\pi} + 1 = 0`);
    await expect
      .poll(() =>
        inlineMath.evaluate((element) => getComputedStyle(element).boxShadow),
      )
      .toBe('none');
    await sourceEditor.fill(String.raw`e^{i\pi} + 1 = 1`);
    await sourceEditor.press('Control+Enter');

    const formattingLikeMath = editor.locator('math-inline').nth(1);
    await formattingLikeMath.locator('.math-render').click();
    await expect(
      formattingLikeMath.locator('.math-src .ProseMirror'),
    ).toHaveText('a **b**');
    await formattingLikeMath
      .locator('.math-src .ProseMirror')
      .press('Control+Enter');

    await expect(inlineMath.locator('.math-render')).toBeVisible();
    await expect
      .poll(() => readStoredMarkdown(page, workspaceName, noteName))
      .toBe(String.raw`Euler $e^{i\pi} + 1 = 1$ and $a **b**$`);
    expect(invalidSelectionWarnings).toEqual([]);
  });

  await test.step('insert and edit a display block through the slash menu', async () => {
    await editor.press('End');
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
        String.raw`Euler $e^{i\pi} + 1 = 1$ and $a **b**$

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
    const expected = String.raw`Euler $e^{i\pi} + 1 = 1$ and $a **b**$

$$
\notacommand{
$$`;
    await expect
      .poll(() => readStoredMarkdown(page, workspaceName, noteName))
      .toBe(expected);

    await page.reload({ waitUntil: 'networkidle' });
    const reloadedEditor = getEditorLocator(page, {});
    await expect(
      reloadedEditor.locator('math-inline .katex').first(),
    ).toBeVisible();
    const reloadedFormattingLikeMath = reloadedEditor
      .locator('math-inline')
      .nth(1);
    await reloadedFormattingLikeMath.locator('.math-render').click();
    await expect(
      reloadedFormattingLikeMath.locator('.math-src .ProseMirror'),
    ).toHaveText('a **b**');
    await reloadedFormattingLikeMath
      .locator('.math-src .ProseMirror')
      .press('Control+Enter');
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

test('unsafe edited math cannot consume following note content', async ({
  page,
}) => {
  const workspaceName = 'editor-math-unsafe-source';
  const noteName = 'Math safety';
  await createBrowserWorkspaceAndNote(page, { workspaceName, noteName });

  const editor = getEditorLocator(page, {});
  await editor.click();
  await waitForEditorFocus(page, {});
  await editor.pressSequentially('$x$and $y$', { delay: 20 });
  await page.keyboard.press('Enter');
  await page.keyboard.insertText('important text');
  await page.keyboard.press('Enter');
  await page.keyboard.insertText('/');
  await page.getByText('Math block', { exact: true }).click();
  const displaySource = editor.locator('math-display .math-src .ProseMirror');
  await displaySource.fill('z');
  await displaySource.press('Control+Enter');

  const inlineMath = editor.locator('math-inline');
  await inlineMath.nth(0).locator('.math-render').click();
  await inlineMath.nth(0).locator('.math-src .ProseMirror').fill('');
  await inlineMath
    .nth(0)
    .locator('.math-src .ProseMirror')
    .press('Control+Enter');
  await inlineMath.nth(1).locator('.math-render').click();
  await inlineMath.nth(1).locator('.math-src .ProseMirror').fill('a$b');
  await inlineMath
    .nth(1)
    .locator('.math-src .ProseMirror')
    .press('Control+Enter');

  const expected = String.raw`and \$a\$b\$

important text

$$
z
$$`;
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, noteName))
    .toBe(expected);

  await page.reload({ waitUntil: 'networkidle' });
  const reloadedEditor = getEditorLocator(page, {});
  await expect(reloadedEditor.locator('math-inline')).toHaveCount(0);
  await expect(reloadedEditor.locator('math-display')).toHaveCount(1);
  await expect(reloadedEditor).toContainText('and $a$b$');
  await expect(reloadedEditor).toContainText('important text');
  expect(await readStoredMarkdown(page, workspaceName, noteName)).toBe(
    expected,
  );
});

test('currency text does not suppress later editor input rules', async ({
  page,
}) => {
  const workspaceName = 'editor-math-currency-rules';
  const noteName = 'Currency';
  await createBrowserWorkspaceAndNote(page, { workspaceName, noteName });

  const editor = getEditorLocator(page, {});
  await editor.click();
  await waitForEditorFocus(page, {});
  await editor.pressSequentially(
    String.raw`Spent $5 on **lunch** [[Home]] and \$1`,
    { delay: 20 },
  );

  await expect(editor.locator('strong')).toHaveText('lunch');
  await expect(editor.locator('.wiki-link')).toHaveText('Home');
  await expect(editor).toContainText('Spent $5 on lunch Home and $1');
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, noteName))
    .toBe(String.raw`Spent $5 on **lunch** [[Home]] and \$1`);

  await page.reload({ waitUntil: 'networkidle' });
  const reloadedEditor = getEditorLocator(page, {});
  await expect(reloadedEditor.locator('strong')).toHaveText('lunch');
  await expect(reloadedEditor.locator('.wiki-link')).toHaveText('Home');
});

test('contains long inline math overflow on narrow screens', async ({
  page,
}) => {
  const workspaceName = 'editor-math-inline-overflow';
  const noteName = 'Long inline math';
  await createBrowserWorkspaceAndNote(page, { workspaceName, noteName });

  const editor = getEditorLocator(page, {});
  await editor.click();
  await waitForEditorFocus(page, {});
  await editor.pressSequentially('$x$', { delay: 20 });

  const inlineMath = editor.locator('math-inline');
  await inlineMath.locator('.math-render').click();
  const longSource = Array.from(
    { length: 40 },
    (_, index) => `x_{${index}}^2`,
  ).join('+');
  await inlineMath.locator('.math-src .ProseMirror').fill(longSource);
  await inlineMath.locator('.math-src .ProseMirror').press('Control+Enter');

  await page.setViewportSize({ width: 375, height: 800 });
  await expectNoPageHorizontalOverflow(page);
  const widths = await inlineMath.evaluate((node) => ({
    clientWidth: node.clientWidth,
    scrollWidth: node.scrollWidth,
  }));
  expect(widths.clientWidth).toBeGreaterThan(0);
  expect(widths.scrollWidth).toBeGreaterThan(widths.clientWidth);

  await page.reload({ waitUntil: 'networkidle' });
  await expect(getEditorLocator(page, {}).locator('math-inline')).toHaveCount(
    1,
  );
  await expectNoPageHorizontalOverflow(page);
});

test('keeps multiline plain-text paste inside display math', async ({
  context,
  page,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const workspaceName = 'editor-math-multiline-paste';
  const noteName = 'Multiline paste';
  await createBrowserWorkspaceAndNote(page, { workspaceName, noteName });

  const editor = getEditorLocator(page, {});
  await editor.click();
  await waitForEditorFocus(page, {});
  await page.keyboard.insertText('/');
  await page.getByText('Math block', { exact: true }).click();

  const source = editor.locator('math-display .math-src .ProseMirror');
  await page.evaluate(() => navigator.clipboard.writeText('a\n$$\nb'));
  await source.press('ControlOrMeta+v');

  await expect(source).toHaveText('a\n$$\nb');
  await expect(editor.locator('math-display')).toHaveCount(1);
  await source.press('Control+Enter');
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, noteName))
    .toBe(['```', '$$', 'a', '$$', 'b', '$$', '```'].join('\n'));

  await page.reload({ waitUntil: 'networkidle' });
  const reloadedEditor = getEditorLocator(page, {});
  await expect(reloadedEditor.locator('math-display')).toHaveCount(0);
  await expect(reloadedEditor.locator('pre code')).toContainText(
    '$$\na\n$$\nb\n$$',
  );
});
