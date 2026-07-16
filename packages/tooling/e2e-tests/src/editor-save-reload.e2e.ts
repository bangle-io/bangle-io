import { expect, test } from '@playwright/test';
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
    services: DebugServices;
  };

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
  const debugUrl = new URL(page.url());
  debugUrl.searchParams.set('debug', 'true');
  await page.goto(debugUrl.toString(), { waitUntil: 'domcontentloaded' });
  await expect
    .poll(() =>
      page.evaluate(() => Boolean((window as Partial<DebugWindow>).services)),
    )
    .toBe(true);

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
