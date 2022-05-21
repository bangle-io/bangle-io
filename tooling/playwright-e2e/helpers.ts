import { expect, Locator, Page } from '@playwright/test';
import os from 'os';
import prettier from 'prettier';

import { filePathToWsPath, resolvePath } from './bangle-helpers';

export const isDarwin = os.platform() === 'darwin';
export const ctrlKey = os.platform() === 'darwin' ? 'Meta' : 'Control';

export const SELECTOR_TIMEOUT = 2000;

const RECURSIVE_RETRY_MAX = 3;

export function uuid(len = 10) {
  return Math.random().toString(36).substring(2, 15).slice(0, len);
}

/**
 * Only runs actions visible in the palette
 */
export async function runOperation(page: Page, actionId: string) {
  await page.keyboard.press('Escape');
  await page.keyboard.down(ctrlKey);
  await page.keyboard.down('Shift');
  await page.keyboard.press('P');
  await page.keyboard.up('Shift');
  await page.keyboard.up(ctrlKey);

  await clickPaletteRow(page, actionId);
}

export async function createWorkspace(page: Page, wsName = 'test' + uuid(4)) {
  await runOperation(
    page,
    'operation::@bangle.io/core-extension:NEW_WORKSPACE',
  );

  await page.click('[aria-label="Select storage type"]');

  await page.click('li[data-key="browser"]');

  await page.fill('input[aria-label="workspace name input"]', wsName);

  await expect(
    page.locator(
      '.B-ui-components_dialog-content-container input[aria-label="workspace name input"]',
    ),
  ).toHaveValue(wsName);

  await Promise.all([
    page.waitForNavigation(), // The promise resolves after navigation has finished
    page.click(
      '.B-ui-components_dialog-content-container button[aria-label="Create workspace"]',
    ),
  ]);

  await expect(page).toHaveURL(new RegExp('/ws/' + wsName));

  return wsName;
}

export async function createWorkspaceFromBackup(
  page: Page,
  file: {
    buffer: Buffer;
    mimeType: string;
    name: string;
  },
  wsName = 'test' + uuid(4),
) {
  await createWorkspace(page, wsName);
  await longSleep();

  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    runOperation(
      page,
      'operation::@bangle.io/core-extension:NEW_WORKSPACE_FROM_BACKUP',
    ),
  ]);

  await fileChooser.setFiles({
    name: file.name,
    mimeType: file.mimeType,
    buffer: file.buffer,
  });

  return wsName;
}

export async function getAllWsPaths(
  page: Page,
  {
    // number of items you at minimum expect that should be there
    lowerBound = 1,
    attempt = 0,
  }: {
    lowerBound?: number;
    attempt?: number;
  } = {},
): Promise<undefined | string[]> {
  if (!(await page.$('.note-browser'))) {
    await runOperation(
      page,
      'operation::@bangle.io/note-browser:toggle-note-browser',
    );
  }

  const result = JSON.parse(
    await page.evaluate(() =>
      JSON.stringify((window as any)._e2eHelpers._getWsPaths()),
    ),
  );

  if (attempt > 3) {
    return result;
  }

  if (result == null || (Array.isArray(result) && result.length < lowerBound)) {
    await longSleep();

    return getAllWsPaths(page, { lowerBound, attempt: attempt + 1 });
  }

  return result;
}

export async function pushWsPathToPrimary(
  page: Page,
  wsPath: string,
  { waitForEditorToLoad = true } = {},
) {
  await page.evaluate(
    ([wsPath]) => (window as any)._e2eHelpers._pushWsPath(wsPath),
    [wsPath],
  );

  if (waitForEditorToLoad) {
    await waitForEditorIdToLoad(page, 0);
  }
}
export async function pushWsPathToSecondary(
  page: Page,
  wsPath: string,
  { waitForEditorToLoad = true } = {},
) {
  await page.evaluate(
    ([wsPath]) => (window as any)._e2eHelpers._pushWsPath(wsPath, true),
    [wsPath],
  );

  if (waitForEditorToLoad) {
    await waitForEditorIdToLoad(page, 1);
  }
}

export async function openWorkspacePalette(page: Page) {
  await page.keyboard.press(ctrlKey + '+p');

  await page.locator('.B-ui-components_universal-palette-container').waitFor();
  await page.type('.B-ui-components_universal-palette-input', 'ws:');

  await page
    .locator('[data-palette-type="bangle-io-core-palettes/workspace"]')
    .waitFor();

  await sleep();
}

export async function clickPaletteRow(page: Page, id: string) {
  await page
    .locator(`.B-ui-components_universal-palette-item[data-id="${id}"]`)
    .click();
}

