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

/**
 * Simulates the user leaving the tab and coming back: the page-lifecycle
 * stream sees hidden → visible, which the app treats as a page return and
 * uses to revalidate Native FS workspaces.
 */
async function simulateLeaveAndReturn(page: Page) {
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'hidden',
    });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'visible',
    });
    document.dispatchEvent(new Event('visibilitychange'));
  });
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

test('page-return revalidation refreshes external changes when FileSystemObserver is unavailable', async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName !== 'chromium',
    'NativeFS workspaces are Chromium-only',
  );

  // Remove the observer API before the app boots: this is the fallback
  // world (non-Chromium engines, older Chrome) where returning to the page
  // is the ONLY reconciliation with external edits.
  await page.addInitScript(() => {
    delete (globalThis as { FileSystemObserver?: unknown }).FileSystemObserver;
  });

  await createNativeFsWorkspace(page);
  await page.getByRole('button', { name: 'New Note' }).click();
  await page.getByLabel('Note name').fill('watched-note');
  await page.getByRole('button', { name: 'Create' }).click();
  await expect(getEditorLocator(page, {})).toBeVisible();

  const explorer = page.getByTestId('bangle-file-explorer');

  // With no observer, an external creation does NOT appear on its own...
  await externallyWriteFile(
    page,
    'external-note.md',
    '# External Note\n\nwritten while the user was away\n',
  );

  // ...but coming back to the tab revalidates the workspace: the tree picks
  // up the new file.
  await simulateLeaveAndReturn(page);
  await expect(
    explorer.getByRole('treeitem', { name: /external-note/ }),
  ).toBeVisible();

  // Same for an open, unmodified note: edit it externally while away, and
  // the return refreshes its content.
  await explorer.getByRole('treeitem', { name: /external-note/ }).click();
  await expect(getEditorLocator(page, {})).toContainText(
    'written while the user was away',
  );
  await externallyWriteFile(
    page,
    'external-note.md',
    '# External Note\n\nedited again while away\n',
  );
  // Page-return notifications collapse a single return's transition burst
  // within a 1s window; a genuinely separate leave→edit→return cycle must
  // sit outside it (not a sleep-for-sync — the window is the semantics
  // under test).
  await page.waitForTimeout(1_100);
  await simulateLeaveAndReturn(page);
  await expect(getEditorLocator(page, {})).toContainText(
    'edited again while away',
  );
});

test('a refused external change surfaces a toast whose Reload action loads the disk version', async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName !== 'chromium',
    'NativeFS workspaces are Chromium-only',
  );

  await createNativeFsWorkspace(page);
  await page.getByRole('button', { name: 'New Note' }).click();
  await page.getByLabel('Note name').fill('conflict-note');
  await page.getByRole('button', { name: 'Create' }).click();
  const editor = getEditorLocator(page, {});
  await expect(editor).toBeVisible();
  await editor.click();
  await page.keyboard.type('local wording of the note');
  // Wait until the edit is durably saved so the external write below is a
  // clean conflict, not a dirty-guard skip.
  await expect
    .poll(async () => {
      return page.evaluate(
        async ({ workspaceDir }) => {
          const root = await navigator.storage.getDirectory();
          const dir = await root.getDirectoryHandle(workspaceDir);
          const handle = await dir.getFileHandle('conflict-note.md');
          const file = await handle.getFile();
          return file.text();
        },
        { workspaceDir: WORKSPACE_DIR },
      );
    })
    .toContain('local wording of the note');

  // Reference-style links do not round-trip through the editor schema, so
  // the sync refuses to auto-apply them — the user must learn the editor is
  // now showing older content than disk.
  await externallyWriteFile(
    page,
    'conflict-note.md',
    'see [the spec][1]\n\n[1]: https://example.com/spec\n',
  );

  const conflictToast = page.getByText(/conflict-note\.md changed on disk/);
  await expect(conflictToast).toBeVisible();
  // The editor deliberately kept the current version.
  await expect(editor).toContainText('local wording of the note');

  // The offered recovery reloads the app; the note then goes through the
  // load path, which shows the disk content.
  await page.getByRole('button', { name: 'Reload' }).click();
  await expect(getEditorLocator(page, {})).toContainText('the spec');
});
