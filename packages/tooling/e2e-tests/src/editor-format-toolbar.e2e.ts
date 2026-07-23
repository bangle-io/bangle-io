import { expect, test } from '@playwright/test';
import {
  createBrowserWorkspaceAndNote,
  getEditorLocator,
  readStoredMarkdown,
  selectEditorText,
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

  // A plain paragraph reports itself as the active block.
  await selectEditorText(page, 'alpha');
  await expect(toolbar).toBeVisible();
  await expect(paragraph).toHaveAttribute('aria-pressed', 'true');
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