export async function createNewNote(
  page: Page,
  wsName: string,
  noteName = 'new_file.md',
) {
  await runOperation(page, 'operation::@bangle.io/core-extension:NEW_NOTE');

  if (!noteName.endsWith('.md')) {
    noteName += '.md';
  }

  await page.fill(
    '.B-ui-components_universal-palette-container [placeholder="Enter the name of your note"]',
    noteName,
  );

  await Promise.all([
    page.waitForNavigation(),
    clickPaletteRow(page, 'input-confirm'),
  ]);

  await waitForPrimaryEditorFocus(page);

  const wsPath = filePathToWsPath(wsName, noteName);

  if (!(await page.url()).includes(resolvePath(wsPath).filePath)) {
    throw new Error('unable to create note');
  }

  // currently new notes are created in editorId==0
  const editorId = 0;

  await waitForWsPathToLoad(page, editorId, { wsPath });

  await sleep();

  return wsPath;
}

async function waitForPrimaryEditorFocus(page: Page) {
  await page.isVisible('.B-editor-container_editor-0 .ProseMirror-focused');
}
export async function waitForEditorFocus(
  page: Page,
  editorId: number,
  { wsPath }: { wsPath?: string } = {},
) {
  await page
    .locator(`.B-editor-container_editor-${editorId} .ProseMirror-focused`)
    .waitFor();

  if (wsPath) {
    await waitForWsPathToLoad(page, editorId, { wsPath });
  }

  await page.isVisible(
    `.B-editor-container_editor-${editorId} .ProseMirror-focused`,
  );
}

export async function clearEditor(page: Page, editorId: number, attempt = 0) {
  await getEditorLocator(page, editorId, { focus: true });
  await waitForEditorFocus(page, editorId);

  await page.keyboard.down(ctrlKey);
  await page.keyboard.press('a', { delay: 10 });
  await page.keyboard.up(ctrlKey);

  let text: string | undefined;
  await sleep();

  await page.keyboard.down(ctrlKey);
  await page.keyboard.press('a', { delay: 10 });
  await page.keyboard.up(ctrlKey);

  await page.keyboard.press('Backspace', { delay: 10 });

  await sleep();

  text = await page
    .locator('.B-editor-container_editor-0 .bangle-editor')
    .innerText();

  if (text.trim() !== '') {
    if (attempt < RECURSIVE_RETRY_MAX) {
      await clearEditor(page, editorId, attempt + 1);

      return;
    } else {
      throw new Error('cant clearPrimaryEditor');
    }
  }
}

export async function getPrimaryEditorHandler(
  page: Page,
  { focus = false } = {},
) {
  await page.isVisible(`.B-editor-container_editor-0 .bangle-editor`);

  await waitForEditorIdToLoad(page, 0);

  await page.waitForFunction(() => {
    return (window as any)._e2eHelpers._primaryEditor?.destroyed === false;
  });

  if (focus) {
    await page.evaluate(async () => {
      (window as any)._e2eHelpers._primaryEditor?.view?.focus();
    });
    await waitForPrimaryEditorFocus(page);
  }

  return page.$('.B-editor-container_editor-0 .bangle-editor');
}

export async function getEditorLocator(
  page: Page,
  editorId: number,
  { focus = false, wsPath }: { focus?: boolean; wsPath?: string } = {},
) {
  const loc = page.locator(`.B-editor-container_editor-${0} .bangle-editor`);

  await loc.waitFor();

  if (wsPath) {
    await waitForWsPathToLoad(page, editorId, { wsPath });
  }

  await waitForEditorIdToLoad(page, editorId);

  if (focus) {
    await page.evaluate(
      async ([editorId, wsPath]) => {
        (window as any)[`editor-${editorId}`]?.editor?.view.focus();
      },
      [editorId, wsPath],
    );
    await waitForEditorFocus(page, editorId);
  }

  return page.locator(`.B-editor-container_editor-${editorId} .bangle-editor`);
}

export function sleep(t = 20) {
  return new Promise((res) => setTimeout(res, t));
}

export function longSleep(t = 70) {
  return new Promise((res) => setTimeout(res, t));
}

export async function getEditorDebugString(
  page: Page,
  editorId: number,
  { wsPath }: { wsPath?: string } = {},
) {
  await getEditorLocator(page, editorId, { wsPath });

  // TODO fix the as any
  return page.evaluate(
    async (editorId) =>
      (window as any)[`editor-${editorId}`]?.editor?.view.state.doc.toString(),
    editorId,
  );
}

export async function getEditorSelectionJson(page: Page, editorId: number) {
  return await page.evaluate(
    async ([editorId]) =>
      (window as any)[
        `editor-${editorId}`
      ]?.editor?.view.state.selection.toJSON(),
    [editorId],
  );
}

