import { expect, test } from '@playwright/test';
import {
  createBrowserWorkspaceAndNote,
  getEditorLocator,
  readStoredMarkdown,
  waitForEditorFocus,
  writeStoredMarkdown,
} from './common';

const ORIGINAL_CONTENT = 'Alpha beta gamma delta epsilon zeta';

async function openRecoverySettings(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: /Bangle\.io/ }).click();
  await page.getByRole('menuitem', { name: 'Settings' }).click();
  await page.getByRole('link', { name: 'Recover' }).click();
  await expect(
    page.getByRole('heading', { name: 'Recover' }).first(),
  ).toBeVisible();
}

test('editing a note captures a snapshot that can be viewed and recovered as a new note', async ({
  page,
}) => {
  const workspaceName = 'settings-recovery-ws';
  const noteName = 'draft';

  await createBrowserWorkspaceAndNote(page, { workspaceName, noteName });

  // Seed the stored note directly (outside the editor) so the editor's next
  // save overwrites known content — exactly the two-writers scenario snapshots
  // protect against.
  await writeStoredMarkdown(page, workspaceName, noteName, ORIGINAL_CONTENT);
  await page.reload({ waitUntil: 'domcontentloaded' });

  const editor = getEditorLocator(page, {});
  await expect(editor).toContainText('Alpha beta gamma');

  // Edit the note; the save overwrites the stored content and the app keeps a
  // pre-edit snapshot of it.
  await editor.click();
  await waitForEditorFocus(page, {});
  await page.keyboard.press('ControlOrMeta+ArrowDown');
  await page.keyboard.insertText(' overwritten');
  await expect
    .poll(async () => readStoredMarkdown(page, workspaceName, noteName))
    .toContain('overwritten');

  await openRecoverySettings(page);

  // The snapshot row shows the note, and its word count.
  const row = page.getByTestId('settings-recovery-row').first();
  await expect(row).toContainText('draft.md');
  await expect(row).toContainText('6');

  // Searching narrows the table; a non-matching query shows the empty state.
  const search = page.getByTestId('settings-recovery-search');
  await search.fill('no-such-note');
  await expect(page.getByTestId('settings-recovery-row')).toHaveCount(0);
  await expect(page.getByText('No snapshots match your search.')).toBeVisible();
  await search.fill('draft');
  await expect(page.getByTestId('settings-recovery-row').first()).toBeVisible();

  // Read-only preview shows the captured (pre-edit) content.
  await page.getByTestId('settings-recovery-view').first().click();
  const previewDialog = page.getByRole('dialog', {
    name: /Snapshot of draft\.md/,
  });
  await expect(previewDialog).toBeVisible();
  await expect(
    previewDialog.getByTestId('settings-recovery-preview-content'),
  ).toHaveText(ORIGINAL_CONTENT);
  await previewDialog.getByTestId('settings-recovery-preview-close').click();
  await expect(previewDialog).not.toBeVisible();

  // Recover always creates a new note; the original keeps its latest content.
  await page.getByTestId('settings-recovery-recover').first().click();
  await expect(editor).toBeVisible();
  await expect
    .poll(() => editor.getAttribute('data-editor-name'))
    .toContain(`${workspaceName}:draft-recovered-1.md`);
  await expect(editor).toContainText('Alpha beta gamma delta epsilon zeta');

  await expect
    .poll(async () =>
      readStoredMarkdown(page, workspaceName, 'draft-recovered-1'),
    )
    .toContain(ORIGINAL_CONTENT);
  await expect
    .poll(async () => readStoredMarkdown(page, workspaceName, noteName))
    .toContain('overwritten');

  // Snapshots and the recovered note survive a reload.
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(editor).toContainText('Alpha beta gamma delta epsilon zeta');
  await openRecoverySettings(page);
  await expect(page.getByTestId('settings-recovery-row').first()).toContainText(
    'draft.md',
  );
});
