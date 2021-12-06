const {
  url,
  createNewNote,
  createWorkspace,
  sleep,
  getPrimaryEditorHandler,
  SELECTOR_TIMEOUT,
  newPage,
} = require('../helpers');

jest.setTimeout(155 * 1000);

let page, destroyPage;

describe('Create #cosmic and #space tags', () => {
  beforeEach(async () => {
    ({ page, destroyPage } = await newPage(browser, { widescreen: true }));

    await page.goto(url, { waitUntil: 'networkidle2' });
    await page.evaluate(() => localStorage.clear());
    await page.goto(url, { waitUntil: 'networkidle2' });

    const wsName = await createWorkspace(page);
    await createNewNote(page, wsName, 'test-one');

    await page.keyboard.press('Enter');
    await page.keyboard.type(
      'i am a lovely planet from outer galaxy #cosmic #space .',
    );

    // creating new note because the data typed above might not have been flushed to disk
    // resulting in 0 search results
    await createNewNote(page, wsName, 'test-two');

    await getPrimaryEditorHandler(page, { focus: true });
  });

  afterEach(async () => {
    await destroyPage();
  });

  test('Is able to search note tags', async () => {
    const searchButton = await page.waitForSelector(
      'button[aria-label^="Search notes"]',
      {
        timeout: SELECTOR_TIMEOUT,
      },
    );

    await searchButton.click();

    const searchInput = await page.waitForSelector(
      'input[aria-label="Search"]',
      {
        timeout: SELECTOR_TIMEOUT,
      },
    );

    await searchInput.type('tag:cosmic');

    await page.waitForSelector('.search-notes .search-result-note-match', {
      timeout: SELECTOR_TIMEOUT,
    });

    let noteMatches = await page.$$eval(
      'div[data-id^="search-notes-result-"]',
      (nodes) => nodes.map((n) => n.innerText),
    );

    expect(noteMatches.length).toBe(1);
    expect(noteMatches).toMatchInlineSnapshot(`
        Array [
          "test-one
        1",
        ]
        `);
  });

  test('clicking on a note tag in editor searches for it', async () => {
    await page.keyboard.type(' #cosmic .');
    await sleep();

    const tag = await page.waitForSelector('.inline-note-tag', {
      timeout: SELECTOR_TIMEOUT,
    });

    await tag.click();

    await page.waitForSelector('.search-notes', {
      timeout: SELECTOR_TIMEOUT,
    });

    const searchInput = await page.waitForSelector(
      'input[aria-label="Search"]',
      {
        timeout: SELECTOR_TIMEOUT,
      },
    );

    expect(await searchInput.evaluate((node) => node.value)).toBe('tag:cosmic');

    await page.waitForSelector('div[data-id^="search-notes-result-"]', {
      timeout: SELECTOR_TIMEOUT,
    });

    const noteMatches = await page.$$eval(
      'div[data-id^="search-notes-result-"]',
      (nodes) => nodes.map((n) => n.innerText),
    );
    expect(noteMatches.length).toBe(2);
  });
});
