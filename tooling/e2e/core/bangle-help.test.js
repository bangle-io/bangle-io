const { SELECTOR_TIMEOUT, sleep, url, longSleep } = require('../helpers');

let page;
beforeEach(async () => {
  page = await browser.newPage();
  // await jestPuppeteer.resetPage();
  await page.goto(url, { waitUntil: 'networkidle2' });

  await page.evaluate(() => localStorage.clear());
});

afterEach(async () => {
  await page.close();
});

// for some reason first test suit fails
// so this exists as a hack
test('init', async () => {
  expect(4).toBe(4);
  await longSleep(1000);
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
