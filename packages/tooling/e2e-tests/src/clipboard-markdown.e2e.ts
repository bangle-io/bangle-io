import { expect, type Page, test } from '@playwright/test';
import {
  clearEditor,
  createBrowserWorkspaceAndNote,
  getEditorLocator,
  pressAppShortcut,
  readStoredMarkdown,
  selectEditorText,
} from './common';

async function runCommand(page: Page, title: string) {
  await pressAppShortcut(page, 'k');
  await page.getByPlaceholder('Type a command or search...').fill(title);
  await page.getByRole('option', { name: `> ${title}` }).click();
}

test('copies the editor selection as Markdown', async ({ context, page }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);

  await createBrowserWorkspaceAndNote(page, {
    workspaceName: 'copy-markdown-workspace',
    noteName: 'copy-target',
  });

  const editor = getEditorLocator(page, {});
  await expect(editor).toBeVisible();
  await editor.click();
  await clearEditor(page, {});

  await test.step('author a heading and paragraph', async () => {
    await editor.pressSequentially('# Heading one', { delay: 30 });
    await page.keyboard.press('Enter');
    await editor.pressSequentially('Plain body', { delay: 30 });
    await expect(
      page.getByRole('heading', { name: 'Heading one' }),
    ).toBeVisible();
  });

  await test.step('copy a heading selection with its Markdown syntax', async () => {
    // Select only the heading text, then run the command from the omni-search
    // palette (which moves focus off the editor, proving the copy reads
    // ProseMirror state rather than the live DOM selection). The paragraph is
    // excluded, proving the copy is scoped to the selection.
    await selectEditorText(page, 'Heading one');
    await runCommand(page, 'Copy Selection as Markdown');

    await expect
      .poll(() => page.evaluate(() => navigator.clipboard.readText()))
      .toBe('# Heading one');
  });
});

test('pastes Markdown from the clipboard into the editor', async ({
  context,
  page,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);

  const workspaceName = 'paste-markdown-workspace';
  const noteName = 'paste-target';
  await createBrowserWorkspaceAndNote(page, { workspaceName, noteName });

  const editor = getEditorLocator(page, {});
  await expect(editor).toBeVisible();
  await editor.click();
  await clearEditor(page, {});

  await page.evaluate(() => navigator.clipboard.writeText('# Solo Heading'));

  await test.step('paste a single heading block from Markdown', async () => {
    await runCommand(page, 'Paste from Markdown');
    await expect(
      page.getByRole('heading', { name: 'Solo Heading' }),
    ).toBeVisible();
    await expect(editor).not.toContainText('# Solo Heading');
  });

  await editor.click();
  await clearEditor(page, {});
  await page.evaluate(() =>
    navigator.clipboard.writeText('# Pasted Heading\n\nPasted body text'),
  );

  await test.step('run paste-from-markdown', async () => {
    await runCommand(page, 'Paste from Markdown');
    // The Markdown must become real rich structure, not literal text.
    await expect(
      page.getByRole('heading', { name: 'Pasted Heading' }),
    ).toBeVisible();
    await expect(editor).toContainText('Pasted body text');
    await expect(editor).not.toContainText('# Pasted Heading');
  });

  await test.step('paste is persisted as Markdown', async () => {
    await expect
      .poll(
        async () =>
          (await readStoredMarkdown(page, workspaceName, noteName)) ?? '',
      )
      .toContain('# Pasted Heading');
  });

  await test.step('paste survives a reload', async () => {
    await page.reload({ waitUntil: 'networkidle' });
    await expect(
      page.getByRole('heading', { name: 'Pasted Heading' }),
    ).toBeVisible();
    await expect(getEditorLocator(page, {})).toContainText('Pasted body text');
  });
});
