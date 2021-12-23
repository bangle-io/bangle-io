import { ElementHandle, Page } from '@playwright/test';
import os from 'os';
import prettier from 'prettier';

import { filePathToWsPath, resolvePath } from './bangle-helpers';

export const ctrlKey = os.platform() === 'darwin' ? 'Meta' : 'Control';

export const SELECTOR_TIMEOUT = 2000;

function uuid(len = 10) {
  return Math.random().toString(36).substring(2, 15).slice(0, len);
}

/**
 * Only runs actions visible in the palette
 */
async function runAction(page, actionId) {
  await page.keyboard.press('Escape');
  await page.keyboard.down(ctrlKey);
  await page.keyboard.down('Shift');
  await page.keyboard.press('P');
  await page.keyboard.up('Shift');
  await page.keyboard.up(ctrlKey);

  await clickPaletteRow(page, actionId);
}

export async function createWorkspace(page: Page, wsName = 'test' + uuid(4)) {
  await runAction(page, 'action::bangle-io-core-actions:NEW_WORKSPACE_ACTION');

  let handle = await page.waitForSelector('.ui-components_modal-container', {
    timeout: SELECTOR_TIMEOUT,
  });

  const storageSelectButton = await page.$(
    '[aria-label="select storage type"]',
  );

  await storageSelectButton?.click();

  let item = await page.waitForSelector('[aria-label="browser storage type"]', {
    timeout: SELECTOR_TIMEOUT,
  });

  await item.click();

  const input = await handle.$('input[aria-label="workspace name input"]');

  await input?.type(wsName);

  await page.waitForFunction(
    (wsName) => {
      return (
        (
          document.querySelector(
            '.ui-components_modal-container input[aria-label="workspace name input"]',
          ) as any
        )?.value === wsName
      );
    },
    wsName,
    {
      timeout: SELECTOR_TIMEOUT,
    },
  );

  await Promise.all([
    page.waitForNavigation({
      timeout: 5000,
      waitUntil: 'networkidle',
    }), // The promise resolves after navigation has finished
    page.click(
      '.ui-components_modal-container button[aria-label="create workspace"]',
    ),
  ]);

  if (!(await page.url()).endsWith('/ws/' + wsName)) {
    throw new Error('Workspace not set');
  }

  return wsName;
}

export async function clickPaletteRow(page, id) {
  const result = await page.waitForSelector(
    `.universal-palette-item[data-id="${id}"]`,
    {
      timeout: SELECTOR_TIMEOUT,
    },
  );
  await result.click();
}

export async function createNewNote(
  page: Page,
  wsName: string,
  noteName = 'new_file.md',
) {
  await runAction(page, 'action::bangle-io-core-actions:NEW_NOTE_ACTION');
  let handle = await page.waitForSelector('.universal-palette-container', {
    timeout: SELECTOR_TIMEOUT,
  });
  if (!noteName.endsWith('.md')) {
    noteName += '.md';
  }
  const input = await handle.$('input');
  await input?.type(noteName);

  await Promise.all([
    page.waitForNavigation({
      timeout: 5000,
      waitUntil: 'networkidle',
    }),
    clickPaletteRow(page, 'input-confirm'),
  ]);

  await waitForPrimaryEditorFocus(page);

  const wsPath = filePathToWsPath(wsName, noteName);

  if (!(await page.url()).includes(resolvePath(wsPath).locationPath)) {
    throw new Error('unable to create note');
  }

  return wsPath;
}

async function waitForPrimaryEditorFocus(page: Page) {
  await page.waitForSelector(
    '.editor-container_editor-0 .ProseMirror-focused',
    {
      timeout: 4 * SELECTOR_TIMEOUT,
    },
  );
}

export async function clearPrimaryEditor(page: Page) {
  await getPrimaryEditorHandler(page);
  await waitForPrimaryEditorFocus(page);

  await page.keyboard.down(ctrlKey);
  await page.keyboard.press('a', { delay: 10 });
  await page.keyboard.up(ctrlKey);
  await page.keyboard.press('Backspace', { delay: 10 });

  await page.waitForFunction(
    () =>
      (
        document.querySelector(
          '.editor-container_editor-0 .bangle-editor',
        ) as any
      ).innerText.trim() === '',
    {
      timeout: 2 * SELECTOR_TIMEOUT,
    },
  );
}

async function getPrimaryEditorHandler(page: Page, { focus = false } = {}) {
  const handle = await page.waitForSelector('.editor-container_editor-0', {
    timeout: SELECTOR_TIMEOUT,
  });

  await page.waitForSelector('.editor-container_editor-0 .bangle-editor', {
    timeout: SELECTOR_TIMEOUT,
  });

  if (focus) {
    await page.evaluate(async () => {
      (window as any).primaryEditor.view.focus();
    });
    await waitForPrimaryEditorFocus(page);
  }

  return handle;
}

export function sleep(t = 10) {
  return new Promise((res) => setTimeout(res, t));
}

export function longSleep(t = 50) {
  return new Promise((res) => setTimeout(res, t));
}

export async function getPrimaryEditorDebugString(el: ElementHandle) {
  return el.evaluate(async () =>
    (window as any).primaryEditor?.view.state.doc.toString(),
  );
}

export async function getEditorHTML(editorHandle) {
  return await frmtHTML(await editorHandle.evaluate((node) => node.innerHTML));
}

function frmtHTML(doc) {
  return prettier.format(doc, {
    semi: false,
    parser: 'html',
    printWidth: 36,
    singleQuote: true,
  });
}
