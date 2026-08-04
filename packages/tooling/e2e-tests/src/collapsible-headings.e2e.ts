import { expect, type Page, test } from '@playwright/test';
import {
  getEditorLocator,
  pressAppShortcut,
  readSeededBrowserNote,
  seedBrowserWorkspaceAndNote,
  waitForEditorFocus,
  waitForSeededBrowserNote,
} from './common';

const SOURCE = [
  '# One',
  '',
  'alpha',
  '',
  'beta',
  '',
  '## Sub',
  '',
  'nested content',
  '',
  '# Two',
  '',
  'gamma',
].join('\n');

const CURSOR_ESCAPED_SOURCE = [
  '# One',
  '',
  'alpha',
  '',
  'beta',
  '',
  '## Sub',
  '',
  'nested content',
  '',
  '# TwoX',
  '',
  'gamma',
].join('\n');

// This is the current Alt/Option+ArrowDown behavior: the folded heading moves
// past the next heading node, while that next heading's content remains after
// it. Keep this explicit until product behavior intentionally changes.
const MOVED_SOURCE = [
  '# Two',
  '',
  '# One',
  '',
  'alpha',
  '',
  'beta',
  '',
  '## Sub',
  '',
  'nested content',
  '',
  'gamma',
].join('\n');

const DRAGGED_SOURCE = [
  '# Two',
  '',
  'gamma',
  '',
  '# One',
  '',
  'alpha',
  '',
  'beta',
  '',
  '## Sub',
  '',
  'nested content',
].join('\n');

async function openSeededNote(
  page: Page,
  workspaceName = 'collapsible-headings',
) {
  const seeded = await seedBrowserWorkspaceAndNote(page, {
    initialMarkdown: SOURCE,
    noteName: 'Home',
    workspaceName,
  });
  const editor = getEditorLocator(page, {});
  await expect(editor.getByText('alpha')).toBeVisible();
  return { editor, seeded };
}

async function waitForAnimationFrame(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      }),
  );
}

test('folds and expands from the inline trailing toggle without losing focus or Markdown', async ({
  page,
}) => {
  const { editor, seeded } = await openSeededNote(page);
  const collapseToggles = editor.getByRole('button', {
    name: 'Collapse section',
  });

  // The toggle is in the heading's inline trailing slot, not in the gutter.
  await expect(collapseToggles).toHaveCount(3);
  const oneHeading = editor.locator('h1', { hasText: 'One' });
  await expect(
    oneHeading.locator(
      '.B-block-trailing-slot > .B-collapsible-heading-toggle',
    ),
  ).toHaveCount(1);

  await editor.getByText('One').click();
  await waitForEditorFocus(page, {});
  const headingSelectionBefore = await oneHeading.evaluate((heading) => {
    const selection = window.getSelection();
    return {
      anchorInHeading:
        selection?.anchorNode != null && heading.contains(selection.anchorNode),
      focusInHeading:
        selection?.focusNode != null && heading.contains(selection.focusNode),
      isCollapsed: selection?.isCollapsed,
    };
  });
  expect(headingSelectionBefore.anchorInHeading).toBe(true);
  expect(headingSelectionBefore.focusInHeading).toBe(true);

  await collapseToggles.first().click();
  await expect(editor).toHaveClass(/ProseMirror-focused/);
  await expect
    .poll(() =>
      editor.evaluate((element) => document.activeElement === element),
    )
    .toBe(true);
  const headingSelectionAfter = await oneHeading.evaluate((heading) => {
    const selection = window.getSelection();
    return {
      anchorInHeading:
        selection?.anchorNode != null && heading.contains(selection.anchorNode),
      focusInHeading:
        selection?.focusNode != null && heading.contains(selection.focusNode),
      isCollapsed: selection?.isCollapsed,
    };
  });
  expect(headingSelectionAfter).toEqual(headingSelectionBefore);
  for (const text of ['alpha', 'beta', 'Sub', 'nested content']) {
    await expect(editor.getByText(text)).toBeHidden();
  }
  for (const text of ['One', 'Two', 'gamma']) {
    await expect(editor.getByText(text)).toBeVisible();
  }
  await expect.poll(() => readSeededBrowserNote(page, seeded)).toBe(SOURCE);

  await editor.getByRole('button', { name: 'Expand section' }).first().click();
  await expect(editor.getByText('alpha')).toBeVisible();
  await expect(editor.getByText('nested content')).toBeVisible();
});

