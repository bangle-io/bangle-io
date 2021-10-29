const {
  url,
  createNewNote,
  clickPaletteRow,
  uuid,
  runAction,
  createWorkspace,
  longSleep,
  getWsPathsShownInFilePalette,
  SELECTOR_TIMEOUT,
  newPage,
} = require('../helpers');

const { resolvePath } = require('@bangle.io/ws-path');

jest.setTimeout(105 * 1000);
let page, destroyPage;

jest.retryTimes(2);

beforeEach(async () => {
  ({ page, destroyPage } = await newPage(browser));

  await page.goto(url, { waitUntil: 'networkidle2' });
  await page.evaluate(() => localStorage.clear());
  await page.goto(url, { waitUntil: 'networkidle2' });
});

afterEach(async () => {
  await destroyPage();
});

describe('clone workspace action', () => {
  test('works', async () => {
    const wsName1 = await createWorkspace(page);
    const n1 = await createNewNote(page, wsName1, 'file-1');
    const n2 = await createNewNote(page, wsName1, 'file-2');

    expect((await getWsPathsShownInFilePalette(page)).sort()).toEqual(
      [n2, n1].sort(),
    );

    await runAction(
      page,
      'action::bangle-io-core-actions:CLONE_WORKSPACE_ACTION',
    );
    const handle = await page.waitForSelector('.universal-palette-container', {
      timeout: SELECTOR_TIMEOUT,
    });

    await clickPaletteRow(page, 'browser');
    const input = await handle.$('input');
    const wsName2 = 'test' + uuid(4);
    await input.type(wsName2, { delay: 10 });

    await Promise.all([
      page.waitForNavigation({
        timeout: 5000,
        waitUntil: 'networkidle0',
      }), // The promise resolves after navigation has finished
      clickPaletteRow(page, 'input-confirm'),
    ]);

    expect(await page.url()).toMatch(url + '/ws/' + wsName2);
    await longSleep(200);
    expect(
      (await getWsPathsShownInFilePalette(page))
        .map((r) => resolvePath(r).filePath)
        .sort(),
    ).toEqual([n1, n2].map((r) => resolvePath(r).filePath).sort());
  });
});
