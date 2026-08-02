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

type EchoRead = { content: string | undefined };
type EchoDebugWindow = Window &
  typeof globalThis & {
    __echoReads?: EchoRead[];
    services: {
      core: {
        fileSystem: {
          readFileAsText: (
            wsPath: string,
            options?: { signal?: AbortSignal },
          ) => Promise<string | undefined>;
        };
      };
    };
  };

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

async function externallyDeleteFile(page: Page, relativePath: string) {
  await page.evaluate(
    async ({ workspaceDir, relativePath }) => {
      const root = await navigator.storage.getDirectory();
      let dir = await root.getDirectoryHandle(workspaceDir);
      const segments = relativePath.split('/');
      for (const segment of segments.slice(0, -1)) {
        dir = await dir.getDirectoryHandle(segment);
      }
      const fileName = segments.at(-1);
      if (!fileName) {
        throw new Error(`Invalid path: ${relativePath}`);
      }
      await dir.removeEntry(fileName);
    },
    { workspaceDir: WORKSPACE_DIR, relativePath },
  );
}

async function rejectAppWritesToFile(page: Page, fileName: string) {
  await page.evaluate(
    async ({ workspaceDir, fileName }) => {
      const root = await navigator.storage.getDirectory();
      const dir = await root.getDirectoryHandle(workspaceDir);
      const handle = await dir.getFileHandle(fileName);
      const prototype = Object.getPrototypeOf(handle) as {
        createWritable: FileSystemFileHandle['createWritable'];
      };
      const originalCreateWritable = prototype.createWritable;
      prototype.createWritable = async function createWritable(
        this: FileSystemFileHandle,
        options?: FileSystemCreateWritableOptions,
      ) {
        if (this.name === fileName) {
          throw new DOMException('Forced save failure', 'NotAllowedError');
        }
        return originalCreateWritable.call(this, options);
      };
      (
        window as Window & { __restoreAppWrites?: () => void }
      ).__restoreAppWrites = () => {
        prototype.createWritable = originalCreateWritable;
      };
    },
    { workspaceDir: WORKSPACE_DIR, fileName },
  );
}

/**
 * Undoes {@link rejectAppWritesToFile}. A save that already failed stays
 * failed until the user retries it, so the editor remains dirty afterwards —
 * this only reopens the disk for the test's own external writes.
 */
async function restoreAppWrites(page: Page) {
  await page.evaluate(() => {
    (
      window as Window & { __restoreAppWrites?: () => void }
    ).__restoreAppWrites?.();
  });
}

async function createNativeFsWorkspace(
  page: Page,
  { debug = false }: { debug?: boolean } = {},
) {
  await page.goto(debug ? '/?debug=true' : '/');
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

test('a byte-identical watcher update cannot normalize a locally saved note', async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName !== 'chromium',
    'NativeFS workspaces are Chromium-only',
  );

  await createNativeFsWorkspace(page, { debug: true });
  const observerSupported = await page.evaluate(
    () =>
      typeof (globalThis as { FileSystemObserver?: unknown })
        .FileSystemObserver === 'function',
  );
  test.skip(
    !observerSupported,
    'FileSystemObserver is unavailable in this Chromium build',
  );

  await page.getByRole('button', { name: 'New Note' }).click();
  await page.getByLabel('Note name').fill('self-write-echo');
  await page.getByRole('button', { name: 'Create' }).click();
  const editor = getEditorLocator(page, {});
  await expect(editor).toBeVisible();

  await editor.click();
  await page.keyboard.insertText('xyz   ');
  await expect
    .poll(async () => {
      return page.evaluate(async (workspaceDir) => {
        const root = await navigator.storage.getDirectory();
        const dir = await root.getDirectoryHandle(workspaceDir);
        const handle = await dir.getFileHandle('self-write-echo.md');
        return (await handle.getFile()).text();
      }, WORKSPACE_DIR);
    })
    .toBe('xyz   ');

  const selectionBefore = await editor.evaluate((root) => {
    const selection = root.ownerDocument.getSelection();
    return {
      anchorOffset: selection?.anchorOffset,
      focusOffset: selection?.focusOffset,
    };
  });

  // OPFS does not report an app write back to its own observer consistently,
  // so repeat the exact saved bytes through a handle outside the app. Chrome
  // reports this record identically to a self-write echo. Record reads through
  // the same FileSystemService seam used by reconciliation so the assertions
  // below wait for the stable-read protocol instead of relying on a timeout.
  await page.evaluate(
    ({ wsPath }) => {
      const debugWindow = window as EchoDebugWindow;
      const fileSystem = debugWindow.services.core.fileSystem;
      const readFileAsText = fileSystem.readFileAsText.bind(fileSystem);
      debugWindow.__echoReads = [];
      fileSystem.readFileAsText = async (path, options) => {
        const content = await readFileAsText(path, options);
        if (path === wsPath) {
          debugWindow.__echoReads?.push({ content });
        }
        return content;
      };
    },
    {
      wsPath: `${WORKSPACE_DIR}:self-write-echo.md`,
    },
  );
  await externallyWriteFile(page, 'self-write-echo.md', 'xyz   ');

  await expect
    .poll(() =>
      page.evaluate(() => {
        const reads = (window as EchoDebugWindow).__echoReads ?? [];
        return reads.filter((read) => read.content === 'xyz   ').length;
      }),
    )
    .toBeGreaterThanOrEqual(2);

  await expect
    .poll(() => editor.evaluate((root) => root.textContent))
    .toBe('xyz   ');
  expect(
    await editor.evaluate((root) => {
      const selection = root.ownerDocument.getSelection();
      return {
        anchorOffset: selection?.anchorOffset,
        focusOffset: selection?.focusOffset,
      };
    }),
  ).toEqual(selectionBefore);
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
  // A real departure starts a new return cycle immediately, even when it
  // follows the prior return by less than the burst-dedupe window.
  await simulateLeaveAndReturn(page);
  await expect(getEditorLocator(page, {})).toContainText(
    'edited again while away',
  );
});

