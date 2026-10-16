import { expect, type Page, test } from '@playwright/test';
import {
  createBrowserWorkspaceAndNote,
  getEditorLocator,
  waitForEditorFocus,
} from './common';

// A note's first block must not sit flush under the header. Only a leading
// `h1` used to get top spacing, so notes starting with an `h2`, a paragraph,
// etc. hugged the titlebar.
async function firstBlockGapBelowTitlebar(page: Page) {
  const titlebarBox = await page
    .locator('header.desktop-titlebar-surface')
    .first()
    .boundingBox();
  // Measure where the block's content starts, so spacing applied as the
  // block's own padding counts the same as spacing above it.
  const firstBlockContentTop = await getEditorLocator(page, {})
    .locator('> :first-child')
    .evaluate(
      (el) =>
        el.getBoundingClientRect().top +
        Number.parseFloat(getComputedStyle(el).paddingTop),
    );
  if (!titlebarBox) {
    return 0;
  }
  return firstBlockContentTop - (titlebarBox.y + titlebarBox.height);
}

for (const { firstBlock, typed, tag } of [
  { firstBlock: 'h1 heading', typed: '# Title', tag: 'h1' },
  { firstBlock: 'h2 heading', typed: '## Title', tag: 'h2' },
  { firstBlock: 'paragraph', typed: 'Plain text', tag: 'p' },
]) {
  test(`leaves space between the header and a leading ${firstBlock}`, async ({
    page,
  }) => {
    await createBrowserWorkspaceAndNote(page, {
      workspaceName: `top-spacing-${tag}`,
      noteName: 'Note',
    });

    const editor = getEditorLocator(page, {});
    await editor.click();
    await waitForEditorFocus(page, {});
    await page.keyboard.type(typed);

    await expect(editor.locator(`> ${tag}:first-child`)).toContainText(
      typed.replace(/^#+ /, ''),
    );
    await expect
      .poll(() => firstBlockGapBelowTitlebar(page))
      .toBeGreaterThanOrEqual(24);
  });
}
