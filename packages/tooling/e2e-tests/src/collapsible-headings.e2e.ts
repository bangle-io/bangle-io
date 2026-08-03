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

test('uses inline trailing toggles for nested folds while preserving focus and Markdown through reload', async ({
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

  // Fold the nested section first, then fold and re-open the parent. The
  // parent toggle must preserve the editor focus and the nested fold state.
  await collapseToggles.nth(1).click();
  await expect(editor.getByText('nested content')).toBeHidden();
  await collapseToggles.first().click();
  await expect(editor).toHaveClass(/ProseMirror-focused/);
  await expect(editor.getByText('alpha')).toBeHidden();
  await expect(editor.getByText('Sub')).toBeHidden();

  await editor.getByRole('button', { name: 'Expand section' }).first().click();
  await expect(editor.getByText('alpha')).toBeVisible();
  await expect(editor.getByText('Sub')).toBeVisible();
  await expect(editor.getByText('nested content')).toBeHidden();

  await editor.getByRole('button', { name: 'Expand section' }).first().click();
  await expect(editor.getByText('nested content')).toBeVisible();

  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForSeededBrowserNote(page, seeded);
  const reloadedEditor = getEditorLocator(page, {});
  await expect(reloadedEditor.getByText('nested content')).toBeVisible();
  await expect.poll(() => readSeededBrowserNote(page, seeded)).toBe(SOURCE);
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

  const headingBox = await editor.getByText('One').boundingBox();
  const gammaBox = await editor.getByText('gamma').boundingBox();
  if (!headingBox || !gammaBox) {
    throw new Error('Expected folded heading and drop target to be visible');
  }
  await page.mouse.move(
    headingBox.x + headingBox.width / 2,
    headingBox.y + headingBox.height / 2,
  );
  const dragHandle = page.locator('[data-drag-handle]');
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
  await collapseAll.click();
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
  await expandAll.click();
  for (const text of ['alpha', 'beta', 'Sub', 'nested content', 'gamma']) {
    await expect(editor.getByText(text)).toBeVisible();
  }
  await expect.poll(() => readSeededBrowserNote(page, seeded)).toBe(SOURCE);
});

test('inline toggle geometry preserves native selection and disables a terminal heading toggle', async ({
  page,
}) => {
  const longHeading = `# ${'really long heading that keeps going '.repeat(6)}and ends here`;
  const source = [
    longHeading,
    '',
    'long heading content',
    '',
    '# Select Me Heading',
    '',
    'selection content',
    '',
    '# Terminal',
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
  await expect(editor.getByText('long heading content')).toBeHidden();
  await expect(editor.getByText('Select Me Heading')).toBeVisible();

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

  const terminalToggle = editor
    .locator('h1', { hasText: 'Terminal' })
    .getByRole('button', { name: 'Collapse section' });
  await expect(terminalToggle).toBeDisabled();
  await expect.poll(() => readSeededBrowserNote(page, seeded)).toBe(source);
});
