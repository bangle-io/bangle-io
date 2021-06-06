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

async function createWorkspace(
  wsName = ('test-' + Math.random()).slice(0, 12),
) {
  await runACommand('NEW_WORKSPACE');
  let handle = await page.$('.bangle-palette');

  await sleep();
  await clickPaletteRow('browser');

  const input = await handle.$('input');

  await input.type(wsName);
  await clickPaletteRow('input-confirm');

  await page.waitForNavigation();

  return wsName;
}

async function createNewNote(wsName, fileName = 'new-file') {
  await runACommand('NEW_NOTE_COMMAND');
  let handle = await page.$('.bangle-palette');

  const input = await handle.$('input');
  await input.type(fileName);
  await clickPaletteRow('input-confirm');
  await page.waitForNavigation();
  await longSleep();
  expect(await page.url()).toBe(url + '/ws/' + wsName + '/' + fileName + '.md');
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
  const result = await page.$(`.palette-row[data-id="${id}"]`);
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

async function getPrimaryEditorHandler(page) {
  return await page.$('.primary-editor');
}

async function getSecondaryEditorHandler(page) {
  return await page.$('.secondary-editor');
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

module.exports = {
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
  getPrimaryEditorHandler,
  getSecondaryEditorHandler,
  getPrimaryEditorDebugString,
  getSecondaryEditorDebugString,
};
