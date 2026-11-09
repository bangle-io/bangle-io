import { expect, test } from '@playwright/test';
import { getEditorLocator } from './common';

const WORKSPACE_NAME = 'native-rename-fallback-workspace';
const PARENT_DIR = 'native-rename-fallback-parent';
const NOTE_CONTENT = '# Source note\n\nContent that must survive the rename.';

type TestFileSystemObserver = {
  observe: () => Promise<void>;
  disconnect: () => void;
};

type TestFileSystemObserverCallback = (
  records: readonly {
    type: string;
    relativePathComponents: readonly string[];
    relativePathMovedFrom: readonly string[] | null;
    changedHandle?: FileSystemHandle;
  }[],
  observer: TestFileSystemObserver,
) => void;

type NativeRenameWatcherTestState = {
  callback?: TestFileSystemObserverCallback;
  deliverMove: (oldFileName: string, newFileName: string) => void;
  deliveries: number;
  observer?: TestFileSystemObserver;
  pendingRename?: { oldFileName: string; newFileName: string };
  releaseRename?: () => void;
};

/**
 * Exercises the Native FS rename fallback (copy -> verify destination ->
 * delete source) against a real browser file system (OPFS-backed handles).
 * `FileSystemFileHandle.prototype.move` is removed before the app loads, so
 * the rename cannot take the native single-call move path — exactly the
 * engines the fallback exists for.
 */
