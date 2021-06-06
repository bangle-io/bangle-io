const {
  url,
  createNewNote,
  clearEditor,
  getEditorHTML,
  createWorkspace,
  setPageWidescreen,
  getPrimaryEditorDebugString,
  getSecondaryEditorDebugString,
  sleep,
  longSleep,
  getPrimaryEditorHandler,
} = require('./helpers');
const { ctrlKey } = require('./helpers');

jest.setTimeout(105 * 1000);

beforeEach(async () => {
  await jestPuppeteer.resetPage();
  await setPageWidescreen(page);
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

test('Split screen and typing in secondary works', async () => {
  const wsName = await createWorkspace();
  await createNewNote(wsName, 'test-123');

  await page.keyboard.down(ctrlKey);
  await page.keyboard.press('\\');
  await page.keyboard.up(ctrlKey);

  await longSleep();

  let primaryText = await getPrimaryEditorDebugString(page);
  let secondaryText = await getSecondaryEditorDebugString(page);

  expect(primaryText).toMatchSnapshot();
  expect(secondaryText).toBe(primaryText);
  await page.keyboard.press('Enter');
  await page.keyboard.type('manthanoy', { delay: 10 });
  await longSleep();

  secondaryText = await getSecondaryEditorDebugString(page);
  expect(secondaryText).toMatch(/manthanoy/);
  primaryText = await getPrimaryEditorDebugString(page);
  expect(primaryText).toBe(secondaryText);
});

test('Split screen and typing in primary works', async () => {
  const wsName = await createWorkspace();
  await createNewNote(wsName, 'test-123');

  await page.keyboard.down(ctrlKey);
  await page.keyboard.press('\\');
  await page.keyboard.up(ctrlKey);

  const primaryHandle = await getPrimaryEditorHandler(page);
  await longSleep();

  await primaryHandle.press('Enter');
  await primaryHandle.type('manthanoy', { delay: 10 });

  await longSleep();

  let primaryText = await getPrimaryEditorDebugString(page);
  expect(primaryText).toMatch(/manthanoy/);

  let secondaryText = await getSecondaryEditorDebugString(page);
  expect(secondaryText).toMatch(/manthanoy/);
  primaryText = await getPrimaryEditorDebugString(page);
  expect(primaryText).toBe(secondaryText);
});
