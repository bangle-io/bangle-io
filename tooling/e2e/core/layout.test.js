const {
  sleep,
  ctrlKey,
  url,
  createNewNote,
  setPageWidescreen,
  createWorkspace,
  newPage,
  getPrimaryEditorHandler,
  getSecondaryEditorHandler,
  waitForPrimaryEditorFocus,
  runAction,
  SELECTOR_TIMEOUT,
} = require('../helpers');

jest.setTimeout(105 * 1000);
jest.retryTimes(2);

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

    await getSecondaryEditorHandler(page);
    expect(await page.$('.editor-container_editor-1')).not.toBeNull();
  });

  test('shows note sidebar correctly', async () => {
    const wsName = await createWorkspace(page);

    await createNewNote(page, wsName, 'test123');
    await waitForPrimaryEditorFocus(page);

    await runAction(
      page,
      'action::bangle-io-core-actions:NOTE_TOGGLE_SIDEBAR_ACTION',
    );

    await page.waitForSelector('.ui-dhancha_note-sidebar', {
      timeout: 4 * SELECTOR_TIMEOUT,
    });

    expect(await page.$('.ui-dhancha_note-sidebar')).not.toBeNull();
  });
});
