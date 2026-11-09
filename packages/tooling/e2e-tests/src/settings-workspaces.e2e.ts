import { expect, test } from '@playwright/test';
import {
  createBrowserWorkspace,
  createBrowserWorkspaceAndNote,
} from './common';

async function openWorkspacesSettings(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: /Bangle\.io/ }).click();
  await page.getByRole('menuitem', { name: 'Settings' }).click();
  await page.getByRole('link', { name: 'Workspaces' }).click();
  await expect(
    page.getByRole('heading', { name: 'Workspaces' }).first(),
  ).toBeVisible();
}

// The note-count cell lives in the same row as the workspace-name link, so scope
// the assertion to that link's row to prove per-workspace correctness.
function noteCountCell(
  page: import('@playwright/test').Page,
  workspaceName: string,
) {
  return page.getByRole('link', { name: workspaceName }).locator('..');
}

test('workspaces settings lists workspaces and exposes row actions', async ({
  page,
}) => {
  const workspaceWithNote = 'settings-workspaces-notes';
  const emptyWorkspace = 'settings-workspaces-empty';

  await createBrowserWorkspaceAndNote(page, {
    workspaceName: workspaceWithNote,
    noteName: 'first-note',
  });
  await createBrowserWorkspace(page, { workspaceName: emptyWorkspace });

  await openWorkspacesSettings(page);

  await expect(
    page.getByRole('link', { name: workspaceWithNote }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: emptyWorkspace })).toBeVisible();
  await expect(
    noteCountCell(page, workspaceWithNote).getByText('1 note'),
  ).toBeVisible();
  await expect(
    noteCountCell(page, emptyWorkspace).getByText('0 notes'),
  ).toBeVisible();
  await expect(page.getByText(/Last opened/).first()).toBeVisible();

  // The route is URL-addressable: reloading must re-hydrate the workspaces page.
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(
    page.getByRole('heading', { name: 'Workspaces' }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: workspaceWithNote }),
  ).toBeVisible();

  await page
    .getByRole('button', {
      name: `Workspace actions for ${workspaceWithNote}`,
    })
    .click();
  await expect(
    page.getByRole('menuitem', { name: 'Open workspace' }),
  ).toBeVisible();
  await expect(
    page.getByRole('menuitem', { name: 'Delete workspace' }),
  ).toBeVisible();
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: 'New workspace' }).click();
  await expect(
    page.getByRole('dialog', { name: 'Select a workspace type' }),
  ).toBeVisible();
  await page.getByRole('radio', { name: /Browser/i }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await page
    .getByLabel('Workspace Name', { exact: true })
    .fill(workspaceWithNote);
  await page.getByRole('button', { name: 'Create' }).dblclick();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('alert')).toContainText(
    'Cannot create workspace as it already exists',
  );
  await expect(page.getByRole('button', { name: 'Create' })).toBeEnabled();
  await page.getByRole('button', { name: 'Cancel' }).click();

  const searchButton = page.getByRole('button', { name: /Search/ });
  await searchButton.focus();
  await searchButton.press('Space');
  await page.getByRole('combobox').fill('settings');
  await expect(
    page.getByRole('option', { exact: true, name: 'Settings' }),
  ).toBeVisible();
  await expect(
    page.getByRole('option', { name: 'Settings - General' }),
  ).toBeVisible();
  await expect(
    page.getByRole('option', { name: 'Settings - Workspaces' }),
  ).toBeVisible();
});

test('workspaces settings deletes a workspace from the row actions', async ({
  page,
}) => {
  const keptWorkspace = 'settings-workspaces-keep';
  const deletedWorkspace = 'settings-workspaces-delete';

  await createBrowserWorkspace(page, { workspaceName: keptWorkspace });
  await createBrowserWorkspace(page, { workspaceName: deletedWorkspace });

  await openWorkspacesSettings(page);

  await expect(
    page.getByRole('link', { name: deletedWorkspace }),
  ).toBeVisible();

  await page
    .getByRole('button', {
      name: `Workspace actions for ${deletedWorkspace}`,
    })
    .click();
  await page.getByRole('menuitem', { name: 'Delete workspace' }).click();

  const confirmation = page.getByRole('alertdialog');
  await expect(confirmation).toBeVisible();
  await confirmation.getByRole('button', { name: 'Delete' }).click();

  // The deleted workspace is gone and the other survives, before and after reload.
  await expect(page.getByRole('link', { name: deletedWorkspace })).toHaveCount(
    0,
  );
  await expect(page.getByRole('link', { name: keptWorkspace })).toBeVisible();

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(
    page.getByRole('heading', { name: 'Workspaces' }).first(),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: deletedWorkspace })).toHaveCount(
    0,
  );
  await expect(page.getByRole('link', { name: keptWorkspace })).toBeVisible();
});

