import { expect, test } from '@playwright/test';
import {
  createBrowserWorkspaceAndNote,
  getEditorLocator,
  readStoredMarkdown,
  selectEditorText,
  writeStoredMarkdown,
} from './common';

test('renders imported callouts and authors persistent highlights', async ({
  page,
}) => {
  const workspaceName = 'markdown-parity';
  const noteName = 'Callouts and highlights';
  const source = [
    '> [!note] Imported title',
    '>',
    '> Body',
    '',
    'Existing ==marked== and plain',
  ].join('\n');

  await createBrowserWorkspaceAndNote(page, { workspaceName, noteName });
  await writeStoredMarkdown(page, workspaceName, noteName, source);
  await page.reload({ waitUntil: 'networkidle' });

  const editor = getEditorLocator(page, {});
  const callout = editor.locator('blockquote[data-callout="note"]');
  await expect(callout).toContainText('Imported title');
  await expect(callout).toContainText('Body');
  await expect(editor.locator('mark')).toHaveText('marked');
  await expect(page.getByTestId('markdown-fidelity-notice')).toHaveCount(0);

  await selectEditorText(page, 'plain');
  const highlight = page.getByRole('button', {
    name: 'Highlight',
    exact: true,
  });
  await expect(highlight).toBeEnabled();
  await highlight.click();
  await expect(highlight).toHaveAttribute('aria-pressed', 'true');

  const expected = `${source.slice(0, -'plain'.length)}==plain==`;
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, noteName))
    .toBe(expected);

  await page.reload({ waitUntil: 'networkidle' });
  const reloaded = getEditorLocator(page, {});
  await expect(
    reloaded.locator('blockquote[data-callout="note"]'),
  ).toContainText('Body');
  await expect(reloaded.locator('mark')).toHaveCount(2);
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, noteName))
    .toBe(expected);
});
