const {
  url,
  createNewNote,
  clearPrimaryEditor,
  getEditorHTML,
  createWorkspace,
  sleep,
  longSleep,
  getPrimaryEditorHandler,
  getPrimaryEditorDebugString,
  waitForPrimaryEditorTextToContain,
  jestDebug,
  SELECTOR_TIMEOUT,
} = require('../helpers');

jest.setTimeout(155 * 1000);

beforeEach(async () => {
  await jestPuppeteer.resetPage();
  await page.goto(url, { waitUntil: 'networkidle2' });

  await page.evaluate(() => localStorage.clear());
});

test('Creating and clicking Backlinks works', async () => {
  const wsName = await createWorkspace(page);

  await createNewNote(page, wsName, 'note-0');

  await getPrimaryEditorHandler(page, { focus: true });
  await clearPrimaryEditor(page);

  // create note-1
  await page.keyboard.type('this is the zeroth note ');

  await page.keyboard.type('[[note-1]]', { delay: 10 });

  await waitForPrimaryEditorTextToContain(page, 'note-1');

  await clickBacklinkHandle(page, 'note-1');

  await waitForPrimaryEditorTextToContain(page, 'note-1');

  // now in note-1
  // lets create backlink to note-0
  await clearPrimaryEditor(page);
  await page.keyboard.type('[[0', { delay: 3 });
  await page.keyboard.press('Enter', { delay: 30 });

  await page.waitForSelector('.inline-backlink_backlink-node', {
    timeout: 2 * SELECTOR_TIMEOUT,
  });

  // make sure the backlink created is for note-0
  expect(
    await page.$eval('.inline-backlink_backlink-node', (n) => n.innerText),
  ).toEqual('note-0');

  // // Hover to see if it is correctly shown
  await page.hover('.inline-backlink_backlink-node');

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
  await page.keyboard.type('AWESOME ', { delay: 3 });

  await clickBacklinkHandle(page, 'note-0');
  // expect to see the modified zeroth page
  await waitForPrimaryEditorTextToContain(
    page,
    'AWESOME this is the zeroth note',
  );
});

async function clickBacklinkHandle(page, text) {
  const editorHandle = await getPrimaryEditorHandler(page);
  await Promise.all([
    page.waitForNavigation({
      timeout: 5000,
      waitUntil: 'networkidle0',
    }),
    editorHandle.$$eval(
      '.inline-backlink_backlink-node',
      (nodes, text) => [...nodes].find((n) => n.innerText === text).click(),
      text,
    ),
  ]);
}
