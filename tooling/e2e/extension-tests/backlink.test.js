const {
  url,
  createNewNote,
  clearPrimaryEditor,
  createWorkspace,
  getPrimaryEditorHandler,
  waitForPrimaryEditorTextToContain,
  newPage,
  SELECTOR_TIMEOUT,
  runAction,
} = require('../helpers');

jest.setTimeout(155 * 1000);
jest.retryTimes(2);
let page, destroyPage;

beforeEach(async () => {
  ({ page, destroyPage } = await newPage(browser));

  await page.goto(url, { waitUntil: 'networkidle2' });
  await page.evaluate(() => localStorage.clear());
  await page.goto(url, { waitUntil: 'networkidle2' });
});

afterEach(async () => {
  await destroyPage();
});

let wsName;
describe('backlink workflow', () => {
  beforeEach(async () => {
    wsName = await createWorkspace(page);

    await createNewNote(page, wsName, 'note-0');

    await getPrimaryEditorHandler(page, { focus: true });
    await clearPrimaryEditor(page);

    // create note-1
    await page.keyboard.type('this is the zeroth note ');

    await page.keyboard.type('[[note-1]]', { delay: 30 });

    await waitForPrimaryEditorTextToContain(page, 'note-1');

    await clickBacklinkHandle(page, 'note-1');

    await waitForPrimaryEditorTextToContain(page, 'note-1');

    // now in note-1
    // lets create backlink to note-0
    await clearPrimaryEditor(page);
    await page.keyboard.type('[[0', { delay: 30 });
    await page.keyboard.press('Enter', { delay: 30 });

    await page.waitForSelector('.inline-backlink_backlink', {
      timeout: 4 * SELECTOR_TIMEOUT,
    });
  });

  test('Creating', async () => {
    // make sure the backlink created is for note-0
    expect(
      await page.$eval('.inline-backlink_backlink', (n) => n.innerText),
    ).toEqual('note-0');
  });

  test('Hovering and clicking works', async () => {
    // make sure we are on note-1's page
    expect(await page.url()).toContain('note-1');
    // // Hover to see if it is correctly shown
    await page.hover('.inline-backlink_backlink');

    await page.waitForSelector('.editor_editor-display-popup', {
      timeout: SELECTOR_TIMEOUT,
    });

    expect(
      await page.$eval('.editor_editor-display-popup', (el) => el.innerText),
    ).toContain('this is the zeroth note note-1');

    // // This block exists because I was unable to click using regular way
    const popupPara = await page.$(
      '.editor_editor-display-popup .bangle-editor p',
    );
    const coOrdinates = await popupPara.boundingBox();
    await page.mouse.click(coOrdinates.x, coOrdinates.y);
    await page.keyboard.press('ArrowLeft'); // just move arrow to extreme left
    await page.keyboard.press('ArrowLeft');
    // Type in the popup
    await page.keyboard.type('AWESOME ', { delay: 5 });

    await clickBacklinkHandle(page, 'note-0');
    await waitForPrimaryEditorTextToContain(
      page,
      'AWESOME this is the zeroth note',
    );
    expect(await page.url()).toContain('note-0');
  });

  test('note widget shows backlinks', async () => {
    // make sure we are on note-1's page
    expect(await page.url()).toContain('note-1');
    await runAction(
      page,
      'action::bangle-io-core-actions:NOTE_TOGGLE_SIDEBAR_ACTION',
    );

    await page.waitForSelector(`.inline-backlink_widget-container`, {
      timeout: SELECTOR_TIMEOUT,
    });

    await page.waitForFunction(
      () =>
        document
          .querySelector('.inline-backlink_widget-container')
          ?.innerText.trim()
          .includes('note-0'),
      {
        timeout: 4 * SELECTOR_TIMEOUT,
      },
    );

    expect(
      await page.$eval(
        '.inline-backlink_widget-container',
        (el) => el.innerText,
      ),
    ).toContain('note-0');

    await Promise.all([
      page.waitForNavigation({
        timeout: 5000,
        waitUntil: 'networkidle0',
      }),
      page.click(
        `.inline-backlink_widget-container [data-id="${wsName}:note-0.md"]`,
      ),
    ]);

    expect(await page.url()).toContain('note-0');
  });
});

async function clickBacklinkHandle(page, text) {
  const editorHandle = await getPrimaryEditorHandler(page);
  await Promise.all([
    page.waitForNavigation({
      timeout: 5000,
      waitUntil: 'networkidle0',
    }),
    editorHandle.$$eval(
      '.inline-backlink_backlink',
      (nodes, text) => [...nodes].find((n) => n.innerText === text).click(),
      text,
    ),
  ]);
}
