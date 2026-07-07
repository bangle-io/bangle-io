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

// A remote file server runs alongside the test worker. It stays up across page
// reloads, so an in-memory store is enough to prove persistence — the server
// (not the browser) is the source of truth. A token is set because cross-origin
// access (test app origin -> server origin) requires one.
const TOKEN = 'e2e-secret-token';
let server: StartedRemoteFileServer | undefined;
let store: RemoteFileStore & { list(ws: string): Promise<string[]> };

test.beforeAll(async () => {
  store = new MemoryRemoteFileStore();
  server = await startRemoteFileServer({
    store,
    token: TOKEN,
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
    await page.getByLabel('Access token', { exact: false }).fill(TOKEN);
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

test('An unreachable remote server surfaces an error and creates no workspace', async ({
  page,
}) => {
  await page.goto('/');

  await page.getByRole('button', { name: 'Create Workspace' }).click();
  await page.getByRole('radio', { name: /Remote Server/ }).click();
  await page.getByRole('button', { name: 'Next' }).click();

  await page.getByLabel('Workspace Name', { exact: true }).fill('broken-ws');
  // Port 1 is closed — the pre-flight probe fails fast.
  await page
    .getByLabel('Server URL', { exact: true })
    .fill('http://127.0.0.1:1');
  await page.getByRole('button', { name: 'Create' }).click();

  // The error is surfaced and the dialog stays open (still showing the URL
  // field); no workspace was created, so no workspace heading appears.
  await expect(page.getByText(/Could not reach the server/i)).toBeVisible();
  await expect(page.getByLabel('Server URL', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'broken-ws' })).toHaveCount(0);
});
