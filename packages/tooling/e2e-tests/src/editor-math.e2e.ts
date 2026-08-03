import { expect, test } from '@playwright/test';
import {
  collapseEditorSelectionAfterText,
  ctrlKey,
  expectNoPageHorizontalOverflow,
  getEditorLocator,
  readSeededBrowserNote,
  seedBrowserWorkspaceAndNote,
  waitForEditorFocus,
  waitForSeededBrowserNote,
} from './common';

const AUTHORING_SOURCE = String.raw`Spent $5 on **bold**

Euler $e^{i\pi} + 1 = 1$ with $a **b**$

$$
\notacommand{
$$`;
const UNSAFE_SOURCE = [
  String.raw`and \$a\$b\$`,
  '',
  'irreplaceable prose',
  '',
  '```',
  '$$',
  'a',
  '$$',
  'b',
  '$$',
  '```',
].join('\n');

test('authors, renders, recovers, copies, and persists canonical math', async ({
  context,
  page,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const seeded = await seedBrowserWorkspaceAndNote(page, {
    noteName: 'Math',
    workspaceName: 'math-authoring',
  });
  const editor = getEditorLocator(page, {});
  await editor.click();
  await waitForEditorFocus(page, {});

  await editor.pressSequentially('Spent $5 on **bold**');
  await expect(editor.locator('strong')).toHaveText('bold');
  await editor.press('Enter');
  await editor.pressSequentially(
    String.raw`Euler $e^{i\pi} + 1 = 0$ with $a **b**$`,
  );
  const inlineMath = editor.locator('math-inline').first();
  await expect(inlineMath.locator('.katex')).toBeVisible();
  await inlineMath.locator('.math-render').click();
  const inlineSource = inlineMath.locator('.math-src .ProseMirror');
  await expect(inlineSource).toHaveText(String.raw`e^{i\pi} + 1 = 0`);
  await inlineSource.fill(String.raw`e^{i\pi} + 1 = 1`);
  await inlineSource.press('Control+Enter');

  const formattingLikeMath = editor.locator('math-inline').nth(1);
  await formattingLikeMath.locator('.math-render').click();
  await expect(formattingLikeMath.locator('.math-src .ProseMirror')).toHaveText(
    'a **b**',
  );
  await formattingLikeMath
    .locator('.math-src .ProseMirror')
    .press('Control+Enter');

  await editor.press('End');
  await page.keyboard.press('Enter');
  await page.keyboard.insertText('/');
  const mathBlock = page.getByRole('option', { name: /^Math block/ });
  await expect(mathBlock).toBeVisible();
  await mathBlock.click();
  const displayMath = editor.locator('math-display');
  const displaySource = displayMath.locator('.math-src .ProseMirror');
  await expect(displaySource).toBeVisible();
  await displaySource.fill(String.raw`\frac{a}{b} + \sqrt{x}`);
  await displaySource.press('End');
  await displaySource.press('ArrowRight');
  await expect(displayMath.locator('.math-render .katex')).toBeVisible();
  await expect(
    displayMath.locator('math annotation[encoding="application/x-tex"]'),
  ).toHaveText(String.raw`\frac{a}{b} + \sqrt{x}`);

  await displayMath.locator('.math-render').click();
  await displaySource.fill(String.raw`\notacommand{`);
  await displaySource.press('Control+Enter');
  const invalidFallback = displayMath.locator('.katex-error');
  await expect(invalidFallback).toBeVisible();
  await expect(invalidFallback).toContainText(String.raw`\notacommand{`);
  await invalidFallback.click();
  await expect(displaySource).toHaveText(String.raw`\notacommand{`);
  await displaySource.press('Control+Enter');

  await collapseEditorSelectionAfterText(page, 'Euler ');
  await page.keyboard.press('Shift+ArrowRight');
  await page.keyboard.press(`${ctrlKey}+c`);
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe(String.raw`$e^{i\pi} + 1 = 1$`);

  await expect
    .poll(() => readSeededBrowserNote(page, seeded))
    .toBe(AUTHORING_SOURCE);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForSeededBrowserNote(page, seeded);
  const reloadedEditor = getEditorLocator(page, {});
  const reloadedInlineKatex = reloadedEditor.locator('math-inline .katex');
  await expect(reloadedInlineKatex).toHaveCount(2);
  await expect(reloadedInlineKatex.first()).toBeVisible();
  await expect(
    reloadedEditor
      .locator('math-inline')
      .first()
      .locator('math annotation[encoding="application/x-tex"]'),
  ).toHaveText(String.raw`e^{i\pi} + 1 = 1`);
  const reloadedInvalidFallback = reloadedEditor.locator(
    'math-display .katex-error',
  );
  await expect(reloadedInvalidFallback).toBeVisible();
  await expect(reloadedInvalidFallback).toContainText(
    String.raw`\notacommand{`,
  );
  expect(
    await reloadedInvalidFallback.evaluate((node) =>
      node.closest('[aria-hidden="true"]'),
    ),
  ).toBeNull();
  await expect
    .poll(() => readSeededBrowserNote(page, seeded))
    .toBe(AUTHORING_SOURCE);
});

test('nested math editing keeps select-all and history scoped to the source editor', async ({
  page,
}) => {
  const source = 'KEEP\n\n$$\nabc\n$$';
  const seeded = await seedBrowserWorkspaceAndNote(page, {
    initialMarkdown: source,
    noteName: 'Math',
    workspaceName: 'math-nested-history',
  });
  // The nested source is also a ProseMirror; bind the outer editor before
  // opening it so assertions keep addressing the note rather than both views.
  const editor = page.locator('.ProseMirror[data-editor-name]');
  const displayMath = editor.locator('math-display');
  await displayMath.locator('.math-render').click();
  const sourceEditor = displayMath.locator('.math-src .ProseMirror');
  await expect(sourceEditor).toBeFocused();
  await sourceEditor.press(`${ctrlKey}+a`);
  await page.keyboard.insertText('xyz');
  await expect(sourceEditor).toHaveText('xyz');
  await expect(editor).toContainText('KEEP');
  await expect
    .poll(() => readSeededBrowserNote(page, seeded))
    .toBe('KEEP\n\n$$\nxyz\n$$');

  await sourceEditor.press(`${ctrlKey}+z`);
  await expect(sourceEditor).toBeFocused();
  await expect(sourceEditor).toHaveText('abc');
  await expect(editor).toContainText('KEEP');
  await expect.poll(() => readSeededBrowserNote(page, seeded)).toBe(source);
});

test('unsafe math edits and multiline paste preserve following prose as literal durable Markdown', async ({
  context,
  page,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const seeded = await seedBrowserWorkspaceAndNote(page, {
    initialMarkdown: '$x$and $y$\n\nirreplaceable prose\n\n$$\nreplace me\n$$',
    noteName: 'Math safety',
    workspaceName: 'math-unsafe-source',
  });
  const editor = getEditorLocator(page, {});
  const inlineMath = editor.locator('math-inline');
  await inlineMath.nth(0).locator('.math-render').click();
  const firstInlineSource = inlineMath.nth(0).locator('.math-src .ProseMirror');
  await firstInlineSource.fill('');
  await firstInlineSource.press('Control+Enter');
  await inlineMath.nth(1).locator('.math-render').click();
  const secondInlineSource = inlineMath
    .nth(1)
    .locator('.math-src .ProseMirror');
  await secondInlineSource.fill('a$b');
  await secondInlineSource.press('Control+Enter');

  const displayMath = editor.locator('math-display');
  await displayMath.locator('.math-render').click();
  const displaySource = displayMath.locator('.math-src .ProseMirror');
  await displaySource.press(`${ctrlKey}+a`);
  await page.evaluate(() => navigator.clipboard.writeText('a\n$$\nb'));
  await displaySource.press(`${ctrlKey}+v`);
  await expect(displaySource).toHaveText('a\n$$\nb');
  await displaySource.press('Control+Enter');

  await expect(editor.getByText('irreplaceable prose')).toHaveCount(1);
  await expect
    .poll(() => readSeededBrowserNote(page, seeded))
    .toBe(UNSAFE_SOURCE);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForSeededBrowserNote(page, seeded);
  const reloadedEditor = getEditorLocator(page, {});
  await expect(reloadedEditor.locator('math-inline')).toHaveCount(0);
  await expect(reloadedEditor.locator('math-display')).toHaveCount(0);
  await expect(reloadedEditor.locator('pre code')).toContainText(
    '$$\na\n$$\nb\n$$',
  );
  await expect(reloadedEditor.getByText('irreplaceable prose')).toHaveCount(1);
  await expect
    .poll(() => readSeededBrowserNote(page, seeded))
    .toBe(UNSAFE_SOURCE);
});

test('narrow inline math contains its own overflow and exposes the TeX MathML annotation', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 800 });
  const longSource = Array.from(
    { length: 40 },
    (_, index) => `x_{${index}}^2`,
  ).join('+');
  const seeded = await seedBrowserWorkspaceAndNote(page, {
    initialMarkdown: `Before $${longSource}$ after`,
    noteName: 'Long inline math',
    workspaceName: 'math-inline-overflow',
  });
  const editor = getEditorLocator(page, {});
  const inlineMath = editor.locator('math-inline');

  await expect(inlineMath.locator('.katex')).toBeVisible();
  await expectNoPageHorizontalOverflow(page);
  const widths = await inlineMath.evaluate((node) => ({
    clientWidth: node.clientWidth,
    scrollWidth: node.scrollWidth,
  }));
  expect(widths.clientWidth).toBeGreaterThan(0);
  expect(widths.scrollWidth).toBeGreaterThan(widths.clientWidth);
  await expect(
    inlineMath.locator('math annotation[encoding="application/x-tex"]'),
  ).toHaveText(longSource);
  await expect
    .poll(() => readSeededBrowserNote(page, seeded))
    .toBe(`Before $${longSource}$ after`);
});
