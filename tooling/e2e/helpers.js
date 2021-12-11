const os = require('os');
const prettier = require('prettier');
const { filePathToWsPath, resolvePath } = require('@bangle.io/ws-path');

const ctrlKey = os.platform() === 'darwin' ? 'Meta' : 'Control';
const url = 'http://localhost:1234';
function sleep(t = 10) {
  return new Promise((res) => setTimeout(res, t));
}

function longSleep(t = 50) {
  return new Promise((res) => setTimeout(res, t));
}

function frmtHTML(doc) {
  return prettier.format(doc, {
    semi: false,
    parser: 'html',
    printWidth: 36,
    singleQuote: true,
  });
}

async function pressLeftKey(page, { times = 1, withShift = false } = {}) {
  for (let t = 0; t < times; t++) {
    if (withShift) {
      await page.keyboard.down('Shift');
    }
    await page.keyboard.press('ArrowLeft', { delay: 5 });
    if (withShift) {
      await page.keyboard.up('Shift');
    }
  }
}

async function pressRightKey(page, { times = 1, withShift = false } = {}) {
  for (let t = 0; t < times; t++) {
    if (withShift) {
      await page.keyboard.down('Shift');
    }
    await page.keyboard.press('ArrowRight');
    if (withShift) {
      await page.keyboard.up('Shift');
    }
  }
}

async function pressCopyKey(page) {
  await page.keyboard.down(ctrlKey);
  await page.keyboard.press('c');
  await page.keyboard.up(ctrlKey);
}

async function pressPasteKey(page) {
  await page.keyboard.down(ctrlKey);
  await page.keyboard.press('v');
  await page.keyboard.up(ctrlKey);
}

const SELECTOR_TIMEOUT = 2000;

async function createWorkspace(page, wsName = 'test' + uuid(4)) {
  await runAction(page, 'action::bangle-io-core-actions:NEW_WORKSPACE_ACTION');
  let handle = await page.waitForSelector('.ui-components_modal-container', {
    timeout: SELECTOR_TIMEOUT,
  });

  const storageSelectButton = await page.$(
    '[aria-label="select storage type"]',
  );
  await storageSelectButton.click();

  let item = await page.waitForSelector('[aria-label="browser storage type"]', {
    timeout: SELECTOR_TIMEOUT,
  });

  await item.click();

  const input = await handle.$('input[aria-label="workspace name input"]');

  await input.type(wsName);

  await page.waitForFunction(
    (wsName) =>
      document.querySelector(
        '.ui-components_modal-container input[aria-label="workspace name input"]',
      ).value === wsName,
    {
      timeout: SELECTOR_TIMEOUT,
    },
    wsName,
  );

  await Promise.all([
    page.waitForNavigation({
      timeout: 5000,
      waitUntil: 'networkidle0',
    }), // The promise resolves after navigation has finished
    page.click(
      '.ui-components_modal-container button[aria-label="create workspace"]',
    ),
  ]);

  expect(await page.url()).toMatch(url + '/ws/' + wsName);

  return wsName;
}

