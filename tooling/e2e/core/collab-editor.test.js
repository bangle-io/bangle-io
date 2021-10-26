const {
  url,
  createNewNote,
  createWorkspace,
  setPageWidescreen,
  getPrimaryEditorDebugString,
  getSecondaryEditorDebugString,
  longSleep,
  getPrimaryEditorHandler,
  ctrlKey,
  sleep,
  newPage,
} = require('../helpers');

jest.retryTimes(2);
jest.setTimeout(105 * 1000);

let page, destroyPage;

beforeEach(async () => {
  ({ page, destroyPage } = await newPage(browser));
  await setPageWidescreen(page);
  await page.goto(url, { waitUntil: 'networkidle2' });

  await page.evaluate(() => localStorage.clear());
});

afterEach(async () => {
  await destroyPage();
});

test('Split screen and typing in secondary works', async () => {
  const wsName = await createWorkspace(page);
  await createNewNote(page, wsName, 'test123');

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
  const wsName = await createWorkspace(page);
  await createNewNote(page, wsName, 'test123');

  await page.keyboard.down(ctrlKey);
  await page.keyboard.press('\\');
  await page.keyboard.up(ctrlKey);

  const primaryHandle = await getPrimaryEditorHandler(page, { focus: true });
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
