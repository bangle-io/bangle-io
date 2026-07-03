import { expect, type Page, test } from '@playwright/test';
import {
  createBrowserWorkspaceAndNote,
  getEditorLocator,
  pressAppShortcut,
  readStoredMarkdown,
  waitForEditorFocus,
  writeStoredMarkdown,
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

async function openSeededNote(page: Page) {
  const workspaceName = 'collapsible-headings';
  const noteName = 'Home';
  await createBrowserWorkspaceAndNote(page, { workspaceName, noteName });
  await writeStoredMarkdown(page, workspaceName, noteName, SOURCE);
  await page.reload();

  const editor = getEditorLocator(page, {});
  await expect(editor.getByText('alpha')).toBeVisible();
  return { editor, noteName, workspaceName };
}

test('folds and expands a heading section from the gutter toggle', async ({
  page,
}) => {
  const { editor, noteName, workspaceName } = await openSeededNote(page);

  // "One", "Sub", and "Two" all have content beneath them.
  const collapseToggles = editor.getByRole('button', {
    name: 'Collapse section',
  });
  await expect(collapseToggles).toHaveCount(3);

  await collapseToggles.first().click();

  // Everything under "# One" up to "# Two" is hidden, including the nested
  // "## Sub" heading; the rest of the note stays visible.
  await expect(editor.getByText('alpha')).toBeHidden();
  await expect(editor.getByText('beta')).toBeHidden();
  await expect(editor.getByText('Sub')).toBeHidden();
  await expect(editor.getByText('nested content')).toBeHidden();
  await expect(editor.getByText('One')).toBeVisible();
  await expect(editor.getByText('gamma')).toBeVisible();

  // Folding is a view concern: the stored Markdown must keep every byte.
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, noteName))
    .toBe(SOURCE);

  await editor.getByRole('button', { name: 'Expand section' }).click();
  await expect(editor.getByText('alpha')).toBeVisible();
  await expect(editor.getByText('nested content')).toBeVisible();
});

test('a folded note survives reload with no content lost', async ({ page }) => {
  const { editor, noteName, workspaceName } = await openSeededNote(page);

  await editor
    .getByRole('button', { name: 'Collapse section' })
    .first()
    .click();
  await expect(editor.getByText('alpha')).toBeHidden();

  await page.reload();

  // Fold state is per-session; after reload the full note is visible again
  // and nothing was written back to storage.
  const reloadedEditor = getEditorLocator(page, {});
  await expect(reloadedEditor.getByText('alpha')).toBeVisible();
  await expect(reloadedEditor.getByText('beta')).toBeVisible();
  await expect(reloadedEditor.getByText('nested content')).toBeVisible();
  await expect(reloadedEditor.getByText('gamma')).toBeVisible();
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, noteName))
    .toBe(SOURCE);
});

test('the cursor cannot get stranded inside a folded section', async ({
  page,
}) => {
  const { editor, noteName, workspaceName } = await openSeededNote(page);

  await editor
    .getByRole('button', { name: 'Collapse section' })
    .first()
    .click();
  await expect(editor.getByText('alpha')).toBeHidden();

  // Walk from the folded heading towards the hidden region and type: the
  // text must land in visible content, not vanish into the fold.
  await editor.getByText('One').click();
  await waitForEditorFocus(page, {});
  await page.keyboard.press('End');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.insertText('X');

  await expect(editor.getByText('X', { exact: false })).toBeVisible();
  await expect(editor.getByText('alpha')).toBeHidden();

  // The folded content is still intact in storage alongside the new text.
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, noteName))
    .toContain('alpha');
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, noteName))
    .toContain('X');
});

