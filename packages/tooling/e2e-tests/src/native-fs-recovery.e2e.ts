import { expect, test } from '@playwright/test';
import { expectNoPageHorizontalOverflow } from './common';

const WORKSPACE_NAME = 'recovery-workspace';
const MISSING_PARENT = 'native-recovery-missing-parent';
const REPLACEMENT_PARENT = 'native-recovery-replacement-parent';

test('recovers a missing Native FS workspace without presenting it as empty', async ({
  page,
}) => {
  await page.addInitScript(
    ({ replacementParent, workspaceName }) => {
      window.showDirectoryPicker = async () => {
        const root = await navigator.storage.getDirectory();
        const parent = await root.getDirectoryHandle(replacementParent);
        return parent.getDirectoryHandle(workspaceName);
      };
    },
    {
      replacementParent: REPLACEMENT_PARENT,
      workspaceName: WORKSPACE_NAME,
    },
  );

  await page.goto('/');
  await page.evaluate(
    async ({ missingParentName, replacementParentName, workspaceName }) => {
      const root = await navigator.storage.getDirectory();
      for (const parentName of [missingParentName, replacementParentName]) {
        await root.removeEntry(parentName, { recursive: true }).catch(() => {});
      }

      const missingParent = await root.getDirectoryHandle(missingParentName, {
        create: true,
      });
      const missingHandle = await missingParent.getDirectoryHandle(
        workspaceName,
        { create: true },
      );

      const replacementParent = await root.getDirectoryHandle(
        replacementParentName,
        { create: true },
      );
      const replacementHandle = await replacementParent.getDirectoryHandle(
        workspaceName,
        { create: true },
      );
      const welcomeHandle = await replacementHandle.getFileHandle(
        'welcome.md',
        { create: true },
      );
      const writable = await welcomeHandle.createWritable();
      await writable.write('# Reconnected workspace\n');
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
            metadata: { rootDirHandle: missingHandle },
          },
        });
      });
      database.close();

      // The stored handle remains cloneable but reading it now raises the same
      // NotFoundError as a moved/deleted local directory.
      await root.removeEntry(missingParentName, { recursive: true });
    },
    {
      missingParentName: MISSING_PARENT,
      replacementParentName: REPLACEMENT_PARENT,
      workspaceName: WORKSPACE_NAME,
    },
  );

  await page.goto(
    `/ws#route=ws-home&wsName=${encodeURIComponent(WORKSPACE_NAME)}`,
  );

  const recovery = page.getByTestId('page-native-fs-recovery');
  await expect(recovery).toBeVisible();
  await expect(
    recovery.getByRole('heading', {
      name: 'Reconnect your workspace folder',
    }),
  ).toBeVisible();
  await expect(recovery).toContainText(
    'Bangle has not changed your workspace entry or files.',
  );
  await expect(recovery.getByText('No notes found')).toHaveCount(0);
  await expect(
    recovery.getByRole('button', { name: 'Locate Folder' }),
  ).toBeVisible();
  await expect(
    recovery.getByRole('button', { name: 'Switch Workspace' }),
  ).toBeVisible();
  await expectNoPageHorizontalOverflow(page);

  await recovery.getByRole('button', { name: 'Locate Folder' }).click();

  await expect(recovery).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'welcome.md' })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: WORKSPACE_NAME }),
  ).toBeVisible();
});
