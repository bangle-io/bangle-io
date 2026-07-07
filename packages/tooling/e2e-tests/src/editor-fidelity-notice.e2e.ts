import { expect, type Page, test } from '@playwright/test';
import {
  createBrowserWorkspaceAndNote,
  getEditorLocator,
  readStoredMarkdown,
  writeStoredMarkdown,
} from './common';

// Markdown the editor cannot round-trip: the footnote definition is inlined
// and escaped on serialization (see plans/012-markdown-feature-parity.md).
const LOSSY_SOURCE = ['A claim.[^1]', '', '[^1]: The source.'].join('\n');

// Markdown that serializes back byte-identical.
const CLEAN_SOURCE = ['# Title', '', 'Some plain text.'].join('\n');

const NOTICE_TEST_ID = 'editor-fidelity-notice';

async function seedNote(page: Page, noteName: string, source: string) {
  const workspaceName = 'fidelity-notice';
  await createBrowserWorkspaceAndNote(page, { workspaceName, noteName });
  await writeStoredMarkdown(page, workspaceName, noteName, source);
  await page.reload();
  return { workspaceName };
}

test('warns when a note contains Markdown the editor will reformat', async ({
  page,
}) => {
  const noteName = 'Lossy';
  const { workspaceName } = await seedNote(page, noteName, LOSSY_SOURCE);

  const editor = getEditorLocator(page, {});
  await expect(editor.getByText('A claim.')).toBeVisible();
  await expect(page.getByTestId(NOTICE_TEST_ID)).toBeVisible();

  // The gate only warns: merely opening the note must not rewrite storage.
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, noteName))
    .toBe(LOSSY_SOURCE);
});

test('shows no warning for Markdown that round-trips cleanly', async ({
  page,
}) => {
  const noteName = 'Clean';
  const { workspaceName } = await seedNote(page, noteName, CLEAN_SOURCE);

  const editor = getEditorLocator(page, {});
  await expect(editor.getByText('Some plain text.')).toBeVisible();
  await expect(page.getByTestId(NOTICE_TEST_ID)).toHaveCount(0);

  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, noteName))
    .toBe(CLEAN_SOURCE);
});
