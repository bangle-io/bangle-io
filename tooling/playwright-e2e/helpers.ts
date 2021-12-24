import { expect } from '@playwright/test';

import { ElementHandle, Locator, Page } from '@playwright/test';
import os from 'os';
import prettier from 'prettier';

import { filePathToWsPath, resolvePath } from './bangle-helpers';

export const ctrlKey = os.platform() === 'darwin' ? 'Meta' : 'Control';

export const SELECTOR_TIMEOUT = 2000;

const RECURSIVE_RETRY_MAX = 3;
function uuid(len = 10) {
  return Math.random().toString(36).substring(2, 15).slice(0, len);
}

/**
 * Only runs actions visible in the palette
 */
export async function runAction(page, actionId) {
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

  await page.click('[aria-label="select storage type"]');

  await page.click('[aria-label="browser storage type"]');

  await page.fill('input[aria-label="workspace name input"]', wsName);

  await expect(
    page.locator(
      '.ui-components_modal-container input[aria-label="workspace name input"]',
    ),
  ).toHaveValue(wsName);

  await Promise.all([
    page.waitForNavigation(), // The promise resolves after navigation has finished
    page.click(
      '.ui-components_modal-container button[aria-label="create workspace"]',
    ),
  ]);

  await expect(page).toHaveURL(new RegExp('/ws/' + wsName));

  return wsName;
}

export async function clickPaletteRow(page: Page, id: string) {
  await page.locator(`.universal-palette-item[data-id="${id}"]`).click();
}

export async function createNewNote(
  page: Page,
  wsName: string,
  noteName = 'new_file.md',
) {
  await runAction(page, 'action::bangle-io-core-actions:NEW_NOTE_ACTION');

  if (!noteName.endsWith('.md')) {
    noteName += '.md';
  }

  await page.fill(
    '.universal-palette-container [placeholder="Enter the name of your note"]',
    noteName,
  );

  await Promise.all([
    page.waitForNavigation(),
    clickPaletteRow(page, 'input-confirm'),
  ]);

  await waitForPrimaryEditorFocus(page);

  const wsPath = filePathToWsPath(wsName, noteName);

  if (!(await page.url()).includes(resolvePath(wsPath).locationPath)) {
    throw new Error('unable to create note');
  }

  // currently new notes are created in editorId==0
  const editorId = 0;
  await page.waitForFunction(
    ({ editorId, wsPath }) => {
      return (window as any)[`editor-${editorId}`]?.wsPath === wsPath;
    },
    { editorId, wsPath },
  );

  return wsPath;
}

async function waitForPrimaryEditorFocus(page: Page) {
  await page.isVisible('.editor-container_editor-0 .ProseMirror-focused');
}
async function waitForEditorFocus(page: Page, editorId: number) {
  await page.isVisible(
    `.editor-container_editor-${editorId} .ProseMirror-focused`,
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
    .locator('.editor-container_editor-0 .bangle-editor')
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
  await page.isVisible('.editor-container_editor-0 .bangle-editor');

  await page.waitForFunction(() => {
    return (window as any).primaryEditor?.destroyed === false;
  });

  if (focus) {
    await page.evaluate(async () => {
      (window as any).primaryEditor?.view?.focus();
    });
    await waitForPrimaryEditorFocus(page);
  }

  return page.$('.editor-container_editor-0 .bangle-editor');
}

export async function getEditorLocator(
  page: Page,
  editorId: number,
  { focus = false } = {},
) {
  const loc = page.locator(`.editor-container_editor-${0} .bangle-editor`);

  await loc.waitFor();

  await page.waitForFunction((editorId) => {
    return (window as any)[`editor-${editorId}`]?.editor?.destroyed === false;
  }, editorId);

  if (focus) {
    await page.evaluate(async (editorId) => {
      (window as any)[`editor-${editorId}`]?.editor?.view.focus();
    }, editorId);
    await waitForEditorFocus(page, editorId);
  }

  return page.locator(`.editor-container_editor-${editorId} .bangle-editor`);
}

export function sleep(t = 10) {
  return new Promise((res) => setTimeout(res, t));
}

export function longSleep(t = 50) {
  return new Promise((res) => setTimeout(res, t));
}

export async function getEditorDebugString(page: Page, editorId: number) {
  await getEditorLocator(page, editorId);
  // TODO fix the as any
  return page.evaluate(
    async (editorId) =>
      (window as any)[`editor-${editorId}`]?.editor?.view.state.doc.toString(),
    editorId,
  );
}

export async function getPrimaryEditorDebugString(el: any) {
  // TODO fix the as any
  return (el as any).evaluate(async () =>
    (window as any).primaryEditor?.view?.state.doc.toString(),
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

export async function getSecondaryEditorDebugString(page: Page) {
  return (page as any).evaluate(async () =>
    (window as any).secondaryEditor?.view?.state.doc.toString(),
  );
}

// Wait until primary edits innerText contains the arg `text
export async function waitForPrimaryEditorTextToContain(
  page: Page,
  text: string,
  attempt = 0,
) {
  if (
    (
      await page.innerText('.editor-container_editor-0 .bangle-editor')
    ).includes(text)
  ) {
    return true;
  }

  if (attempt < RECURSIVE_RETRY_MAX) {
    await sleep();
    return waitForPrimaryEditorTextToContain(page, text, attempt + 1);
  }

  throw new Error('failed waitForPrimaryEditorTextToContain');
}
