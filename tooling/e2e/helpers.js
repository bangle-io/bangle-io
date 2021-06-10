const os = require('os');
const prettier = require('prettier');
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

const SELECTOR_TIMEOUT = 500;

async function createWorkspace(wsName = 'test' + uuid()) {
  await runACommand('NEW_WORKSPACE');
  let handle = await page.waitForSelector('.bangle-palette', {
    timeout: SELECTOR_TIMEOUT,
  });

  await clickPaletteRow('browser');

  const input = await handle.$('input');

  await input.type(wsName);

  await longSleep();

  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle0' }), // The promise resolves after navigation has finished
    clickPaletteRow('input-confirm'),
  ]);

  expect(await page.url()).toMatch(url + '/ws/' + wsName);

  return wsName;
}

async function createNewNote(wsName, noteName = 'new_file.md') {
  await runACommand('NEW_NOTE_COMMAND');
  let handle = await page.waitForSelector('.bangle-palette', {
    timeout: SELECTOR_TIMEOUT,
  });
  if (!noteName.endsWith('.md')) {
    noteName += '.md';
  }
  const input = await handle.$('input');
  await input.type(noteName);

  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle0' }),
    clickPaletteRow('input-confirm'),
  ]);

  await longSleep();
  expect(await page.url()).toMatch(url + '/ws/' + wsName + '/' + noteName);

  return wsName + ':' + noteName;
}

async function runACommand(commandId) {
  await page.keyboard.press('Escape');
  await page.keyboard.down(ctrlKey);
  await page.keyboard.down('Shift');
  await page.keyboard.press('P');
  await page.keyboard.up('Shift');
  await page.keyboard.up(ctrlKey);

  await clickPaletteRow(commandId);
}

async function clickPaletteRow(id) {
  const result = await page.waitForSelector(`.palette-row[data-id="${id}"]`, {
    timeout: SELECTOR_TIMEOUT,
  });
  await result.click();
}

async function clearEditor() {
  await longSleep();
  await page.keyboard.down(ctrlKey);
  await page.keyboard.press('a', { delay: 30 });
  await page.keyboard.up(ctrlKey);
  await page.keyboard.press('Backspace', { delay: 30 });
  await sleep();
}

async function getEditorHTML(editorHandle) {
  return await frmtHTML(await editorHandle.evaluate((node) => node.innerHTML));
}

async function getPrimaryEditorHandler(page, { focus = false } = {}) {
  const handle = await page.waitForSelector('.primary-editor', {
    timeout: SELECTOR_TIMEOUT,
  });

  await page.waitForSelector('.primary-editor .bangle-editor', {
    timeout: SELECTOR_TIMEOUT,
  });

  if (focus) {
    await page.evaluate(async () => {
      window.primaryEditor.view.focus();
    });
  }

  return handle;
}

async function getSecondaryEditorHandler(page, { focus = false } = {}) {
  const handle = await page.waitForSelector('.secondary-editor', {
    timeout: SELECTOR_TIMEOUT,
  });

  if (focus) {
    await page.evaluate(async () => {
      window.primaryEditor.view.focus();
    });
  }
  return handle;
}

async function getPrimaryEditorDebugString(page) {
  return page.evaluate(async () =>
    window.primaryEditor?.view.state.doc.toString(),
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

  const handle = await page.waitForSelector('.bangle-palette', {
    timeout: SELECTOR_TIMEOUT,
  });

  const wsPaths = await handle.$$eval(`.palette-row[data-id]`, (nodes) =>
    [...nodes].map((n) => n.getAttribute('data-id')),
  );

  await page.keyboard.press('Escape');

  return wsPaths;
}

module.exports = {
  SELECTOR_TIMEOUT,
  sleep,
  url,
  ctrlKey,
  longSleep,
  frmtHTML,
  createNewNote,
  runACommand,
  clearEditor,
  getEditorHTML,
  createWorkspace,
  setPageWidescreen,
  setPageSmallscreen,
  getPrimaryEditorHandler,
  getSecondaryEditorHandler,
  getPrimaryEditorDebugString,
  getSecondaryEditorDebugString,
  getWsPathsShownInFilePalette,
};
