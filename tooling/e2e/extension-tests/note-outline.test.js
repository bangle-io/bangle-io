const {
  url,
  createNewNote,
  clearPrimaryEditor,
  createWorkspace,
  newPage,
  SELECTOR_TIMEOUT,
  waitForPrimaryEditorFocus,
  runAction,
  setPageWidescreen,
} = require('../helpers');

jest.setTimeout(155 * 1000);
let page, destroyPage;

beforeEach(async () => {
  ({ page, destroyPage } = await newPage(browser));
  await setPageWidescreen(page);

  await page.goto(url, { waitUntil: 'networkidle2' });
  await page.evaluate(() => localStorage.clear());
  await page.goto(url, { waitUntil: 'networkidle2' });
});

afterEach(async () => {
  await destroyPage();
});

test('shows note sidebar correctly', async () => {
  const wsName = await createWorkspace(page);

  await createNewNote(page, wsName, 'test123');
  await waitForPrimaryEditorFocus(page);

  await clearPrimaryEditor(page);
  await page.keyboard.type('## top heading');
  await page.keyboard.press('Enter');
  await page.keyboard.type('### child heading');
  await page.keyboard.press('Enter');

  await runAction(
    page,
    'action::bangle-io-core-actions:NOTE_TOGGLE_SIDEBAR_ACTION',
  );

  await page.waitForFunction(
    () =>
      document
        .querySelector('.note-outline_container button')
        ?.innerText?.includes('top heading'),
    {
      timeout: 4 * SELECTOR_TIMEOUT,
    },
  );

  const result = await page.$$eval(
    '.note-outline_container button',
    (nodes) => {
      return [...nodes].map((r) => r.innerText);
    },
  );

  expect(result).toMatchInlineSnapshot(`
    Array [
      "top heading",
      "child heading",
    ]
  `);
});
