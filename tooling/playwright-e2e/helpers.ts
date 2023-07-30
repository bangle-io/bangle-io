import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import os from 'os';
import prettier from 'prettier';

import {
  PRIMARY_EDITOR_INDEX,
  SECONDARY_EDITOR_INDEX,
  WorkspaceType,
} from '@bangle.io/constants';
import type { EditorIdType, WsPath } from '@bangle.io/shared-types';

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

  await page.click(`li[data-key="${WorkspaceType.Browser}"]`);

  await page.click('[aria-label="Next"]');

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

  await page.getByText(`📖 Workspace ${wsName}`).isVisible();

  await expect(page.workers()).toHaveLength(1);

  for (const worker of page.workers()) {
    await expect
      .poll(async () => {
        return worker.evaluate(() => {
          const helpers = globalThis._e2eNaukarHelpers;

          return helpers?.isReady();
        });
      })
      .toBe(true);
  }

  return wsName;
}

/**
 * creates multiple notes from markdown strings
 */
export async function createNotesFromMdString(
  page: Page,
  wsName: string,
  notes: Array<[string, string]>,
) {
  notes.forEach(([wsPath]) => {
    if (resolvePath(wsPath).wsName !== wsName) {
      throw new Error(
        `Expected wsName to be ${wsName} but got ${resolvePath(wsPath).wsName}`,
      );
    }
  });

  await page.evaluate(
    async ({ notes }) => {
      for (const note of notes) {
        await window._nsmE2e?.nsmApi2.workspace.createNoteFromMd(
          note[0] as WsPath,
          note[1],
        );
      }
    },
    { notes },
  );
}