test('a nested fold is session-only and reload restores all stored content', async ({
  page,
}) => {
  const { editor, seeded } = await openSeededNote(
    page,
    'collapsible-headings-reload',
  );

  const collapseToggles = editor.getByRole('button', {
    name: 'Collapse section',
  });
  await collapseToggles.nth(1).click();
  await expect(editor.getByText('nested content')).toBeHidden();
  await expect(editor.getByText('beta')).toBeVisible();
  await expect.poll(() => readSeededBrowserNote(page, seeded)).toBe(SOURCE);

  // Reload while Sub is still folded. Fold state is view-only, so the
  // persisted Markdown remounts with the nested content visible.
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForSeededBrowserNote(page, seeded);
  const reloadedEditor = getEditorLocator(page, {});
  await expect(reloadedEditor.getByText('alpha')).toBeVisible();
  await expect(reloadedEditor.getByText('beta')).toBeVisible();
  await expect(reloadedEditor.getByText('Sub')).toBeVisible();
  await expect(reloadedEditor.getByText('nested content')).toBeVisible();
  await expect(reloadedEditor.getByText('gamma')).toBeVisible();
  await expect.poll(() => readSeededBrowserNote(page, seeded)).toBe(SOURCE);
});

test('browser cursor navigation escapes a folded section before typing', async ({
  page,
}) => {
  const { editor, seeded } = await openSeededNote(
    page,
    'collapsible-headings-cursor',
  );

  await editor
    .getByRole('button', { name: 'Collapse section' })
    .first()
    .click();
  await expect(editor.getByText('alpha')).toBeHidden();

  await editor.getByText('One').click();
  await waitForEditorFocus(page, {});
  await page.keyboard.press('End');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.insertText('X');

  await expect(editor.getByText('X', { exact: false })).toBeVisible();
  for (const text of ['alpha', 'beta', 'Sub', 'nested content']) {
    await expect(editor.getByText(text)).toBeHidden();
  }
  await expect
    .poll(() => readSeededBrowserNote(page, seeded))
    .toBe(CURSOR_ESCAPED_SOURCE);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForSeededBrowserNote(page, seeded);
  const reloadedEditor = getEditorLocator(page, {});
  await expect(reloadedEditor.getByText('One', { exact: true })).toBeVisible();
  await expect(reloadedEditor.getByText('TwoX', { exact: true })).toBeVisible();
  await expect(reloadedEditor.getByText('alpha')).toBeVisible();
  await expect
    .poll(() => readSeededBrowserNote(page, seeded))
    .toBe(CURSOR_ESCAPED_SOURCE);
});

test('native dragging a folded section moves its complete Markdown durably', async ({
  page,
}) => {
  const { editor, seeded } = await openSeededNote(
    page,
    'collapsible-headings-drag',
  );

  await editor
    .getByRole('button', { name: 'Collapse section' })
    .first()
    .click();
  await expect(editor.getByText('alpha')).toBeHidden();

  // The toggle contributes to the heading's accessible name, so scope by the
  // exact heading element/text pair before revealing its owning block handle.
  const oneHeading = editor.locator('h1').filter({ hasText: /^One/ });
  const headingBox = await oneHeading.boundingBox();
  const gammaBox = await editor.getByText('gamma').boundingBox();
  if (!headingBox || !gammaBox) {
    throw new Error('Expected folded heading and drop target to be visible');
  }
  await page.mouse.move(
    headingBox.x + headingBox.width / 2,
    headingBox.y + headingBox.height / 2,
  );
  const editorContainer = editor.locator('..');
  const dragHandle = editorContainer.getByRole('button', {
    name: 'Drag to move',
  });
  await expect(dragHandle).toBeVisible();
  const handleBox = await dragHandle.boundingBox();
  if (!handleBox) {
    throw new Error('Expected the folded heading drag handle to be visible');
  }

  const startX = handleBox.x + handleBox.width / 2;
  const startY = handleBox.y + handleBox.height / 2;
  const dropX = gammaBox.x + gammaBox.width / 2;
  const dropY = gammaBox.y + gammaBox.height + 12;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await waitForAnimationFrame(page);
  await page.mouse.move(startX, startY + 8, { steps: 2 });
  await waitForAnimationFrame(page);
  await page.mouse.move(dropX, dropY, { steps: 12 });
  await waitForAnimationFrame(page);
  await page.mouse.up();

  await expect(editor.getByText('One')).toBeVisible();
  await expect(editor.getByText('alpha')).toBeHidden();
  await expect
    .poll(() => readSeededBrowserNote(page, seeded))
    .toBe(DRAGGED_SOURCE);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForSeededBrowserNote(page, seeded);
  const reloadedEditor = getEditorLocator(page, {});
  await expect(reloadedEditor.getByText('alpha')).toBeVisible();
  await expect(reloadedEditor.getByText('nested content')).toBeVisible();
  await expect(reloadedEditor.getByText('gamma')).toBeVisible();
  await expect
    .poll(() => readSeededBrowserNote(page, seeded))
    .toBe(DRAGGED_SOURCE);
});

