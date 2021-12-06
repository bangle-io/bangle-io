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
  clearPrimaryEditor,
} = require('../helpers');

jest.retryTimes(1);

let page, destroyPage, wsName;
let noteName = 'my-mark-test-123';

beforeEach(async () => {
  ({ page, destroyPage } = await newPage(browser));
  await setPageWidescreen(page);
  await page.goto(url, { waitUntil: 'networkidle2' });

  await page.evaluate(() => localStorage.clear());
  wsName = await createWorkspace(page);
  await createNewNote(page, wsName, noteName);
  await clearPrimaryEditor(page);
});

afterEach(async () => {
  await destroyPage();
});

describe('Italics markdown shortcut', () => {
  test('typing _ triggers italics', async () => {
    await page.keyboard.type('Hello _world_!', { delay: 10 });
    expect(await getPrimaryEditorDebugString(page)).toBe(
      `doc(paragraph("Hello ", italic("world"), "!"))`,
    );
  });

  test('typing _ inside word does not trigger italics', async () => {
    await page.keyboard.type('Hello w_orld_!', { delay: 10 });
    expect(await getPrimaryEditorDebugString(page)).toBe(
      `doc(paragraph("Hello w_orld_!"))`,
    );
  });

  test('typing * triggers italics', async () => {
    await page.keyboard.type('Hello *world*!', { delay: 10 });
    expect(await getPrimaryEditorDebugString(page)).toBe(
      `doc(paragraph("Hello ", italic("world"), "!"))`,
    );
  });

  test('typing * inside word does not trigger italics', async () => {
    await page.keyboard.type('Hello w*orld*!', { delay: 10 });
    expect(await getPrimaryEditorDebugString(page)).toBe(
      `doc(paragraph("Hello w*orld*!"))`,
    );
  });
});
describe('link', () => {
  test('typing a link should convert to a link mark', async () => {
    await page.keyboard.type('Hello google.com ', { delay: 10 });
    expect(await getPrimaryEditorDebugString(page)).toBe(
      `doc(paragraph("Hello ", link("google.com"), " "))`,
    );
  });

  test('typing a link inside backlink should not convert to a link mark', async () => {
    await page.keyboard.type('Hello [[', { delay: 15 });
    // triggering [[ is slow
    await sleep();
    await page.keyboard.type('google.com ', { delay: 15 });
    expect(await getPrimaryEditorDebugString(page)).toBe(
      `doc(paragraph("Hello ", bangle-io-inline-backlink-paletteMark("[[google.com ")))`,
    );
  });
});