export async function getAllWsPathsHtml(
  page: Page,
  opts: {
    omitWsName?: boolean;
  } = {},
): Promise<Array<[string, any]>> {
  const allPaths = (await getAllWsPaths(page))?.sort();

  if (!allPaths) {
    return [];
  }

  let result: Array<[string, string]> = [];

  for (const wsPath of allPaths) {
    await pushWsPathToPrimary(page, wsPath, { waitForEditorToLoad: true });
    const editorLocator = await getEditorLocator(page, PRIMARY_EDITOR_INDEX);

    const html = await getEditorHTML(editorLocator);

    if (opts.omitWsName) {
      result.push([resolvePath(wsPath).filePath, html]);
    } else {
      result.push([wsPath, html]);
    }
  }

  return result;
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
    await page.evaluate(() => {
      return JSON.stringify(
        window._nsmE2e?.nsmApi2.workspace.workspaceState().wsPaths || [],
      );
    }),
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
  _wsPath: string,
  { waitForEditorToLoad = true } = {},
) {
  const wsPath = createWsPath(_wsPath);

  await page.evaluate(
    ([wsPath]) => {
      if (wsPath != null) {
        return _nsmE2e?.nsmApi2.workspace.pushPrimaryWsPath(wsPath);
      }
    },
    [wsPath],
  );

  if (waitForEditorToLoad) {
    await waitForEditorIdToLoad(page, PRIMARY_EDITOR_INDEX);
  }
}
export async function pushWsPathToSecondary(
  page: Page,
  _wsPath: string,
  { waitForEditorToLoad = true } = {},
) {
  const wsPath = createWsPath(_wsPath);

  await page.evaluate(
    ([wsPath]) => {
      if (wsPath != null) {
        return _nsmE2e?.nsmApi2.workspace.pushSecondaryWsPath(wsPath);
      }
    },
    [wsPath],
  );

  if (waitForEditorToLoad) {
    await waitForEditorIdToLoad(page, SECONDARY_EDITOR_INDEX);
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
  {
    skipWaitForFocus = false,
  }: {
    skipWaitForFocus?: boolean;
  } = {},
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

  if (!skipWaitForFocus) {
    await waitForPrimaryEditorFocus(page);
  }

  const wsPath = filePathToWsPath(wsName, noteName);

  if (!(await page.url()).includes(resolvePath(wsPath).filePath)) {
    throw new Error('unable to create note');
  }

  // currently new notes are created in primary editor
  const editorId = PRIMARY_EDITOR_INDEX;

  await waitForWsPathToLoad(page, editorId, { wsPath });

  await sleep();

  return wsPath;
}

async function waitForPrimaryEditorFocus(page: Page) {
  await page.isVisible(
    `.B-editor-container_editor-${PRIMARY_EDITOR_INDEX} .ProseMirror-focused`,
  );

  await waitForEditorFocus(page, PRIMARY_EDITOR_INDEX);
}
export async function waitForEditorFocus(
  page: Page,
  editorId: EditorIdType,
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

export async function clearEditor(
  page: Page,
  editorId: EditorIdType,
  attempt = 0,
) {
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
    .locator(
      `.B-editor-container_editor-${PRIMARY_EDITOR_INDEX} .bangle-editor`,
    )
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
  await page.isVisible(
    `.B-editor-container_editor-${PRIMARY_EDITOR_INDEX} .bangle-editor`,
  );

  await waitForEditorIdToLoad(page, PRIMARY_EDITOR_INDEX);

  await page.waitForFunction(() => {
    return window._nsmE2e?.primaryEditor?.destroyed === false;
  });

  if (focus) {
    await page.evaluate(async () => {
      window._nsmE2e?.primaryEditor?.view?.focus();
    });
    await waitForPrimaryEditorFocus(page);
  }

  return page.$(
    `.B-editor-container_editor-${PRIMARY_EDITOR_INDEX} .bangle-editor`,
  );
}

export async function getEditorLocator(
  page: Page,
  editorId: EditorIdType,
  { focus = false, wsPath }: { focus?: boolean; wsPath?: string } = {},
) {
  const loc = page.locator(
    `.B-editor-container_editor-${PRIMARY_EDITOR_INDEX} .bangle-editor`,
  );

  await loc.waitFor();

  if (wsPath) {
    await waitForWsPathToLoad(page, editorId, { wsPath });
  }

  await waitForEditorIdToLoad(page, editorId);

  if (focus) {
    await page.evaluate(
      async ([editorId, wsPath]) => {
        _nsmE2e?.getEditorDetailsById(editorId)?.editor.view.focus();
      },
      [editorId, wsPath] as const,
    );
    await waitForEditorFocus(page, editorId);
  }

  return page.locator(
    `.B-editor-container_editor-${editorId} .bangle-editor.bangle-collab-active`,
  );
}

export function sleep(t = 30) {
  return new Promise((res) => setTimeout(res, t));
}

export function longSleep(t = 70) {
  return new Promise((res) => setTimeout(res, t));
}

export async function getEditorDebugString(
  page: Page,
  editorId: EditorIdType,
  { wsPath }: { wsPath?: string } = {},
) {
  await getEditorLocator(page, editorId, { wsPath });

  return page.evaluate(async (editorId) => {
    return _nsmE2e
      ?.getEditorDetailsById(editorId)
      ?.editor?.view.state.doc.toString();
  }, editorId);
}

export async function getEditorSelectionJson(
  page: Page,
  editorId: EditorIdType,
) {
  return await page.evaluate(
    async ([editorId]) => {
      return _nsmE2e
        ?.getEditorDetailsById(editorId)
        ?.editor?.view.state.selection.toJSON();
    },
    [editorId] as const,
  );
}

export async function getPrimaryEditorDebugString(el: any) {
  // TODO fix the as any
  return (el as any).evaluate(async () =>
    window._nsmE2e?.primaryEditor?.view?.state.doc.toString(),
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
    window._nsmE2e?.secondaryEditor?.view?.state.doc.toString(),
  );
}

// Wait until  editor innerText contains the arg `text

export async function waitForEditorTextToContain(
  page: Page,
  editorId: EditorIdType,
  text: string,
  attempt = 0,
): Promise<void> {
  let loc = page.locator(
    `.B-editor-container_editor-${editorId} .bangle-editor.bangle-collab-active`,
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

export async function getEditorJSON(page: Page, editorId: EditorIdType) {
  await getEditorLocator(page, editorId);

  return page.evaluate(
    async (editorId: EditorIdType) =>
      _nsmE2e?.getEditorDetailsById(editorId)?.editor.view.state.doc.toJSON(),
    editorId,
  );
}

export async function splitScreen(page: Page) {
  await Promise.all([
    page.waitForNavigation(),
    page.press('.bangle-editor', ctrlKey + '+\\'),
  ]);
}

export async function waitForWsPathToLoad(
  page: Page,
  editorId: EditorIdType,
  { wsPath }: { wsPath: string },
) {
  await Promise.all([
    page.waitForFunction(
      ({ editorId, wsPath }) => {
        return _nsmE2e?.getEditorDetailsById(editorId)?.wsPath === wsPath;
      },
      { editorId, wsPath },
    ),
    waitForEditorIdToLoad(page, editorId),
  ]);
}

export async function waitForEditorIdToLoad(
  page: Page,
  editorId: EditorIdType,
) {
  await page.waitForFunction(
    ({ editorId }) => {
      try {
        return (
          _nsmE2e?.getEditorDetailsById(editorId)?.editor?.destroyed === false
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

  await page
    .locator(
      `.B-editor-container_editor-container-${editorId} .bangle-collab-active`,
    )
    .waitFor();
}

export async function waitForNotification(page: Page, text: string) {
  await page
    .locator(`[data-testid="app-entry_notification"]`)
    .filter({
      hasText: text,
    })
    .waitFor();
}

// Enables editing in a mobile UI
export async function mobileEnableEditing(page: Page) {
  let activityBar = page.locator('.B-ui-dhancha_activitybar');
  let doneEditing = activityBar.locator('role=button[name="done editing"]');

  if (
    await doneEditing.isVisible({
      timeout: 20,
    })
  ) {
    expect(await isEditorEditable(page, PRIMARY_EDITOR_INDEX)).toBe(true);

    return;
  }

  await activityBar.waitFor();

  const edit = activityBar.locator('role=button[name="edit"]');
  await edit.click();
  await activityBar.locator('role=button[name="done editing"]').waitFor();

  expect(await isEditorEditable(page, PRIMARY_EDITOR_INDEX)).toBe(true);
}

export async function isEditorEditable(page: Page, editorId: EditorIdType) {
  let editor = await getEditorLocator(page, editorId);

  return (await editor.getAttribute('contenteditable')) === 'true';
}

export function testIdSelector(testId: string) {
  return `[data-testid="${testId}"]`;
}

export function getTestIdLocator(testId: string, page: Page): Locator {
  return page.locator(testIdSelector(testId));
}

// cant use the original createWsPath because of dep issues
export function createWsPath(wsPath: string): WsPath {
  if (wsPath.split('/').some((r) => r.length === 0)) {
    throw new Error('Invalid path ' + wsPath);
  }

  const [wsName, filePath, ...others] = wsPath.split(':');

  if (others.length > 0) {
    throw new Error('Invalid path ' + wsPath);
  }

  if (!wsName || !filePath) {
    throw new Error('Invalid path ' + wsPath);
  }

  return wsPath as WsPath;
}

export function assertNotUndefined(
  value: unknown,
  message: string,
): asserts value {
  if (value === undefined) {
    throw new Error(`assertion failed: ${message}`);
  }
}