test('Alt/Option ArrowDown keeps the current folded-heading move semantics', async ({
  page,
}) => {
  const { editor, seeded } = await openSeededNote(
    page,
    'collapsible-headings-keymap',
  );

  await editor
    .getByRole('button', { name: 'Collapse section' })
    .first()
    .click();
  await editor.getByText('One').click();
  await waitForEditorFocus(page, {});
  await page.keyboard.press('Alt+ArrowDown');

  await expect(editor.getByText('alpha')).toBeHidden();
  await expect(editor.getByText('nested content')).toBeHidden();
  await expect(editor.getByText('gamma')).toBeHidden();
  await expect
    .poll(() => readSeededBrowserNote(page, seeded))
    .toBe(MOVED_SOURCE);

  await editor.getByRole('button', { name: 'Expand section' }).click();
  await expect(editor.getByText('alpha')).toBeVisible();
  await expect(editor.getByText('nested content')).toBeVisible();
  await expect(editor.getByText('gamma')).toBeVisible();
});

test('nested folds survive folding and unfolding the outer section', async ({
  page,
}) => {
  const { editor, seeded } = await openSeededNote(
    page,
    'collapsible-headings-nested',
  );
  const collapseToggles = editor.getByRole('button', {
    name: 'Collapse section',
  });

  await collapseToggles.nth(1).click();
  await expect(editor.getByText('nested content')).toBeHidden();
  await expect(editor.getByText('beta')).toBeVisible();

  await collapseToggles.first().click();
  await expect(editor.getByText('alpha')).toBeHidden();
  await expect(editor.getByText('Sub')).toBeHidden();

  await editor.getByRole('button', { name: 'Expand section' }).first().click();
  await expect(editor.getByText('alpha')).toBeVisible();
  await expect(editor.getByText('Sub')).toBeVisible();
  await expect(editor.getByText('nested content')).toBeHidden();

  await editor.getByRole('button', { name: 'Expand section' }).first().click();
  await expect(editor.getByText('nested content')).toBeVisible();
  await expect(
    editor.getByRole('button', { name: 'Expand section' }),
  ).toHaveCount(0);
  await expect.poll(() => readSeededBrowserNote(page, seeded)).toBe(SOURCE);
});

test('omni search collapses and expands heading sections without writing Markdown', async ({
  page,
}) => {
  const { editor, seeded } = await openSeededNote(
    page,
    'collapsible-headings-omni',
  );
  await editor.getByText('gamma').click();
  await waitForEditorFocus(page, {});

  await pressAppShortcut(page, 'k');
  const commandInput = page.getByPlaceholder('Type a command or search...');
  await commandInput.fill('Collapse All Heading 1');
  const collapseAll = page.getByRole('option', {
    exact: true,
    name: 'Collapse All Heading 1 Sections',
  });
  await expect(collapseAll).toBeVisible();
  await page.keyboard.press('Enter');
  for (const heading of ['One', 'Two']) {
    await expect(editor.getByText(heading, { exact: true })).toBeVisible();
  }
  for (const text of ['alpha', 'beta', 'Sub', 'nested content', 'gamma']) {
    await expect(editor.getByText(text)).toBeHidden();
  }
  await expect.poll(() => readSeededBrowserNote(page, seeded)).toBe(SOURCE);

  await pressAppShortcut(page, 'k');
  await commandInput.fill('Expand All Heading Sections');
  const expandAll = page.getByRole('option', {
    exact: true,
    name: 'Expand All Heading Sections',
  });
  await expect(expandAll).toBeVisible();
  await page.keyboard.press('Enter');
  for (const text of ['alpha', 'beta', 'Sub', 'nested content', 'gamma']) {
    await expect(editor.getByText(text)).toBeVisible();
  }
  await expect.poll(() => readSeededBrowserNote(page, seeded)).toBe(SOURCE);
});

