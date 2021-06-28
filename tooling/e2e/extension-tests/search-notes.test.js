const {
  url,
  createNewNote,
  createWorkspace,
  sleep,
  longSleep,
  getPrimaryEditorHandler,
  SELECTOR_TIMEOUT,
  newPage,
} = require('../helpers');
jest.setTimeout(155 * 1000);

let page, destroyPage;

beforeEach(async () => {
  ({ page, destroyPage } = await newPage(browser, { widescreen: true }));

  await page.goto(url, { waitUntil: 'networkidle2' });
  await page.evaluate(() => localStorage.clear());
  await page.goto(url, { waitUntil: 'networkidle2' });
});

afterEach(async () => {
  await destroyPage();
});

test('Is able to search for a note', async () => {
  const wsName = await createWorkspace(page);
  await createNewNote(page, wsName, 'test-one');

  let primaryHandle = await getPrimaryEditorHandler(page, { focus: true });

  await page.keyboard.press('Enter');
  await page.keyboard.type('i am a lovely planet from outer galaxy');

  await createNewNote(page, wsName, 'test-two');

  await getPrimaryEditorHandler(page, { focus: true });

  await page.keyboard.press('Enter');
  await page.keyboard.type(
    'here galaxies are a collection of stars held together by gravity',
  );

  await sleep();

  const searchButton = await page.waitForSelector(
    'button[aria-label="Search notes"]',
    {
      timeout: SELECTOR_TIMEOUT,
    },
  );

  expect(Boolean(searchButton)).toBe(true);
  await searchButton.click();

  const searchInput = await page.waitForSelector('input[aria-label="Search"]', {
    timeout: SELECTOR_TIMEOUT,
  });

  await searchInput.type('galaxy');

  await page.waitForSelector('.search-notes .search-result-note-match', {
    timeout: SELECTOR_TIMEOUT,
  });

  let noteMatches = await page.$$eval(
    'div[data-id^="search-notes-result-"]',
    (nodes) => nodes.map((n) => n.innerText),
  );
  expect(noteMatches.length).toBe(1);
  expect(noteMatches[0].includes('test-one.md')).toBe(true);

  const clearButton = await page.waitForSelector(
    'button[aria-label="Clear search"]',
    {
      timeout: SELECTOR_TIMEOUT,
    },
  );

  await clearButton.click();

  expect(await searchInput.evaluate((node) => node.value)).toBe('');

  await searchInput.type('galax');
  expect(await searchInput.evaluate((node) => node.value)).toBe('galax');

  // the input debounce slows us down
  await longSleep(300);

  await page.waitForSelector('.search-notes .search-result-note-match', {
    timeout: SELECTOR_TIMEOUT,
  });

  noteMatches = await page.$$eval(
    'div[data-id^="search-notes-result-"]',
    (nodes) => nodes.map((n) => n.innerText),
  );
  expect(noteMatches.length).toBe(2);
  expect(noteMatches).toMatchInlineSnapshot(`
Array [
  "test-one.md
1",
  "test-two.md
1",
]
`);
});