test('structural watcher records cannot expose rename intermediates in any tab', async ({
  context,
  page,
}) => {
  await context.addInitScript(() => {
    // Force the copy->verify->delete fallback: without `move` on the handle
    // prototype, NativeFs.moveFile cannot use the native move path.
    delete (
      FileSystemFileHandle.prototype as FileSystemFileHandle & {
        move?: unknown;
      }
    ).move;

    const watcherState = {
      deliveries: 0,
    } as NativeRenameWatcherTestState;
    class DeterministicFileSystemObserver implements TestFileSystemObserver {
      constructor(callback: TestFileSystemObserverCallback) {
        watcherState.callback = callback;
        watcherState.observer = this;
      }

      async observe(): Promise<void> {}

      disconnect(): void {}
    }
    Object.defineProperty(globalThis, 'FileSystemObserver', {
      configurable: true,
      value: DeterministicFileSystemObserver,
    });

    watcherState.deliverMove = (oldFileName, newFileName) => {
      if (!watcherState.callback || !watcherState.observer) {
        throw new Error('FileSystemObserver is not armed');
      }
      watcherState.deliveries += 1;
      watcherState.callback(
        [
          {
            type: 'moved',
            relativePathComponents: [newFileName],
            relativePathMovedFrom: [oldFileName],
            changedHandle: { kind: 'file' } as FileSystemHandle,
          },
        ],
        watcherState.observer,
      );
    };

    const removeEntry = FileSystemDirectoryHandle.prototype.removeEntry;
    FileSystemDirectoryHandle.prototype.removeEntry = async function (
      name,
      options,
    ) {
      await removeEntry.call(this, name, options);
      const pendingRename = watcherState.pendingRename;
      if (
        pendingRename?.oldFileName !== name ||
        !watcherState.callback ||
        !watcherState.observer
      ) {
        return;
      }

      watcherState.pendingRename = undefined;
      watcherState.deliverMove(
        pendingRename.oldFileName,
        pendingRename.newFileName,
      );
      // Hold the physical operation after the observer record but before the
      // app can publish its typed logical rename event.
      await new Promise<void>((resolve) => {
        watcherState.releaseRename = resolve;
      });
    };

    (
      window as typeof window & {
        __nativeRenameWatcherTest: NativeRenameWatcherTestState;
      }
    ).__nativeRenameWatcherTest = watcherState;
  });

  await page.goto('/');

  // The prototype patch must be active in the page the app runs in,
  // otherwise this test would silently exercise the native move path.
  expect(
    await page.evaluate(
      () =>
        typeof (
          FileSystemFileHandle.prototype as FileSystemFileHandle & {
            move?: unknown;
          }
        ).move,
    ),
  ).toBe('undefined');

  // Seed an OPFS-backed Native FS workspace with one note and register it in
  // the app database, mirroring a previously-picked local directory.
  await page.evaluate(
    async ({ parentName, workspaceName, noteContent }) => {
      const root = await navigator.storage.getDirectory();
      await root.removeEntry(parentName, { recursive: true }).catch(() => {});
      const parent = await root.getDirectoryHandle(parentName, {
        create: true,
      });
      const workspaceHandle = await parent.getDirectoryHandle(workspaceName, {
        create: true,
      });
      const noteHandle = await workspaceHandle.getFileHandle('source.md', {
        create: true,
      });
      const writable = await noteHandle.createWritable();
      await writable.write(noteContent);
      await writable.close();

      const request = indexedDB.open('bangle-io-db');
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction('WorkspaceInfo', 'readwrite');
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
        transaction.objectStore('WorkspaceInfo').put({
          key: workspaceName,
          lastModified: Date.now(),
          value: {
            name: workspaceName,
            type: 'nativefs',
            deleted: false,
            lastModified: Date.now(),
            metadata: { rootDirHandle: workspaceHandle },
          },
        });
      });
      database.close();
    },
    {
      parentName: PARENT_DIR,
      workspaceName: WORKSPACE_NAME,
      noteContent: NOTE_CONTENT,
    },
  );

  await page.goto(
    `/ws#route=editor&wsPath=${encodeURIComponent(`${WORKSPACE_NAME}:source.md`)}`,
  );
  const editor = getEditorLocator(page, {});
  await expect(editor).toContainText('Content that must survive the rename.');

  // A second tab receives both BroadcastChannel events from this tab and its
  // own filesystem observer records. Neither source may turn the physical
  // fallback's intermediate state into a missing active note.
  const secondPage = await context.newPage();
  await secondPage.goto(
    `/ws#route=editor&wsPath=${encodeURIComponent(`${WORKSPACE_NAME}:source.md`)}`,
  );
  const secondEditor = getEditorLocator(secondPage, {});
  await expect(secondEditor).toContainText(
    'Content that must survive the rename.',
  );

  await page.evaluate(() => {
    (
      window as typeof window & {
        __nativeRenameWatcherTest: NativeRenameWatcherTestState;
      }
    ).__nativeRenameWatcherTest.pendingRename = {
      oldFileName: 'source.md',
      newFileName: 'renamed.md',
    };
  });

  const explorer = page.getByTestId('bangle-file-explorer');
  await explorer
    .getByRole('treeitem', { name: 'source.md', exact: true })
    .click({ button: 'right' });
  await page
    .locator('[data-file-tree-context-menu-root="true"]')
    .getByRole('button', { name: 'Rename' })
    .click();
  const renameDialog = page.getByRole('dialog', { name: 'Rename Note' });
  await renameDialog.getByRole('textbox', { name: 'New name' }).fill('renamed');
  await renameDialog.getByRole('textbox', { name: 'New name' }).press('Enter');

  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (
            window as typeof window & {
              __nativeRenameWatcherTest: NativeRenameWatcherTestState;
            }
          ).__nativeRenameWatcherTest.deliveries,
      ),
    )
    .toBe(1);

  // Each page owns an independent FileSystemObserver. Deliver the same
  // pre-logical record to the second tab while the initiating tab still holds
  // the physical rename promise, then prove both observers saw the race.
  await secondPage.evaluate(() => {
    (
      window as typeof window & {
        __nativeRenameWatcherTest: NativeRenameWatcherTestState;
      }
    ).__nativeRenameWatcherTest.deliverMove('source.md', 'renamed.md');
  });
  await expect
    .poll(() =>
      secondPage.evaluate(
        () =>
          (
            window as typeof window & {
              __nativeRenameWatcherTest: NativeRenameWatcherTestState;
            }
          ).__nativeRenameWatcherTest.deliveries,
      ),
    )
    .toBe(1);

  try {
    await expect(editor).toContainText('Content that must survive the rename.');
    await expect(secondEditor).toContainText(
      'Content that must survive the rename.',
    );
    await expect(
      page.getByRole('heading', { name: 'Note Not Found' }),
    ).toBeHidden();
    await expect(
      secondPage.getByRole('heading', { name: 'Note Not Found' }),
    ).toBeHidden();
  } finally {
    await page.evaluate(() => {
      const state = (
        window as typeof window & {
          __nativeRenameWatcherTest: NativeRenameWatcherTestState;
        }
      ).__nativeRenameWatcherTest;
      state.releaseRename?.();
      state.releaseRename = undefined;
    });
  }

  await expect(page).toHaveURL(
    `/ws#route=editor&wsPath=${encodeURIComponent(`${WORKSPACE_NAME}:renamed.md`)}`,
  );
  await expect(secondPage).toHaveURL(
    `/ws#route=editor&wsPath=${encodeURIComponent(`${WORKSPACE_NAME}:renamed.md`)}`,
  );
  await expect(editor).toContainText('Content that must survive the rename.');
  await expect(
    explorer.getByRole('treeitem', { name: 'renamed.md', exact: true }),
  ).toBeVisible();
  await expect(
    explorer.getByRole('treeitem', { name: 'source.md', exact: true }),
  ).toHaveCount(0);

  // The durable outcome on disk: the destination holds the source bytes and
  // the source entry is gone (the delete only happens after verification).
  const filesOnDisk = await page.evaluate(
    async ({ parentName, workspaceName }) => {
      const root = await navigator.storage.getDirectory();
      const parent = await root.getDirectoryHandle(parentName);
      const workspaceHandle = await parent.getDirectoryHandle(workspaceName);
      const names: string[] = [];
      for await (const entry of workspaceHandle.values()) {
        names.push(entry.name);
      }
      const renamedHandle = await workspaceHandle.getFileHandle('renamed.md');
      const renamedFile = await renamedHandle.getFile();
      return { names: names.sort(), renamedContent: await renamedFile.text() };
    },
    { parentName: PARENT_DIR, workspaceName: WORKSPACE_NAME },
  );
  expect(filesOnDisk.names).toEqual(['renamed.md']);
  expect(filesOnDisk.renamedContent).toBe(NOTE_CONTENT);

  // The rename must survive a reload from the real file system.
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(editor).toContainText('Content that must survive the rename.');
  await expect(page).toHaveURL(
    `/ws#route=editor&wsPath=${encodeURIComponent(`${WORKSPACE_NAME}:renamed.md`)}`,
  );
});