// Locate folder delegates the reveal to the native OS dialog, whose path bar
// is browser chrome that a page-level test cannot read. These assertions
// therefore cover the mechanism — the picker opens anchored (`startIn`) at the
// workspace's stored handle and the outcome is discarded — not the
// human-visible path itself.
test('locate folder anchors the OS picker at a nativefs workspace without side effects', async ({
  page,
}) => {
  const nativeWorkspace = 'locate-native-ws';
  const browserWorkspace = 'locate-browser-ws';
  const parentDir = 'locate-native-parent';

  type PickerCall = {
    id?: string;
    mode?: string;
    startInName?: string;
    startInKind?: string;
  };
  type PickerTestWindow = {
    __locatePickerCalls?: PickerCall[];
    __locatePickerBehavior?: 'select' | 'cancel';
  };

  await page.addInitScript(() => {
    const win = window as unknown as PickerTestWindow & typeof window;
    win.__locatePickerCalls = [];
    win.__locatePickerBehavior = 'select';
    win.showDirectoryPicker = async (options?: {
      id?: string;
      mode?: string;
      startIn?: FileSystemHandle;
    }) => {
      win.__locatePickerCalls?.push({
        id: options?.id,
        mode: options?.mode,
        startInName: options?.startIn?.name,
        startInKind: options?.startIn?.kind,
      });
      if (win.__locatePickerBehavior === 'cancel') {
        throw new DOMException('The user aborted a request.', 'AbortError');
      }
      // Selecting some unrelated folder must be a no-op for the app.
      return navigator.storage.getDirectory();
    };
  });

  await createBrowserWorkspace(page, { workspaceName: browserWorkspace });

  // Seed a nativefs workspace the same way native-fs-recovery.e2e.ts does:
  // an OPFS-backed directory handle stored in the WorkspaceInfo table.
  await page.evaluate(
    async ({ parentName, workspaceName }) => {
      const root = await navigator.storage.getDirectory();
      await root.removeEntry(parentName, { recursive: true }).catch(() => {});
      const parent = await root.getDirectoryHandle(parentName, {
        create: true,
      });
      const workspaceHandle = await parent.getDirectoryHandle(workspaceName, {
        create: true,
      });
      const noteHandle = await workspaceHandle.getFileHandle('welcome.md', {
        create: true,
      });
      const writable = await noteHandle.createWritable();
      await writable.write('# Locate me\n');
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
    { parentName: parentDir, workspaceName: nativeWorkspace },
  );

  // Reboot the app so the injected workspace entry is part of the list.
  await page.goto('/');
  await openWorkspacesSettings(page);
  await expect(page.getByRole('link', { name: nativeWorkspace })).toBeVisible();
  const urlBeforeLocate = page.url();

  // No on-disk folder to reveal for a browser workspace: the action is absent.
  await page
    .getByRole('button', { name: `Workspace actions for ${browserWorkspace}` })
    .click();
  await expect(
    page.getByRole('menuitem', { name: 'Open workspace' }),
  ).toBeVisible();
  await expect(
    page.getByRole('menuitem', { name: 'Locate folder' }),
  ).toHaveCount(0);
  await page.keyboard.press('Escape');

  const clickLocate = async () => {
    await page
      .getByRole('button', { name: `Workspace actions for ${nativeWorkspace}` })
      .click();
    await page.getByRole('menuitem', { name: 'Locate folder' }).click();
  };
  const readPickerCalls = () =>
    page.evaluate(
      () => (window as unknown as PickerTestWindow).__locatePickerCalls ?? [],
    );

  // Selecting a folder in the dialog: the pick is discarded.
  await clickLocate();
  await expect.poll(async () => (await readPickerCalls()).length).toBe(1);
  const [firstCall] = await readPickerCalls();
  expect(firstCall).toMatchObject({
    id: 'bangle-locate-workspace',
    mode: 'read',
    startInName: nativeWorkspace,
    startInKind: 'directory',
  });

  // Cancelling the dialog: equally a no-op, with no error surfaced.
  await page.evaluate(() => {
    (window as unknown as PickerTestWindow).__locatePickerBehavior = 'cancel';
  });
  await clickLocate();
  await expect.poll(async () => (await readPickerCalls()).length).toBe(2);
  await expect(page.getByRole('alert')).toHaveCount(0);

  // No rebind, no navigation, no list change — for either outcome.
  expect(page.url()).toBe(urlBeforeLocate);
  await expect(
    page.getByRole('heading', { name: 'Workspaces' }).first(),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: nativeWorkspace })).toBeVisible();
  await expect(
    page.getByRole('link', { name: browserWorkspace }),
  ).toBeVisible();
  const metadataIntact = await page.evaluate(
    async ({ parentName, workspaceName }) => {
      const root = await navigator.storage.getDirectory();
      const parent = await root.getDirectoryHandle(parentName);
      const expectedHandle = await parent.getDirectoryHandle(workspaceName);

      const request = indexedDB.open('bangle-io-db');
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      const entry = await new Promise<
        | {
            value?: {
              type?: string;
              metadata?: { rootDirHandle?: FileSystemDirectoryHandle };
            };
          }
        | undefined
      >((resolve, reject) => {
        const transaction = database.transaction('WorkspaceInfo', 'readonly');
        const getRequest = transaction
          .objectStore('WorkspaceInfo')
          .get(workspaceName);
        getRequest.onsuccess = () => resolve(getRequest.result);
        getRequest.onerror = () => reject(getRequest.error);
      });
      database.close();

      const storedHandle = entry?.value?.metadata?.rootDirHandle;
      return Boolean(
        entry?.value?.type === 'nativefs' &&
          storedHandle &&
          (await expectedHandle.isSameEntry(storedHandle)),
      );
    },
    { parentName: parentDir, workspaceName: nativeWorkspace },
  );
  expect(metadataIntact).toBe(true);
});
