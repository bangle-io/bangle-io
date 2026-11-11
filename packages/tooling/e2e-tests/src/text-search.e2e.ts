import { expect, test } from '@playwright/test';
import {
  createBrowserWorkspaceAndNote,
  getEditorLocator,
  getEditorText,
  openOmniSearch,
  readStoredMarkdown,
  writeStoredMarkdown,
} from './common';

test('opens a blank text-search page from the Omni command', async ({
  page,
}) => {
  await createBrowserWorkspaceAndNote(page, {
    workspaceName: 'text-search-command-workspace',
    noteName: 'welcome',
  });

  const commandInput = await openOmniSearch(page);
  await commandInput.fill('contents');
  await page.getByRole('option', { name: 'Search Note Text' }).click();

  await expect(page.getByTestId('page-text-search')).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Search Note Text' }),
  ).toBeVisible();
  const searchInput = page.getByTestId('text-search-input');
  await expect(searchInput).toBeFocused();
  await expect(searchInput).toHaveValue('');
});

test('offers text search after no Omni match and opens a matching note', async ({
  page,
}) => {
  const workspaceName = 'text-search-results-workspace';
  const noteName = 'field-notes';
  const noteContent = [
    'The Aurora signal appeared beyond the northern ridge.',
    '',
    'A second AURORA trace appeared after midnight.',
  ].join('\n');

  await createBrowserWorkspaceAndNote(page, { workspaceName, noteName });
  await writeStoredMarkdown(page, workspaceName, noteName, noteContent);
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, noteName))
    .toBe(noteContent);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByRole('link', { name: 'Home', exact: true }).click();

  const commandInput = await openOmniSearch(page);
  await commandInput.fill('field-notes');
  await expect(
    page.getByRole('option').filter({ hasText: 'field-notes.md' }),
  ).toBeVisible();
  await expect(
    page.getByRole('option').filter({ hasText: 'Search note text for' }),
  ).toHaveCount(0);

  await commandInput.fill('aurora');
  const textSearchAction = page
    .getByRole('option')
    .filter({ hasText: 'Search note text for “aurora”' });
  await expect(textSearchAction).toBeVisible();
  await commandInput.press('Enter');

  await expect(page.getByTestId('page-text-search')).toBeVisible();
  await expect(page.getByTestId('text-search-input')).toHaveValue('aurora');
  const results = page.getByTestId('text-search-results');
  await expect(
    results.getByRole('heading', { name: 'field-notes.md' }),
  ).toBeVisible();
  await expect(results.locator('mark')).toHaveCount(2);
  await expect(results.locator('mark').nth(0)).toHaveText('Aurora');
  await expect(results.locator('mark').nth(1)).toHaveText('AURORA');
  await expect(results.getByText('Line 1')).toBeVisible();
  await expect(results.getByText('Line 3')).toBeVisible();

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('text-search-input')).toHaveValue('aurora');
  await expect(
    page.getByTestId('text-search-results').locator('mark'),
  ).toHaveCount(2);

  await page
    .getByTestId('text-search-results')
    .getByRole('link')
    .filter({ hasText: 'Aurora signal' })
    .first()
    .click();

  const editor = getEditorLocator(page, {});
  await expect
    .poll(() => editor.getAttribute('data-editor-name'))
    .toContain(`${workspaceName}:field-notes.md`);
  await expect.poll(() => getEditorText(page, {})).toContain('Aurora signal');
});