test('a refused external change surfaces a toast whose action loads the disk version in place', async ({
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

  // The parser consumes an unresolved link reference definition and emits
  // nothing, so auto-applying this would arm the next keystroke to delete a
  // line that is still on disk. The user must learn the editor is now showing
  // older content than disk.
  await externallyWriteFile(
    page,
    'conflict-note.md',
    'see the spec\n\n[unused]: https://example.com/spec\n',
  );

  const conflictToast = page.getByText(/conflict-note\.md changed on disk/);
  await expect(conflictToast).toBeVisible();
  // The editor deliberately kept the current version.
  await expect(editor).toContainText('local wording of the note');

  // The offered recovery replaces only this note's content in place — no
  // app reload that could disturb another editor's unsaved work.
  await page.getByRole('button', { name: 'Load disk version' }).click();
  await expect(editor).toContainText('see the spec');
  await expect(editor).not.toContainText('local wording of the note');
  await expect(conflictToast).not.toBeVisible();
});

test('external content that only reformats on save is applied, not refused', async ({
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

  await page.getByRole('button', { name: 'New Note' }).click();
  await page.getByLabel('Note name').fill('reflow-note');
  await page.getByRole('button', { name: 'Create' }).click();
  const editor = getEditorLocator(page, {});
  await expect(editor).toBeVisible();

  // Hand-wrapped list items are extremely common in real Markdown. They never
  // round-trip byte-for-byte, but parsing keeps every word, so the editor must
  // follow disk instead of going stale behind a conflict notice.
  await externallyWriteFile(
    page,
    'reflow-note.md',
    '- Standup notes:\n  https://example.com/standup\n- second item\n',
  );

  await expect(editor).toContainText('Standup notes');
  await expect(editor).toContainText('second item');
  await expect(
    page.getByText(/reflow-note\.md changed on disk/),
  ).not.toBeVisible();
});

test('an external write never clobbers unsaved local edits in the open editor', async ({
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

  await page.getByRole('button', { name: 'New Note' }).click();
  await page.getByLabel('Note name').fill('conflict-dirty');
  await page.getByRole('button', { name: 'Create' }).click();
  const editor = getEditorLocator(page, {});
  await expect(editor).toBeVisible();

  // Break saves first so the local edit stays pending: the editor then holds
  // the only copy of the user's wording when the external write arrives.
  await rejectAppWritesToFile(page, 'conflict-dirty.md');
  await editor.click();
  await page.keyboard.type('local wording that exists nowhere else');
  await expect(page.getByText(/Changes could not be saved/)).toBeVisible();
  // The failed save keeps the editor dirty until the user retries; restoring
  // writes only reopens the disk for the sync tool simulated below.
  await restoreAppWrites(page);

  // A sync tool overwrites the dirty note, then creates a sentinel file. The
  // sentinel's appearance in the tree proves the watcher pipeline processed
  // the burst, so "the editor did not change" below is a real refusal rather
  // than the sync simply not having run yet.
  await externallyWriteFile(
    page,
    'conflict-dirty.md',
    '# External\n\noverwritten by the sync tool\n',
  );
  await externallyWriteFile(page, 'sentinel.md', 'marker\n');
  await expect(
    page
      .getByTestId('bangle-file-explorer')
      .getByRole('treeitem', { name: /sentinel/ }),
  ).toBeVisible();

  // Unsaved edits always win over the external copy...
  await expect(editor).toContainText('local wording that exists nowhere else');
  await expect(editor).not.toContainText('overwritten by the sync tool');
  // ...and refusing must not auto-save the editor over disk either: the
  // sync tool's copy survives until the user resolves the conflict.
  await expect
    .poll(async () => {
      return page.evaluate(
        async ({ workspaceDir }) => {
          const root = await navigator.storage.getDirectory();
          const dir = await root.getDirectoryHandle(workspaceDir);
          const handle = await dir.getFileHandle('conflict-dirty.md');
          const file = await handle.getFile();
          return file.text();
        },
        { workspaceDir: WORKSPACE_DIR },
      );
    })
    .toContain('overwritten by the sync tool');
});

test('an externally deleted note stays mounted while its local save is failed', async ({
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

  await page.getByRole('button', { name: 'New Note' }).click();
  await page.getByLabel('Note name').fill('dirty-note');
  await page.getByRole('button', { name: 'Create' }).click();
  const editor = getEditorLocator(page, {});
  await expect(editor).toBeVisible();

  await rejectAppWritesToFile(page, 'dirty-note.md');
  await editor.click();
  await page.keyboard.type('local content that has not been saved');
  await expect(page.getByText(/Changes could not be saved/)).toBeVisible();

  await externallyDeleteFile(page, 'dirty-note.md');
  await expect(
    page
      .getByTestId('bangle-file-explorer')
      .getByRole('treeitem', { name: /dirty-note/ }),
  ).not.toBeVisible();

  // The route is now missing from the file tree, but the failed editor is
  // still the only recoverable copy and must remain available to the user.
  await expect(editor).toBeVisible();
  await expect(editor).toContainText('local content that has not been saved');
});
