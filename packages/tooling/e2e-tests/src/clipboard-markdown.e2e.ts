import { expect, type Page, test } from '@playwright/test';
import {
  clearEditor,
  createBrowserWorkspaceAndNote,
  getEditorLocator,
  pressAppShortcut,
  readStoredMarkdown,
  selectEditorText,
  waitForEditorFocus,
  writeStoredMarkdown,
} from './common';

async function runCommand(page: Page, title: string) {
  await pressAppShortcut(page, 'k');
  await page.getByPlaceholder('Type a command or search...').fill(title);
  await page.getByRole('option', { name: title }).click();
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

test('multi-block Markdown pasted into a tight list keeps its paragraph boundaries', async ({
  context,
  page,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);

  const workspaceName = 'paste-list-blocks-workspace';
  const noteName = 'paste-list-blocks';
  const source = '- one\n- two';
  const expected = '- one\n\n- two\n\n  pasted first\n\n  pasted second';
  await createBrowserWorkspaceAndNote(page, { workspaceName, noteName });
  await writeStoredMarkdown(page, workspaceName, noteName, source);
  await page.reload({ waitUntil: 'networkidle' });

  const editor = getEditorLocator(page, {});
  await editor.getByText('two', { exact: true }).click();
  await page.keyboard.press('End');
  await page.evaluate(() =>
    navigator.clipboard.writeText('pasted first\n\npasted second'),
  );
  await runCommand(page, 'Paste from Markdown');

  await expect(editor.getByText('pasted first', { exact: true })).toBeVisible();
  await expect(
    editor.getByText('pasted second', { exact: true }),
  ).toBeVisible();
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, noteName))
    .toBe(expected);

  await page.reload({ waitUntil: 'networkidle' });
  await expect(editor.getByText('pasted first', { exact: true })).toBeVisible();
  await expect(
    editor.getByText('pasted second', { exact: true }),
  ).toBeVisible();
  await expect(readStoredMarkdown(page, workspaceName, noteName)).resolves.toBe(
    expected,
  );
});

test('refuses Markdown paste when parsing would silently discard source', async ({
  context,
  page,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const workspaceName = 'paste-markdown-fidelity';
  const noteName = 'fidelity';
  await createBrowserWorkspaceAndNote(page, { workspaceName, noteName });
  const editor = getEditorLocator(page, {});
  await waitForEditorFocus(page, {});
  await editor.fill('KEEP');
  await selectEditorText(page, 'KEEP');
  await page.evaluate(() =>
    navigator.clipboard.writeText(
      '[visible][missing]\n\n[unused]: https://example.com',
    ),
  );

  await runCommand(page, 'Paste from Markdown');

  await expect(page.getByText('Could not paste Markdown')).toBeVisible();
  await expect(editor).toHaveText('KEEP');
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, noteName))
    .toBe('KEEP');
});

test('async Markdown paste cannot land in a different note', async ({
  context,
  page,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const workspaceName = 'paste-markdown-target';
  const firstNote = 'first';
  const secondNote = 'second';
  await createBrowserWorkspaceAndNote(page, {
    workspaceName,
    noteName: firstNote,
  });
  const editor = getEditorLocator(page, {});
  await waitForEditorFocus(page, {});
  await editor.fill('FIRST');
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, firstNote))
    .toBe('FIRST');

  await page.getByRole('button', { name: 'Bangle.io' }).click();
  await page.getByRole('menuitem', { name: 'New Note' }).click();
  await page.getByLabel('Note name').fill(secondNote);
  await page.getByRole('button', { name: 'Create' }).click();
  await expect
    .poll(() => editor.getAttribute('data-editor-name'))
    .toContain(`${workspaceName}:${secondNote}.md`);
  await waitForEditorFocus(page, {});
  await editor.fill('SECOND');
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, secondNote))
    .toBe('SECOND');
  await page.getByRole('treeitem', { name: `${firstNote}.md` }).click();
  await expect
    .poll(() => editor.getAttribute('data-editor-name'))
    .toContain(`${workspaceName}:${firstNote}.md`);
  await waitForEditorFocus(page, {});
  await selectEditorText(page, 'FIRST');

  await page.evaluate(() => {
    const testWindow = window as typeof window & {
      clipboardReadStarted?: boolean;
      resolveClipboardRead?: (value: string) => void;
    };
    const pendingRead = new Promise<string>((resolve) => {
      testWindow.resolveClipboardRead = resolve;
    });
    Object.defineProperty(navigator.clipboard, 'readText', {
      configurable: true,
      value: () => {
        testWindow.clipboardReadStarted = true;
        return pendingRead;
      },
    });
  });
  await runCommand(page, 'Paste from Markdown');
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (
            window as typeof window & {
              clipboardReadStarted?: boolean;
            }
          ).clipboardReadStarted,
      ),
    )
    .toBe(true);

  await page.getByRole('treeitem', { name: `${secondNote}.md` }).click();
  await expect
    .poll(() => editor.getAttribute('data-editor-name'))
    .toContain(`${workspaceName}:${secondNote}.md`);
  await waitForEditorFocus(page, {});
  await selectEditorText(page, 'SECOND');
  await page.evaluate(() =>
    (
      window as typeof window & {
        resolveClipboardRead?: (value: string) => void;
      }
    ).resolveClipboardRead?.('WRONG NOTE'),
  );

  await expect(page.getByText('Could not paste Markdown')).toBeVisible();
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, firstNote))
    .toBe('FIRST');
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, secondNote))
    .toBe('SECOND');
});
