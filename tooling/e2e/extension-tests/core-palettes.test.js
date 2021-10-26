const {
  url,
  SELECTOR_TIMEOUT,
  newPage,
  setPageWidescreen,
} = require('../helpers');

jest.setTimeout(105 * 1000);
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

describe('options bar is injected correctly', () => {
  test('clicking workspace palette button', async () => {
    const handle = await page.waitForSelector(
      'button[aria-label^="Workspace Palette"]',
      {
        timeout: SELECTOR_TIMEOUT,
      },
    );

    await handle.click();

    await page.waitForSelector('.universal-palette-input-wrapper', {
      timeout: SELECTOR_TIMEOUT,
    });
    expect(Boolean(await page.$('.universal-palette-item'))).toBe(true);
  });
});
