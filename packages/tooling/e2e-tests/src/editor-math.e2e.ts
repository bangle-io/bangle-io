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

const INVALID_TEXT_SELECTION_WARNING =
  'TextSelection endpoint not pointing into a node with inline content';
const AUTHORING_SOURCE = String.raw`Euler $e^{i\pi} + 1 = 1$ with $a **b**$

$$
\notacommand{
$$`;
const UNSAFE_SOURCE = [
  String.raw`and \$a\$b\$`,
  '',
  'irreplaceable prose',
  '',
  '$$',
  'valid neighbor',
  '$$',
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
  const invalidSelectionWarnings: string[] = [];
  page.on('console', (message) => {
    if (
      message.type() === 'warning' &&
      message.text().includes(INVALID_TEXT_SELECTION_WARNING)
    ) {
      invalidSelectionWarnings.push(message.text());
    }
  });
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const seeded = await seedBrowserWorkspaceAndNote(page, {
    noteName: 'Math',
    workspaceName: 'math-authoring',
  });
  const editor = getEditorLocator(page, {});
  await editor.click();
  await waitForEditorFocus(page, {});

  await editor.pressSequentially(
    String.raw`Euler $e^{i\pi} + 1 = 0$ with $a **b**$`,
  );
  const inlineMath = editor.locator('math-inline').first();
  await expect(inlineMath.locator('.katex')).toBeVisible();
  await inlineMath.locator('.math-render').click();
  const inlineSource = inlineMath.locator('.math-src .ProseMirror');
  await expect(inlineSource).toHaveText(String.raw`e^{i\pi} + 1 = 0`);
  await expect
    .poll(() =>
      inlineMath.evaluate((element) => getComputedStyle(element).boxShadow),
    )
    .toBe('none');
  await inlineSource.fill(String.raw`e^{i\pi} + 1 = 1`);
  await inlineSource.press('Control+Enter');
  expect(invalidSelectionWarnings).toEqual([]);

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
  expect(invalidSelectionWarnings).toEqual([]);
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
  expect(invalidSelectionWarnings).toEqual([]);

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
  expect(invalidSelectionWarnings).toEqual([]);
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
  const outerProse = editor.locator(':scope > p').first();
  await displayMath.locator('.math-render').click();
  const sourceEditor = displayMath.locator('.math-src .ProseMirror');
  await expect(sourceEditor).toBeFocused();
  await sourceEditor.press(`${ctrlKey}+a`);
  await page.keyboard.insertText('xyz');
  await expect(sourceEditor).toHaveText('xyz');
  await expect(outerProse).toHaveText('KEEP');
  await expect
    .poll(() => readSeededBrowserNote(page, seeded))
    .toBe('KEEP\n\n$$\nxyz\n$$');

  await sourceEditor.press(`${ctrlKey}+z`);
  await expect(sourceEditor).toBeFocused();
  await expect(sourceEditor).toHaveText('abc');
  await expect(outerProse).toHaveText('KEEP');
  await expect.poll(() => readSeededBrowserNote(page, seeded)).toBe(source);

  await sourceEditor.press(`${ctrlKey}+Shift+z`);
  await expect(sourceEditor).toBeFocused();
  await expect(sourceEditor).toHaveText('xyz');
  await expect(outerProse).toHaveText('KEEP');
  await expect
    .poll(() => readSeededBrowserNote(page, seeded))
    .toBe('KEEP\n\n$$\nxyz\n$$');
});

test('currency and existing shell variables keep later input rules active after reload', async ({
  page,
}) => {
  const seeded = await seedBrowserWorkspaceAndNote(page, {
    noteName: 'Currency',
    workspaceName: 'math-currency-rules',
  });
  const editor = getEditorLocator(page, {});
  await editor.click();
  await waitForEditorFocus(page, {});
  await editor.pressSequentially(
    String.raw`Spent $5 on **lunch** [[Home]] and \$1`,
  );
  await editor.press('Enter');
  await editor.pressSequentially('Shell $PATH then ');

  await expect(editor.locator('strong')).toHaveText('lunch');
  await expect(editor.locator('.wiki-link')).toHaveText('Home');
  await expect(editor).toContainText('Spent $5 on lunch Home and $1');
  await expect
    .poll(() => readSeededBrowserNote(page, seeded))
    .toBe(String.raw`Spent $5 on **lunch** [[Home]] and \$1

Shell $PATH then `);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForSeededBrowserNote(page, seeded);
  const reloadedEditor = getEditorLocator(page, {});
  await expect(reloadedEditor.locator('strong')).toHaveText('lunch');
  await expect(reloadedEditor.locator('.wiki-link')).toHaveText('Home');
  await reloadedEditor.click();
  await waitForEditorFocus(page, {});
  await reloadedEditor.press('End');
  // Reload canonicalizes the trailing paragraph space, so reintroduce the
  // word boundary required by the bold input rule.
  await reloadedEditor.pressSequentially(' **bold** [[Home]]');

  await expect(reloadedEditor.locator('strong')).toHaveText(['lunch', 'bold']);
  await expect(reloadedEditor.locator('.wiki-link')).toHaveText([
    'Home',
    'Home',
  ]);
  await expect
    .poll(() => readSeededBrowserNote(page, seeded))
    .toBe(String.raw`Spent $5 on **lunch** [[Home]] and \$1

Shell $PATH then **bold** [[Home]]`);
});

test('unsafe math edits and multiline paste preserve following prose as literal durable Markdown', async ({
  context,
  page,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const seeded = await seedBrowserWorkspaceAndNote(page, {
    initialMarkdown: [
      '$x$and $y$',
      '',
      'irreplaceable prose',
      '',
      '$$',
      'valid neighbor',
      '$$',
      '',
      '$$',
      'replace me',
      '$$',
    ].join('\n'),
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
  await expect(displayMath).toHaveCount(2);
  await expect(
    displayMath
      .first()
      .locator('math annotation[encoding="application/x-tex"]'),
  ).toHaveText('valid neighbor');
  const unsafeDisplayMath = displayMath.nth(1);
  await unsafeDisplayMath.locator('.math-render').click();
  const displaySource = unsafeDisplayMath.locator('.math-src .ProseMirror');
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
  const reloadedDisplayMath = reloadedEditor.locator('math-display');
  await expect(reloadedDisplayMath).toHaveCount(1);
  await expect(
    reloadedDisplayMath.locator(
      'math annotation[encoding="application/x-tex"]',
    ),
  ).toHaveText('valid neighbor');
  const fallbackCode = reloadedEditor.locator('pre code');
  await expect(fallbackCode).toHaveCount(1);
  await expect(fallbackCode).toContainText('$$\na\n$$\nb\n$$');
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