export async function getPrimaryEditorDebugString(el: any) {
  // TODO fix the as any
  return (el as any).evaluate(async () =>
    (window as any)._e2eHelpers._primaryEditor?.view?.state.doc.toString(),
  );
}

export async function getEditorHTML(editorHandle: Locator) {
  return await frmtHTML(await editorHandle.evaluate((node) => node.innerHTML));
}

function frmtHTML(doc: string) {
  return prettier.format(doc, {
    semi: false,
    parser: 'html',
    printWidth: 36,
    singleQuote: true,
  });
}

export async function getSecondaryEditorDebugString(page: Page) {
  return (page as any).evaluate(async () =>
    (window as any)._e2eHelpers._secondaryEditor?.view?.state.doc.toString(),
  );
}

// Wait until  edittor innerText contains the arg `text

export async function waitForEditorTextToContain(
  page: Page,
  editorId: number,
  text: string,
  attempt = 0,
): Promise<void> {
  let loc = page.locator(
    `.B-editor-container_editor-${editorId} .bangle-editor`,
  );

  await expect(loc).toContainText(text, { timeout: 10000, useInnerText: true });
}

export async function getItemsInPalette(
  page: Page,
  { hasItems = false }: { hasItems?: boolean } = {},
) {
  await page.locator('.B-ui-components_universal-palette-container').waitFor();

  const locator = page.locator(
    '.B-ui-components_universal-palette-item[data-id]',
  );

  if (hasItems) {
    await locator.first().waitFor();
  }
  await sleep();

  let result = await locator.evaluateAll((nodes) =>
    [...nodes].map((n) => n.getAttribute('data-id')),
  );

  // wait a little more if items are not showing up
  if (result.length === 0) {
    await longSleep();

    return locator.evaluateAll((nodes) =>
      [...nodes].map((n) => n.getAttribute('data-id')),
    );
  }

  return result;
}

export async function clickItemInPalette(page: Page, dataId: string) {
  await page.locator('.B-ui-components_universal-palette-container').waitFor();

  const locator = page.locator(
    `.B-ui-components_universal-palette-item[data-id="${dataId}"]`,
  );

  return locator.click();
}

export async function getWsPathsShownInFilePalette(page: Page) {
  await page.keyboard.press('Escape');
  await page.keyboard.down(ctrlKey);
  await page.keyboard.press('p');
  await page.keyboard.up(ctrlKey);

  await page.locator('.B-ui-components_universal-palette-container').waitFor();

  const locator = page.locator(
    '.B-ui-components_universal-palette-item[data-id]',
  );

  await sleep();

  const wsPaths = await locator.evaluateAll((nodes) =>
    [...nodes].map((n) => n.getAttribute('data-id')),
  );

  await page.keyboard.press('Escape');

  return wsPaths;
}

export async function getEditorJSON(page: Page, editorId: number) {
  await getEditorLocator(page, editorId);

  return page.evaluate(
    async (editorId: number) =>
      (window as any)[`editor-${editorId}`]?.editor.view.state.doc.toJSON(),
    editorId,
  );
}

export async function splitScreen(page: Page) {
  await Promise.all([
    page.waitForNavigation(),
    page.press('.bangle-editor', ctrlKey + '+\\'),
  ]);
}

export async function isIntersectingViewport(loc: Locator) {
  return loc.evaluate(async (element) => {
    const visibleRatio: number = await new Promise((resolve) => {
      const observer = new IntersectionObserver((entries: any[]) => {
        resolve(entries[0].intersectionRatio);
        observer.disconnect();
      });
      observer.observe(element);
      // Firefox doesn't call IntersectionObserver callback unless
      // there are rafs.
      requestAnimationFrame(() => {});
    });

    return visibleRatio > 0;
  });
}

export async function waitForWsPathToLoad(
  page: Page,
  editorId: number,
  { wsPath }: { wsPath: string },
) {
  return page.waitForFunction(
    ({ editorId, wsPath }) => {
      return (window as any)[`editor-${editorId}`]?.wsPath === wsPath;
    },
    { editorId, wsPath },
  );
}

export async function waitForEditorIdToLoad(page: Page, editorId: number) {
  return page.waitForFunction(
    ({ editorId }) => {
      try {
        return (
          (window as any)[`editor-${editorId}`]?.editor?.destroyed === false
        );
      } catch (error) {
        if (
          // we wrap an editor in a revocable proxy, when an editor is unmounted
          // and a new editor hasn't been mounted yet, accessing the window.editor will throw an error
          // since the proxy was revoked.
          error instanceof Error &&
          error.message.includes('on a proxy that has been revoked')
        ) {
          return false;
        }
        throw error;
      }
    },
    { editorId },
  );
}

export async function waitForNotification(page: Page, text: string) {
  await page.locator(`text=${text}`).waitFor();
}
