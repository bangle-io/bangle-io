const url = 'http://localhost:1234';
const os = require('os');
const ctrlKey = os.platform() === 'darwin' ? 'Meta' : 'Control';
// const backSpaceKey = os.platform() === 'darwin' ? 'Backspace' : 'Delete';
const { sleep, frmtHTML } = require('./helpers');
jest.setTimeout(105 * 1000);

beforeEach(async () => {
  await jestPuppeteer.resetPage();
  await page.goto(url);
  page.on('error', (err) => {
    console.log('error happen at the page');
    throw err;
  });
  page.on('pageerror', (pageerr) => {
    console.log('pageerror occurred');
    throw pageerr;
  });
  await page.evaluate(() => localStorage.clear());
});

test('Title check', async () => {
  await expect(page.title()).resolves.toMatch('Bangle App');
});

test('Activity bar', async () => {
  const handle = await page.$('#activity-bar-area');
  expect(handle).not.toBe(null);
});

test('Main content exists', async () => {
  const handle = await page.$('.main-content');
  expect(handle).not.toBe(null);
});

test('shows file palette', async () => {
  let handle = await page.$('.bangle-palette');
  expect(handle).toBe(null);

  await page.keyboard.down(ctrlKey);
  await page.keyboard.press('p');
  await page.keyboard.up(ctrlKey);
  handle = await page.$('.bangle-palette');
  expect(handle).not.toBe(null);
});

test('shows command palette', async () => {
  await page.keyboard.down(ctrlKey);
  await page.keyboard.down('Shift');
  await page.keyboard.press('P');
  await page.keyboard.up('Shift');
  await page.keyboard.up(ctrlKey);

  let handle = await page.$('.bangle-palette');
  expect(handle).not.toBe(null);
  expect(
    (
      await page.$$eval('.palette-row', (nodes) =>
        nodes.map((n) => n.getAttribute('data-id')),
      )
    ).includes('TOGGLE_THEME_COMMAND'),
  ).toBe(true);
});

test('create a workspace in browser', async () => {
  const wsName = await createWorkspace();
  expect(await page.url()).toBe(url + '/ws/' + wsName);
});

test('create a new page saved in browser', async () => {
  const newFileName = 'new-file';
  const wsName = await createWorkspace();

  await runACommand('NEW_FILE_COMMAND');
  let handle = await page.$('.bangle-palette');

  const input = await handle.$('input');
  await input.type('new-file');
  await clickPaletteRow('input-confirm');
  await page.waitForNavigation();

  expect(await page.url()).toBe(
    url + '/ws/' + wsName + '/' + newFileName + '.md',
  );
  await sleep(50);
  const editorHandle = await page.$('.bangle-editor');
  await clearEditor(editorHandle);

  await editorHandle.type('# Wow', { delay: 3 });
  await editorHandle.press('Enter', { delay: 20 });
  await editorHandle.type('[ ] list', { delay: 3 });
  await sleep(20);

  expect(
    await frmtHTML(await editorHandle.evaluate((node) => node.innerHTML)),
  ).toMatchSnapshot();
});

async function createWorkspace(
  wsName = ('test-' + Math.random()).slice(0, 12),
) {
  await runACommand('NEW_BROWSER_WS_COMMAND');
  let handle = await page.$('.bangle-palette');

  const input = await handle.$('input');
  await input.type(wsName);
  await clickPaletteRow('input-confirm');

  await page.waitForNavigation();

  return wsName;
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
  await sleep(30);
  await page.keyboard.down(ctrlKey);
  await page.keyboard.press('a', { delay: 30 });
  await page.keyboard.up(ctrlKey);
  await page.keyboard.press('Backspace', { delay: 30 });
}
