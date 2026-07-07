import { expect, type Page, test } from '@playwright/test';
import { getEditorLocator } from './common';

/**
 * Exercises the NativeFS external-change refresh pipeline end to end:
 * FileSystemObserver → storage watcher → typed file events → file tree and
 * open-editor refresh.
 *
 * The directory picker is stubbed to return an OPFS-backed directory, which
 * behaves like a picked local directory (granted permissions, observer
 * support) but works headless. "External" edits are writes made directly
 * through OPFS handles, bypassing the app's storage layer exactly like a sync
 * tool writing to disk would.
 */

const WORKSPACE_DIR = 'sync-notes';

test.beforeEach(async ({ page }) => {
  await page.addInitScript((workspaceDir) => {
    (
      window as Window & {
        showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>;
      }
    ).showDirectoryPicker = async () => {
      const root = await navigator.storage.getDirectory();
      return root.getDirectoryHandle(workspaceDir, { create: true });
    };
  }, WORKSPACE_DIR);
});

async function externallyWriteFile(
  page: Page,
  relativePath: string,
  content: string,
) {
  await page.evaluate(
    async ({ workspaceDir, relativePath, content }) => {
      const root = await navigator.storage.getDirectory();
      let dir = await root.getDirectoryHandle(workspaceDir, { create: true });
      const segments = relativePath.split('/');
      for (const segment of segments.slice(0, -1)) {
        dir = await dir.getDirectoryHandle(segment, { create: true });
      }
      const fileName = segments[segments.length - 1];
      if (!fileName) {
        throw new Error(`Invalid path: ${relativePath}`);
      }
      const fileHandle = await dir.getFileHandle(fileName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(content);
      await writable.close();
    },
    { workspaceDir: WORKSPACE_DIR, relativePath, content },
  );
}

async function createNativeFsWorkspace(page: Page) {
  await page.goto('/');
  if (await page.getByRole('dialog').isVisible()) {
    await page.keyboard.press('Escape');
  }
  await page.getByRole('button', { name: 'Create Workspace' }).click();
  await page
    .getByRole('radio', {
      name: 'Native File System Save workspace data in native file system',
    })
    .click();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Pick Directory' }).click();
  await expect(page.getByText(WORKSPACE_DIR)).toBeVisible();
  await page.getByRole('button', { name: 'Create' }).click();
  await expect(
    page.getByRole('heading', { name: WORKSPACE_DIR }),
  ).toBeVisible();
}

test('externally created and edited files refresh the tree and the open note', async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName !== 'chromium',
    'NativeFS workspaces are Chromium-only',
  );

  await createNativeFsWorkspace(page);

  const observerSupported = await page.evaluate(
    () =>
      typeof (globalThis as { FileSystemObserver?: unknown })
        .FileSystemObserver === 'function',
  );
  test.skip(
    !observerSupported,
    'FileSystemObserver is unavailable in this Chromium build',
  );

  // Sanity: the normal app flow works against the OPFS-backed directory.
  await page.getByRole('button', { name: 'New Note' }).click();
  await page.getByLabel('Note name').fill('local-note');
  await page.getByRole('button', { name: 'Create' }).click();
  await expect(getEditorLocator(page, {})).toBeVisible();

  const explorer = page.getByTestId('bangle-file-explorer');

  // A file created outside the app appears in the file tree without any
  // manual reload.
  await externallyWriteFile(
    page,
    'external-note.md',
    '# External Note\n\nsynced from another device\n',
  );
  await expect(
    explorer.getByRole('treeitem', { name: /external-note/ }),
  ).toBeVisible();

  // Open the externally created note...
  await explorer.getByRole('treeitem', { name: /external-note/ }).click();
  await expect(getEditorLocator(page, {})).toContainText(
    'synced from another device',
  );

  // ...and edit it externally again: the open, unmodified editor refreshes
  // to the new disk content instead of showing a stale note.
  await externallyWriteFile(
    page,
    'external-note.md',
    '# External Note\n\nupdated by the sync tool\n',
  );
  await expect(getEditorLocator(page, {})).toContainText(
    'updated by the sync tool',
  );

  // The refresh pipeline must not have clobbered the other note.
  await explorer.getByRole('treeitem', { name: /local-note/ }).click();
  await expect(getEditorLocator(page, {})).toBeVisible();
});
