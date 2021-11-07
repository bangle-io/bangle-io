const {
  sleep,
  ctrlKey,
  url,
  createNewNote,
  clearPrimaryEditor,
  setPageWidescreen,
  getEditorHTML,
  createWorkspace,
  newPage,
  getPrimaryEditorDebugString,
  getPrimaryEditorHandler,
} = require('../helpers');

jest.setTimeout(105 * 1000);

let page, destroyPage;
describe('widescreen', () => {
  beforeEach(async () => {
    ({ page, destroyPage } = await newPage(browser));
    await setPageWidescreen(page);

    await page.goto(url, { waitUntil: 'networkidle2' });

    await page.evaluate(() => localStorage.clear());
  });
  afterEach(async () => {
    await destroyPage();
  });

  test('split screen shortcut works', async () => {
    const wsName = await createWorkspace(page);
    await createNewNote(page, wsName, 'test123');

    await getPrimaryEditorHandler(page);

    await page.keyboard.down(ctrlKey);
    await page.keyboard.press('\\');
    await page.keyboard.up(ctrlKey);
    await sleep();
    // eslint-disable-next-line jest/no-conditional-expect
    expect(await page.$('.editor-container_editor-1')).not.toBeNull();
  });
});
