import { expect, type Page, test } from '@playwright/test';
import {
  createBrowserWorkspaceAndNote,
  getEditorLocator,
  readStoredMarkdown,
  waitForEditorFocus,
} from './common';

type DebugServices = {
  core: {
    editorEngine: {
      retryFailedSave: (wsPath: string) => boolean;
    };
    fileSystem: {
      writeFile: (wsPath: string, file: File) => Promise<void>;
    };
    workbenchState: {
      reloadUi: () => void;
    };
  };
};

type DebugWindow = Window &
  typeof globalThis & {
    previousBangleServices?: DebugServices;
    releaseDeferredEditorWrite?: () => void;
    services: DebugServices;
  };

async function enableDebugServices(page: Page): Promise<void> {
  const debugUrl = new URL(page.url());
  debugUrl.searchParams.set('debug', 'true');
  await page.goto(debugUrl.toString(), { waitUntil: 'domcontentloaded' });
  await expect
    .poll(() =>
      page.evaluate(() => Boolean((window as Partial<DebugWindow>).services)),
    )
    .toBe(true);
}

test('save status waits for durable storage before showing Saved', async ({
  page,
}) => {
  const workspaceName = 'editor-save-status-pending';
  const noteName = 'durable-status';
  const content = 'Content held behind a deferred durable write';

  await createBrowserWorkspaceAndNote(page, { workspaceName, noteName });
  await enableDebugServices(page);

  const saveStatus = page.getByTestId('editor-save-status');
  await expect(saveStatus).toBeEmpty();

  await page.evaluate(() => {
    const debugWindow = window as DebugWindow;
    const fileSystem = debugWindow.services.core.fileSystem;
    const originalWrite = fileSystem.writeFile.bind(fileSystem);
    fileSystem.writeFile = (wsPath, file) =>
      new Promise<void>((resolve, reject) => {
        debugWindow.releaseDeferredEditorWrite = () => {
          void originalWrite(wsPath, file).then(resolve, reject);
        };
      });
  });

  const editor = getEditorLocator(page, {});
  await editor.click();
  await waitForEditorFocus(page, {});
  await page.keyboard.insertText(content);

  // Pending removes any success claim immediately, while short writes avoid
  // flashing a busy label. The component timer test pins the exact delay.
  await expect(saveStatus).toBeEmpty();
  await expect(saveStatus).toHaveText('Saving…');
  await expect(
    readStoredMarkdown(page, workspaceName, noteName),
  ).resolves.not.toContain(content);

  await page.evaluate(() => {
    const debugWindow = window as DebugWindow;
    const release = debugWindow.releaseDeferredEditorWrite;
    if (!release) {
      throw new Error('Expected a deferred editor write');
    }
    release();
  });

  await expect(saveStatus).toHaveText('Saved');
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, noteName))
    .toContain(content);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(getEditorLocator(page, {})).toContainText(content);
  // A new mount has not observed a write and must not infer durability from a
  // raw clean snapshot.
  await expect(page.getByTestId('editor-save-status')).toBeEmpty();
});

test('failed status retries the exact note and clears only after durable write', async ({
  page,
}) => {
  const workspaceName = 'editor-save-status-failed';
  const noteName = 'retry-latest';
  const content = 'Latest bytes retained after a rejected editor write';

  await createBrowserWorkspaceAndNote(page, { workspaceName, noteName });
  await enableDebugServices(page);

  await page.evaluate(() => {
    const debugWindow = window as DebugWindow;
    const fileSystem = debugWindow.services.core.fileSystem;
    const originalWrite = fileSystem.writeFile.bind(fileSystem);
    let rejectNextWrite = true;
    fileSystem.writeFile = async (wsPath, file) => {
      if (rejectNextWrite) {
        rejectNextWrite = false;
        throw new Error('Injected rejected editor write');
      }
      await originalWrite(wsPath, file);
    };
  });

  const editor = getEditorLocator(page, {});
  await editor.click();
  await waitForEditorFocus(page, {});
  await page.keyboard.insertText(content);

  const saveStatus = page.getByTestId('editor-save-status');
  const retry = saveStatus.getByRole('button', { name: 'Retry' });
  await expect(retry).toBeVisible();
  await expect(saveStatus).not.toHaveText('Saved');
  await expect(
    readStoredMarkdown(page, workspaceName, noteName),
  ).resolves.not.toContain(content);

  await retry.click();
  await expect(retry).toBeHidden();
  await expect(saveStatus).toHaveText('Saved');
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, noteName))
    .toContain(content);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(getEditorLocator(page, {})).toContainText(content);
});

test('retrying a failed save after UI reload uses the current service graph', async ({
  page,
}) => {
  const workspaceName = 'editor-save-ui-reload';
  const noteName = 'retained-edit';
  const content = 'Unsaved content retained across the UI service reload';

  await createBrowserWorkspaceAndNote(page, { workspaceName, noteName });

  // The full CI runner serves on 127.0.0.1, where debug globals are disabled
  // unless explicitly requested. Reload the same editor route with the test
  // hook enabled so this regression can replace one storage write and retain
  // the old service graph across the real app reload event.
  await enableDebugServices(page);

  await page.evaluate(() => {
    const debugWindow = window as DebugWindow;
    debugWindow.services.core.fileSystem.writeFile = async () => {
      throw new Error('Injected write failure before UI reload');
    };
  });

  const editor = getEditorLocator(page, {});
  await editor.click();
  await waitForEditorFocus(page, {});
  await page.keyboard.insertText(content);

  const retrySave = page.getByRole('button', { name: 'Retry save' });
  await expect(retrySave).toBeVisible();

  await page.evaluate(() => {
    const debugWindow = window as DebugWindow;
    debugWindow.previousBangleServices = debugWindow.services;
    debugWindow.services.core.workbenchState.reloadUi();
  });

  await expect
    .poll(() =>
      page.evaluate(() => {
        const debugWindow = window as DebugWindow;
        return debugWindow.services !== debugWindow.previousBangleServices;
      }),
    )
    .toBe(true);
  await expect(editor).toHaveAttribute(
    'data-editor-name',
    new RegExp(`${workspaceName}:${noteName}\\.md`),
  );

  const retriedThroughDisposedGraph = await page.evaluate(
    ({ wsPath }) => {
      const debugWindow = window as DebugWindow;
      return debugWindow.previousBangleServices?.core.editorEngine.retryFailedSave(
        wsPath,
      );
    },
    { wsPath: `${workspaceName}:${noteName}.md` },
  );
  expect(retriedThroughDisposedGraph).toBe(true);

  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, noteName))
    .toContain(content);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(getEditorLocator(page, {})).toContainText(content);
});
