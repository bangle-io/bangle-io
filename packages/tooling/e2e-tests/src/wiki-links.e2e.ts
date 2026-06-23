import { expect, type Page, test } from '@playwright/test';
import {
  clearEditor,
  createBrowserWorkspace,
  createBrowserWorkspaceAndNote,
  getEditorLocator,
  readStoredMarkdown,
  waitForEditorFocus,
  writeStoredMarkdown,
} from './common';

async function writeManyStoredMarkdown(
  page: Page,
  workspaceName: string,
  files: Array<{ noteName: string; markdown: string }>,
) {
  await page.evaluate(
    async ({ workspace, entries }) => {
      const request = indexedDB.open('baby-idb-db-3');
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction(
          'baby-idb-db-store-3',
          'readwrite',
        );
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
        const store = transaction.objectStore('baby-idb-db-store-3');
        for (const entry of entries) {
          store.put(
            new File([entry.markdown], `${entry.noteName}.md`, {
              type: 'text/markdown',
            }),
            `${workspace}/${entry.noteName}.md`,
          );
        }
      });
      database.close();
    },
    { workspace: workspaceName, entries: files },
  );
}

test('authors, persists, reloads, and navigates wiki links safely', async ({
  page,
}) => {
  const workspaceName = 'wiki-links';
  await createBrowserWorkspaceAndNote(page, {
    workspaceName,
    noteName: 'Home',
  });
  await writeStoredMarkdown(page, workspaceName, 'Target', 'target content');
  await writeStoredMarkdown(page, workspaceName, 'folder/Duplicate', 'one');
  await writeStoredMarkdown(page, workspaceName, 'other/Duplicate', 'two');
  await page.reload({ waitUntil: 'networkidle' });

  const editor = getEditorLocator(page, {});
  await editor.click();
  await page.keyboard.insertText('Start ');
  await page.keyboard.insertText('[');
  await page.keyboard.insertText('[');
  const picker = page.getByRole('listbox', { name: 'Link to a note' });
  await expect(picker).toBeVisible();
  await page.keyboard.insertText('Tar');
  await expect(picker.getByRole('option', { name: 'Target' })).toBeVisible();
  await expect(
    picker.getByRole('option', { name: 'Link to “Tar”' }),
  ).toBeVisible();
  await page.keyboard.press('ArrowDown');
  await expect(
    picker.getByRole('option', { name: 'Link to “Tar”' }),
  ).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('ArrowUp');
  await expect(picker.getByRole('option', { name: 'Target' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await page.keyboard.press('Enter');

  const targetChip = editor.getByRole('link', { name: 'Target', exact: true });
  await expect(targetChip).toBeVisible();
  await page.keyboard.insertText(' and ');
  await page.keyboard.insertText('[');
  await page.keyboard.insertText('[');
  await page.keyboard.insertText('Duplicate');
  await expect(picker).toBeVisible();
  const folderDuplicate = picker
    .getByRole('option')
    .filter({ hasText: 'folder/' });
  await folderDuplicate.click();
  await expect(
    editor.getByRole('link', { name: 'Duplicate', exact: true }),
  ).toBeVisible();
  await page.keyboard.insertText(' after');
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, 'Home'))
    .toBe('Start [[Target]] and [[/folder/Duplicate]] after');

  await page.reload({ waitUntil: 'networkidle' });
  await expect(targetChip).toBeVisible();
  await targetChip.focus();
  await page.keyboard.press('Enter');
  await expect(editor).toContainText('target content');

  await writeStoredMarkdown(
    page,
    workspaceName,
    'Target',
    '[[Home|Go home]] and [[Missing]]',
  );
  await page.reload({ waitUntil: 'networkidle' });
  await expect(editor.getByRole('link', { name: 'Go home' })).toBeVisible();
  const missing = editor.getByRole('link', {
    name: 'Missing (note not found)',
  });
  await expect(missing).toBeVisible();
  const sourceUrl = page.url();
  await missing.click();
  await expect(page).toHaveURL(sourceUrl);
  await expect(editor).toContainText('Go home');
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, 'Target'))
    .toBe('[[Home|Go home]] and [[Missing]]');
});

