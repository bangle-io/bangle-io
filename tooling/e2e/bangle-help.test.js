const { sleep, url } = require('./helpers');

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

test('Landing page is correct', async () => {
  await sleep(500);
  const handle = await page.$('.main-content');
  const result = await handle.evaluate((node) => node.innerText);
  expect(result.includes('bangle.io')).toBe(true);
  expect(result).toMatchSnapshot();
});