test('the inline fold toggle trails the last line of a wrapped heading', async ({
  page,
}) => {
  const longHeading = `# ${'really long heading that keeps going '.repeat(6)}and ends here`;
  const source = [
    longHeading,
    '',
    'content below',
    '',
    '# Next',
    '',
    'tail',
  ].join('\n');
  const seeded = await seedBrowserWorkspaceAndNote(page, {
    initialMarkdown: source,
    noteName: 'Home',
    workspaceName: 'collapsible-headings-geometry',
  });
  const editor = getEditorLocator(page, {});
  const longHeadingElement = editor.locator('h1').first();
  const toggle = longHeadingElement.getByRole('button', {
    name: 'Collapse section',
  });
  await expect(longHeadingElement).toContainText('and ends here');

  const headingBox = await longHeadingElement.boundingBox();
  const toggleBox = await toggle.boundingBox();
  if (!headingBox || !toggleBox) {
    throw new Error('Expected wrapped heading and inline toggle geometry');
  }
  expect(headingBox.height).toBeGreaterThan(toggleBox.height * 3);
  expect(toggleBox.y).toBeGreaterThan(headingBox.y + headingBox.height / 2);
  expect(toggleBox.y + toggleBox.height).toBeLessThanOrEqual(
    headingBox.y + headingBox.height + 1,
  );

  await toggle.click();
  await expect(editor.getByText('content below')).toBeHidden();
  await expect(editor.getByText('tail')).toBeVisible();
  await expect.poll(() => readSeededBrowserNote(page, seeded)).toBe(source);

  await longHeadingElement
    .getByRole('button', { name: 'Expand section' })
    .click();
  await expect(editor.getByText('content below')).toBeVisible();
});

test('dragging left from heading whitespace selects heading text', async ({
  page,
}) => {
  const source = [
    '# Select Me Heading',
    '',
    'content below',
    '',
    '# Next',
    '',
    'tail',
  ].join('\n');
  await seedBrowserWorkspaceAndNote(page, {
    initialMarkdown: source,
    noteName: 'Home',
    workspaceName: 'collapsible-headings-selection',
  });
  const editor = getEditorLocator(page, {});

  const selectionHeading = editor.locator('h1', {
    hasText: 'Select Me Heading',
  });
  await selectionHeading.scrollIntoViewIfNeeded();
  const dragMetrics = await selectionHeading.evaluate((element) => {
    const textNode = [...element.childNodes].find(
      (node): node is Text =>
        node.nodeType === Node.TEXT_NODE &&
        node.textContent?.includes('Select Me Heading') === true,
    );
    if (!textNode) {
      throw new Error('Expected heading text node');
    }
    const range = document.createRange();
    range.selectNodeContents(textNode);
    const textRect = range.getBoundingClientRect();
    const headingRect = element.getBoundingClientRect();
    range.detach();
    if (headingRect.right - textRect.right < 48) {
      throw new Error('Expected whitespace after heading text');
    }
    return {
      endX: textRect.left + 1,
      startX: headingRect.right - 8,
      y: textRect.top + textRect.height / 2,
    };
  });
  await page.mouse.move(dragMetrics.startX, dragMetrics.y);
  await page.mouse.down();
  await page.mouse.move(dragMetrics.endX, dragMetrics.y, { steps: 12 });
  await page.mouse.up();
  await expect
    .poll(() => page.evaluate(() => window.getSelection()?.toString() ?? ''))
    .toContain('Select Me Heading');
});

test('a heading with nothing beneath it has an inert disabled toggle', async ({
  page,
}) => {
  const source = ['# Empty', '', '# Full', '', 'content below'].join('\n');
  const seeded = await seedBrowserWorkspaceAndNote(page, {
    initialMarkdown: source,
    noteName: 'Home',
    workspaceName: 'collapsible-headings-empty',
  });
  const editor = getEditorLocator(page, {});
  await expect(editor.getByText('content below')).toBeVisible();

  const emptyToggle = editor
    .locator('h1', { hasText: 'Empty' })
    .getByRole('button', { name: 'Collapse section' });
  const fullToggle = editor
    .locator('h1', { hasText: 'Full' })
    .getByRole('button', { name: 'Collapse section' });

  await expect(emptyToggle).toBeDisabled();
  await expect(fullToggle).toBeEnabled();
  await emptyToggle.click({ force: true });
  await expect(editor.getByText('content below')).toBeVisible();
  await expect.poll(() => readSeededBrowserNote(page, seeded)).toBe(source);

  await fullToggle.click();
  await expect(editor.getByText('content below')).toBeHidden();
});
