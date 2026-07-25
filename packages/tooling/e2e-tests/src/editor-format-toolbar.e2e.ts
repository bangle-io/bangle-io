import { expect, test } from '@playwright/test';
import {
  createBrowserWorkspaceAndNote,
  expectNoPageHorizontalOverflow,
  getEditorLocator,
  readStoredMarkdown,
  selectEditorText,
  writeStoredMarkdown,
} from './common';

// The selection toolbar exposes block-type controls (paragraph, headings,
// lists) alongside the inline mark toggles. Each reflects the selection's
// current block as an active (aria-pressed) state and toggles it on click.
//
// Each line leads with a filler word so the selected word sits mid-block: the
// text-selection helper concatenates block text without separators, so a word
// at a block's start would resolve to a cross-block range.
test('selection toolbar converts block types and reflects the active block', async ({
  page,
}) => {
  const workspaceName = 'format-toolbar';
  const noteName = 'blocks';
  await createBrowserWorkspaceAndNote(page, { workspaceName, noteName });

  const editor = getEditorLocator(page, {});
  await editor.click();
  await page.keyboard.insertText('line alpha');
  await page.keyboard.press('Enter');
  await page.keyboard.insertText('line bravo');
  await page.keyboard.press('Enter');
  await page.keyboard.insertText('line charlie');

  const toolbar = page.getByRole('toolbar', { name: 'Text formatting' });
  const paragraph = toolbar.getByRole('button', { name: 'Paragraph' });
  const heading1 = toolbar.getByRole('button', { name: 'Heading 1' });
  const bulletList = toolbar.getByRole('button', { name: 'Bullet list' });

  // A plain paragraph reports itself as the active block. Paragraph is
  // disabled here because there is nothing to convert — so it never looks
  // actionable while no-oping.
  await selectEditorText(page, 'alpha');
  await expect(toolbar).toBeVisible();
  await expect(paragraph).toHaveAttribute('aria-pressed', 'true');
  await expect(paragraph).toBeDisabled();
  await expect(heading1).toHaveAttribute('aria-pressed', 'false');

  // Convert to a heading: the active state moves to Heading 1 and the
  // document (and its Markdown) reflect the new block.
  await heading1.click();
  await expect(heading1).toHaveAttribute('aria-pressed', 'true');
  await expect(paragraph).toHaveAttribute('aria-pressed', 'false');
  await expect(
    editor.getByRole('heading', { level: 1, name: 'line alpha' }),
  ).toBeVisible();
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, noteName))
    .toBe('# line alpha\n\nline bravo\n\nline charlie');

  // Clicking the active heading toggles the block back to a paragraph.
  await heading1.click();
  await expect(paragraph).toHaveAttribute('aria-pressed', 'true');
  await expect(heading1).toHaveAttribute('aria-pressed', 'false');
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, noteName))
    .toBe('line alpha\n\nline bravo\n\nline charlie');

  // Convert a different paragraph to a bullet list. The list becomes active
  // and Paragraph does NOT stay lit, even though a list item still wraps a
  // paragraph — the toolbar reports the outer block, not the nested one.
  await selectEditorText(page, 'bravo');
  await bulletList.click();
  await expect(bulletList).toHaveAttribute('aria-pressed', 'true');
  await expect(paragraph).toHaveAttribute('aria-pressed', 'false');
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, noteName))
    .toBe('line alpha\n\n- line bravo\n\nline charlie');

  // Paragraph must be actionable inside a list and lift the item back out to a
  // plain paragraph — `convertToParagraph` alone no-ops there because the list
  // item already wraps a paragraph.
  await expect(paragraph).toBeEnabled();
  await paragraph.click();
  await expect(paragraph).toHaveAttribute('aria-pressed', 'true');
  await expect(bulletList).toHaveAttribute('aria-pressed', 'false');
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, noteName))
    .toBe('line alpha\n\nline bravo\n\nline charlie');

  // Re-apply the list so the reload below exercises list persistence.
  await bulletList.click();
  await expect(bulletList).toHaveAttribute('aria-pressed', 'true');
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, noteName))
    .toBe('line alpha\n\n- line bravo\n\nline charlie');

  // The block conversions survive a reload: the stored Markdown is unchanged
  // and the reloaded editor still reports the list as the active block.
  await page.reload({ waitUntil: 'networkidle' });
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, noteName))
    .toBe('line alpha\n\n- line bravo\n\nline charlie');
  await selectEditorText(page, 'bravo');
  await expect(toolbar).toBeVisible();
  await expect(bulletList).toHaveAttribute('aria-pressed', 'true');
  await expect(paragraph).toHaveAttribute('aria-pressed', 'false');
});

