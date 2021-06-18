const { SELECTOR_TIMEOUT, sleep, url } = require('../helpers');

beforeEach(async () => {
  await jestPuppeteer.resetPage();
  await page.goto(url);
  page.on('error', (err) => {
    console.log('error happen at the page');
    throw err;
  });
  page.on('pageerror', (pageerr) => {
    console.log('pageerror occurred');
    throw pageerr;
  });
  await page.evaluate(() => localStorage.clear());
});

afterAll(async () => {
  // await page.close();
});

test('Landing page is correct', async () => {
  const handle = await page.waitForSelector('.bangle-editor', {
    timeout: SELECTOR_TIMEOUT,
  });
  await sleep(100);

  const result = await handle.evaluate((node) => node.innerText);
  expect(result.includes('bangle.io')).toBe(true);
  expect(result).toMatchSnapshot();
});