test('dragging a folded heading moves the whole section without losing content', async ({
  page,
}) => {
  const { editor, noteName, workspaceName } = await openSeededNote(page);

  await editor
    .getByRole('button', { name: 'Collapse section' })
    .first()
    .click();
  await expect(editor.getByText('alpha')).toBeHidden();

  // Reveal the drag handle by hovering the folded heading, then drive a
  // native drag from the handle to below the last paragraph. Stepped moves
  // with settled frames keep the HTML5 drag gesture from collapsing into a
  // click.
  const headingBox = await editor.getByText('One').boundingBox();
  const gammaBox = await editor.getByText('gamma').boundingBox();
  if (!headingBox || !gammaBox) {
    throw new Error('Expected heading and drop target to be visible');
  }
  await page.mouse.move(
    headingBox.x + headingBox.width / 2,
    headingBox.y + headingBox.height / 2,
  );
  const handle = page.locator('[data-drag-handle]');
  await expect(handle).toBeVisible();
  const handleBox = await handle.boundingBox();
  if (!handleBox) {
    throw new Error('Expected the drag handle to be visible');
  }

  const startX = handleBox.x + handleBox.width / 2;
  const startY = handleBox.y + handleBox.height / 2;
  const dropX = gammaBox.x + gammaBox.width / 2;
  const dropY = gammaBox.y + gammaBox.height + 12;
  const settleFrame = () => page.waitForTimeout(60);

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await settleFrame();
  // Wiggle towards the drop target to start the drag.
  await page.mouse.move(startX, startY + 8);
  await settleFrame();
  await page.mouse.move((startX + dropX) / 2, (startY + dropY) / 2);
  await settleFrame();
  await page.mouse.move(dropX, dropY);
  await settleFrame();
  await page.mouse.move(dropX, dropY);
  await settleFrame();
  await page.mouse.up();

  // The whole section travelled: it is still folded at its new home and
  // nothing is missing once expanded.
  await expect(editor.getByText('One')).toBeVisible();
  await expect(editor.getByText('alpha')).toBeHidden();
  await expect
    .poll(async () => {
      const markdown =
        (await readStoredMarkdown(page, workspaceName, noteName)) ?? '';
      return (
        markdown.indexOf('gamma') !== -1 &&
        markdown.indexOf('gamma') < markdown.indexOf('# One')
      );
    })
    .toBe(true);
  const movedMarkdown =
    (await readStoredMarkdown(page, workspaceName, noteName)) ?? '';
  for (const line of ['alpha', 'beta', '## Sub', 'nested content', 'gamma']) {
    expect(movedMarkdown).toContain(line);
  }

  await editor.getByRole('button', { name: 'Expand section' }).click();
  await expect(editor.getByText('alpha')).toBeVisible();
  await expect(editor.getByText('nested content')).toBeVisible();
});

test('nested folds survive folding and unfolding the outer section', async ({
  page,
}) => {
  const { editor } = await openSeededNote(page);
  const collapseToggles = editor.getByRole('button', {
    name: 'Collapse section',
  });

  // Fold the inner "## Sub" first (toggles are in document order).
  await collapseToggles.nth(1).click();
  await expect(editor.getByText('nested content')).toBeHidden();
  await expect(editor.getByText('beta')).toBeVisible();

  // Fold the enclosing "# One": everything under it hides, including Sub.
  await collapseToggles.first().click();
  await expect(editor.getByText('alpha')).toBeHidden();
  await expect(editor.getByText('Sub')).toBeHidden();

  // Unfold "# One": Sub comes back still folded.
  await editor.getByRole('button', { name: 'Expand section' }).first().click();
  await expect(editor.getByText('Sub')).toBeVisible();
  await expect(editor.getByText('alpha')).toBeVisible();
  await expect(editor.getByText('nested content')).toBeHidden();

  // Unfold "## Sub": back exactly where we started.
  await editor.getByRole('button', { name: 'Expand section' }).first().click();
  await expect(editor.getByText('nested content')).toBeVisible();
  await expect(
    editor.getByRole('button', { name: 'Expand section' }),
  ).toHaveCount(0);
});

test('collapse-all and expand-all heading commands work from omni search', async ({
  page,
}) => {
  const { editor } = await openSeededNote(page);
  await editor.getByText('gamma').click();
  await waitForEditorFocus(page, {});

  await pressAppShortcut(page, 'k');
  const commandInput = page.getByPlaceholder('Type a command or search...');
  await commandInput.fill('Collapse All Heading 1');
  await page.keyboard.press('Enter');

  // Both level-1 sections fold; the nested "## Sub" hides with One's section
  // but must not gain fold state of its own.
  await expect(editor.getByText('alpha')).toBeHidden();
  await expect(editor.getByText('beta')).toBeHidden();
  await expect(editor.getByText('Sub')).toBeHidden();
  await expect(editor.getByText('nested content')).toBeHidden();
  await expect(editor.getByText('gamma')).toBeHidden();
  await expect(editor.getByText('One')).toBeVisible();
  await expect(editor.getByText('Two')).toBeVisible();

  await pressAppShortcut(page, 'k');
  await commandInput.fill('Expand All Heading Sections');
  await page.keyboard.press('Enter');

  // Everything is visible again — expand-all also proves collapse-all did
  // not recursively fold "## Sub" (it comes back expanded).
  for (const text of ['alpha', 'beta', 'Sub', 'nested content', 'gamma']) {
    await expect(editor.getByText(text)).toBeVisible();
  }
  await expect(
    editor.getByRole('button', { name: 'Expand section' }),
  ).toHaveCount(0);
});