async function newPage(browser, { widescreen = false } = {}) {
  const page = await browser.newPage();
  const handleError = (error) => {
    process.emit('uncaughtException', error);
  };
  page.on('error', handleError);
  page.on('pageerror', handleError);

  if (widescreen) {
    await setPageWidescreen(page);
  }

  return {
    page: page,
    destroyPage: async () => {
      page.off('error', handleError);
      page.off('pageerror', handleError);
      await page.close();
    },
  };
}
async function createNewNote(page, wsName, noteName = 'new_file.md') {
  await runAction(page, 'action::bangle-io-core-actions:NEW_NOTE_ACTION');
  let handle = await page.waitForSelector('.universal-palette-container', {
    timeout: SELECTOR_TIMEOUT,
  });
  if (!noteName.endsWith('.md')) {
    noteName += '.md';
  }
  const input = await handle.$('input');
  await input.type(noteName);

  await Promise.all([
    page.waitForNavigation({
      timeout: 5000,
      waitUntil: 'networkidle0',
    }),
    clickPaletteRow(page, 'input-confirm'),
  ]);

  await waitForPrimaryEditorFocus(page);

  const wsPath = filePathToWsPath(wsName, noteName);
  expect(await page.url()).toMatch(url + resolvePath(wsPath).locationPath);

  return wsPath;
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

async function clickPaletteRow(page, id) {
  const result = await page.waitForSelector(
    `.universal-palette-item[data-id="${id}"]`,
    {
      timeout: SELECTOR_TIMEOUT,
    },
  );
  await result.click();
}

async function clearPrimaryEditor(page) {
  await getPrimaryEditorHandler(page);
  await waitForPrimaryEditorFocus(page);

  await page.keyboard.down(ctrlKey);
  await page.keyboard.press('a', { delay: 10 });
  await page.keyboard.up(ctrlKey);
  await page.keyboard.press('Backspace', { delay: 10 });

  await page.waitForFunction(
    () =>
      document
        .querySelector('.editor-container_editor-0 .bangle-editor')
        .innerText.trim() === '',
    {
      timeout: 2 * SELECTOR_TIMEOUT,
    },
  );
}

// Wait until primary edits innerText contains the arg `text
async function waitForPrimaryEditorTextToContain(page, text) {
  await page.waitForSelector('.editor-container_editor-0 .bangle-editor', {
    timeout: SELECTOR_TIMEOUT,
  });

  await page.waitForFunction(
    (text) =>
      document
        .querySelector('.editor-container_editor-0 .bangle-editor')
        ?.innerText.trim()
        .includes(text),
    {
      timeout: 4 * SELECTOR_TIMEOUT,
    },
    text,
  );
}

async function waitForPrimaryEditorFocus(page) {
  await page.waitForSelector(
    '.editor-container_editor-0 .ProseMirror-focused',
    {
      timeout: 4 * SELECTOR_TIMEOUT,
    },
  );
}

async function waitForSecondaryEditorFocus(page) {
  await page.waitForSelector(
    '.editor-container_editor-1 .ProseMirror-focused',
    {
      timeout: 4 * SELECTOR_TIMEOUT,
    },
  );
}

async function getEditorHTML(editorHandle) {
  return await frmtHTML(await editorHandle.evaluate((node) => node.innerHTML));
}

async function getPrimaryEditorHTML(page) {
  const editorHandle = await getPrimaryEditorHandler(page);
  return await frmtHTML(await editorHandle.evaluate((node) => node.innerHTML));
}

async function getPrimaryEditorHandler(page, { focus = false } = {}) {
  const handle = await page.waitForSelector('.editor-container_editor-0', {
    timeout: SELECTOR_TIMEOUT,
  });

  await page.waitForSelector('.editor-container_editor-0 .bangle-editor', {
    timeout: SELECTOR_TIMEOUT,
  });

  if (focus) {
    await page.evaluate(async () => {
      window.primaryEditor.view.focus();
    });
    await waitForPrimaryEditorFocus(page);
  }

  return handle;
}

async function getSecondaryEditorHandler(page, { focus = false } = {}) {
  const handle = await page.waitForSelector('.editor-container_editor-1', {
    timeout: SELECTOR_TIMEOUT,
  });

  await page.waitForSelector('.editor-container_editor-1 .bangle-editor', {
    timeout: SELECTOR_TIMEOUT,
  });

  if (focus) {
    await page.evaluate(async () => {
      window.primaryEditor.view.focus();
    });
  }
  return handle;
}

async function getSecondaryEditorHTML(page) {
  const editorHandle = await getSecondaryEditorHandler(page);
  return await frmtHTML(await editorHandle.evaluate((node) => node.innerHTML));
}
async function getPrimaryEditorDebugString(page) {
  return page.evaluate(async () =>
    window.primaryEditor?.view.state.doc.toString(),
  );
}

async function getPrimaryEditorJSON(page) {
  return page.evaluate(async () =>
    window.primaryEditor?.view.state.doc.toJSON(),
  );
}

async function getSecondaryEditorDebugString(page) {
  return page.evaluate(async () =>
    window.secondaryEditor?.view.state.doc.toString(),
  );
}

async function setPageWidescreen(page) {
  await page.setViewport({ width: 1024, height: 768 });
}
async function setPageSmallscreen(page) {
  await page.setViewport({ width: 400, height: 768 });
}

function uuid(len = 10) {
  return Math.random().toString(36).substring(2, 15).slice(0, len);
}

async function getWsPathsShownInFilePalette(page) {
  await page.keyboard.press('Escape');
  await page.keyboard.down(ctrlKey);
  await page.keyboard.press('p');
  await page.keyboard.up(ctrlKey);

  const handle = await page.waitForSelector('.universal-palette-container', {
    timeout: SELECTOR_TIMEOUT,
  });

  await longSleep(100);

  const wsPaths = await handle.$$eval(
    `.universal-palette-item[data-id]`,
    (nodes) => [...nodes].map((n) => n.getAttribute('data-id')),
  );

  await page.keyboard.press('Escape');

  return wsPaths;
}

async function jestDebug() {
  return jestPuppeteer.debug();
}

module.exports = {
  clearPrimaryEditor,
  clickPaletteRow,
  createNewNote,
  createWorkspace,
  ctrlKey,
  frmtHTML,
  getEditorHTML,
  getPrimaryEditorDebugString,
  getPrimaryEditorHandler,
  getPrimaryEditorHTML,
  getPrimaryEditorJSON,
  getSecondaryEditorDebugString,
  getSecondaryEditorHandler,
  getSecondaryEditorHTML,
  getWsPathsShownInFilePalette,
  jestDebug,
  longSleep,
  newPage,
  pressCopyKey,
  pressLeftKey,
  pressPasteKey,
  pressRightKey,
  runAction,
  SELECTOR_TIMEOUT,
  setPageSmallscreen,
  setPageWidescreen,
  sleep,
  url,
  uuid,
  waitForPrimaryEditorFocus,
  waitForPrimaryEditorTextToContain,
  waitForSecondaryEditorFocus,
};
