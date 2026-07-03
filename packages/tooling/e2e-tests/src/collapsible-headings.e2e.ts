import { expect, test } from '@playwright/test';
import {
  createBrowserWorkspaceAndNote,
  getEditorLocator,
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

async function openSeededNote(page: import('@playwright/test').Page) {
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