// "Turn into paragraph" is whole-selection aware: it converts every block in
// the selection, not just the one under the caret, and flattens nested blocks
// in a single click.
test('Paragraph converts an entire mixed or nested selection in one click', async ({
  page,
}) => {
  const workspaceName = 'format-toolbar-paragraph';
  const noteName = 'para';
  await createBrowserWorkspaceAndNote(page, { workspaceName, noteName });

  const toolbar = page.getByRole('toolbar', { name: 'Text formatting' });
  const paragraph = toolbar.getByRole('button', { name: 'Paragraph' });

  // A selection spanning a paragraph and a following heading is not "all
  // paragraphs", so the control stays actionable and one click converts the
  // heading too (the caret-block alone would report an already-a-paragraph
  // no-op).
  await writeStoredMarkdown(page, workspaceName, noteName, 'alpha\n\n## bravo');
  await page.reload({ waitUntil: 'networkidle' });
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, noteName))
    .toBe('alpha\n\n## bravo');
  await selectEditorText(page, 'alphabravo');
  await expect(toolbar).toBeVisible();
  await expect(paragraph).toBeEnabled();
  await expect(paragraph).toHaveAttribute('aria-pressed', 'false');
  await paragraph.click();
  await expect(paragraph).toHaveAttribute('aria-pressed', 'true');
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, noteName))
    .toBe('alpha\n\nbravo');

  // A list nested inside a blockquote flattens to a plain paragraph in a single
  // click (both the list and the blockquote are peeled off).
  await writeStoredMarkdown(page, workspaceName, noteName, '> - item');
  await page.reload({ waitUntil: 'networkidle' });
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, noteName))
    .toBe('> - item');
  await selectEditorText(page, 'item');
  await expect(toolbar).toBeVisible();
  await expect(paragraph).toBeEnabled();
  await paragraph.click();
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, noteName))
    .toBe('item');
  await expect(paragraph).toHaveAttribute('aria-pressed', 'true');

  // The flattening loop must be driven by document progress, not an arbitrary
  // nesting cap. Ten blockquote levels previously stopped halfway through.
  const deeplyNested = `${'> '.repeat(10)}- deep item`;
  await writeStoredMarkdown(page, workspaceName, noteName, deeplyNested);
  await page.reload({ waitUntil: 'networkidle' });
  await selectEditorText(page, 'deep item');
  await expect(paragraph).toBeEnabled();
  await paragraph.click();
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, noteName))
    .toBe('deep item');
  await expect(paragraph).toHaveAttribute('aria-pressed', 'true');
});

// The toolbar now carries enough controls that it can be wider than a phone
// viewport. It must wrap within the viewport rather than overflow the page.
test('selection toolbar wraps instead of overflowing a narrow viewport', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await createBrowserWorkspaceAndNote(page, {
    workspaceName: 'format-toolbar-narrow',
    noteName: 'narrow',
  });

  const editor = getEditorLocator(page, {});
  await editor.click();
  await page.keyboard.insertText('some selectable body text');

  const toolbar = page.getByRole('toolbar', { name: 'Text formatting' });
  await selectEditorText(page, 'selectable');
  await expect(toolbar).toBeVisible();

  // Every control stays reachable (the row wraps, nothing is clipped away).
  await expect(toolbar.getByRole('button', { name: 'Bold' })).toBeVisible();
  await expect(
    toolbar.getByRole('button', { name: 'Task list' }),
  ).toBeVisible();

  // The page itself must not gain horizontal scroll from the wide toolbar.
  await expectNoPageHorizontalOverflow(page);
});