test('keeps escape, code, malformed, and ambiguous wiki text non-destructive', async ({
  page,
}) => {
  const workspaceName = 'wiki-link-literals';
  await createBrowserWorkspaceAndNote(page, {
    workspaceName,
    noteName: 'Home',
  });
  await writeStoredMarkdown(page, workspaceName, 'one/Same', 'one');
  await writeStoredMarkdown(page, workspaceName, 'two/Same', 'two');
  await page.reload({ waitUntil: 'networkidle' });

  const editor = getEditorLocator(page, {});
  await expect(editor).toBeVisible();
  await editor.click();
  await waitForEditorFocus(page, {});
  await page.keyboard.insertText('[');
  await page.keyboard.insertText('[');
  await expect(
    page.getByRole('listbox', { name: 'Link to a note' }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(
    page.getByRole('listbox', { name: 'Link to a note' }),
  ).toBeHidden();
  await expect(editor).toContainText('[[');
  await page.keyboard.insertText('Missing');
  await page.keyboard.insertText(']');
  await page.keyboard.insertText(']');
  await expect(
    editor.getByRole('link', { name: 'Missing (note not found)' }),
  ).toBeVisible();
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, 'Home'))
    .toBe('[[Missing]]');

  await clearEditor(page, {});
  await page.keyboard.insertText('[');
  await page.keyboard.insertText('[');
  const picker = page.getByRole('listbox', { name: 'Link to a note' });
  await expect(picker).toBeVisible();
  await page.keyboard.insertText('foo|bar');
  await expect(
    picker.getByRole('option', { name: 'Link to “foo|bar”' }),
  ).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(
    editor.getByRole('link', { name: 'bar (note not found)' }),
  ).toBeVisible();
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, 'Home'))
    .toBe('[[foo|bar]]');
  await page.reload({ waitUntil: 'networkidle' });
  await expect(
    editor.getByRole('link', { name: 'bar (note not found)' }),
  ).toBeVisible();

  await writeStoredMarkdown(
    page,
    workspaceName,
    'Home',
    '`[[inline]]`\n\n```md\n[[fenced]]\n```\n\n[[nested [[bad]]]]\n\n[[Same]]',
  );
  await page.reload({ waitUntil: 'networkidle' });
  await expect(editor.locator('code').first()).toHaveText('[[inline]]');
  await expect(editor.locator('pre')).toContainText('[[fenced]]');
  await expect(editor).toContainText('[[nested [[bad]]]]');
  await expect(
    editor.getByRole('link', { name: 'Same (note not found)' }),
  ).toBeVisible();
});

test('pins the unresolved option and remains usable in a large workspace', async ({
  page,
}) => {
  const workspaceName = 'wiki-link-large';
  await createBrowserWorkspace(page, { workspaceName });
  await writeManyStoredMarkdown(page, workspaceName, [
    { noteName: 'Home', markdown: '' },
    { noteName: 'TargetLarge', markdown: 'large target content' },
    ...Array.from({ length: 1000 }, (_, index) => ({
      noteName: `generated/Note${String(index).padStart(4, '0')}`,
      markdown: `generated ${index}`,
    })),
  ]);
  await page.reload({ waitUntil: 'networkidle' });
  await page.goto(
    `/ws#route=editor&wsPath=${encodeURIComponent(`${workspaceName}:Home.md`)}`,
  );

  const editor = getEditorLocator(page, {});
  await expect(editor).toBeVisible();
  await editor.click();
  await waitForEditorFocus(page, {});
  await page.keyboard.insertText('[');
  await page.keyboard.insertText('[');
  const picker = page.getByRole('listbox', { name: 'Link to a note' });
  await expect(picker).toBeVisible();
  await page.keyboard.insertText('NoExistingNote');
  await expect(
    picker.getByRole('option', { name: 'Link to “NoExistingNote”' }),
  ).toBeVisible();

  await page.keyboard.press('Escape');
  await clearEditor(page, {});
  await page.keyboard.insertText('[');
  await page.keyboard.insertText('[');
  await page.keyboard.insertText('TargetLarge');
  await expect(
    picker.getByRole('option', { name: 'TargetLarge', exact: true }),
  ).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(
    editor.getByRole('link', { name: 'TargetLarge', exact: true }),
  ).toBeVisible();
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, 'Home'))
    .toBe('[[TargetLarge]]');
});
