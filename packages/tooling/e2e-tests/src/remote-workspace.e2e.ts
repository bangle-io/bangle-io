import {
  type StartedRemoteFileServer,
  startRemoteFileServer,
} from '@bangle.io/remote-file-server';
import {
  MemoryRemoteFileStore,
  type RemoteFileStore,
} from '@bangle.io/remote-file-sync';
import { expect, test } from '@playwright/test';
import { clearEditor, getEditorLocator, getEditorText } from './common';

// A remote file server runs alongside the test worker. Because it stays up
// across page reloads, an in-memory store is enough to prove persistence — the
// server (not the browser) is the source of truth.
let server: StartedRemoteFileServer | undefined;
let store: RemoteFileStore & { list(ws: string): Promise<string[]> };

test.beforeAll(async () => {
  store = new MemoryRemoteFileStore();
  server = await startRemoteFileServer({
    store,
    port: 0,
    host: '127.0.0.1',
  });
});

test.afterAll(async () => {
  await server?.close();
  server = undefined;
});

test('Remote server workspace stores notes on the backend', async ({
  page,
}) => {
  const serverUrl = server?.url ?? '';
  const wsName = 'remote-ws';
  const mainContentLocator = page.locator('main.B-app-page-content');

  await page.goto('/');

  await test.step('create a remote-server workspace', async () => {
    await page.getByRole('button', { name: 'Create Workspace' }).click();

    await expect(page.getByRole('radiogroup')).toContainText('Remote Server');
    await page.getByRole('radio', { name: /Remote Server/ }).click();
    await page.getByRole('button', { name: 'Next' }).click();

    await page.getByLabel('Workspace Name', { exact: true }).fill(wsName);
    await page.getByLabel('Server URL', { exact: true }).fill(serverUrl);
    await page.getByRole('button', { name: 'Create' }).click();

    await expect(page.getByRole('heading', { name: wsName })).toBeVisible();
    await expect(mainContentLocator).toContainText(
      'No notes found in this workspace.',
    );
  });

  await test.step('create a note', async () => {
    await page.getByRole('button', { name: 'New Note' }).click();
    await expect(
      page.getByRole('dialog', { name: 'Create Note' }),
    ).toBeVisible();
    await page.getByLabel('Note name').fill('remote-note');
    await page.getByRole('button', { name: 'Create' }).click();

    await expect(
      page
        .getByLabel('breadcrumb')
        .getByRole('button', { name: 'remote-note.md' }),
    ).toBeVisible();
  });

  await test.step('edit the note', async () => {
    const editorHandle = getEditorLocator(page, {});
    await expect(editorHandle).toBeVisible();
    await editorHandle.click();
    await clearEditor(page, {});
    await editorHandle.pressSequentially('# Hello from the server', {
      delay: 30,
    });
    expect((await getEditorText(page, {})).trimEnd()).toBe(
      'Hello from the server',
    );
  });

  await test.step('the note is stored on the backend', async () => {
    await expect
      .poll(() => store.list(wsName), { timeout: 5000 })
      .toContain(`${wsName}/remote-note.md`);
  });

  await test.step('content survives a reload (served from the backend)', async () => {
    await page.reload({ waitUntil: 'networkidle' });
    expect((await getEditorText(page, {})).trimEnd()).toBe(
      'Hello from the server',
    );
  });
});
