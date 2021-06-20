const {
  longSleep,
  url,
  createNewNote,
  createWorkspace,
  getWsPathsShownInFilePalette,
  getPrimaryEditorHandler,
  sleep,
} = require('../helpers');
jest.setTimeout(105 * 1000);

beforeEach(async () => {
  await jestPuppeteer.resetPage();
  await page.goto(url, { waitUntil: 'networkidle2' });
  await page.evaluate(() => localStorage.clear());
});

test('Create a new workspace when already in a workspace', async () => {
  const wsName1 = await createWorkspace(page);
  const n1 = await createNewNote(page, wsName1, 'file-1');
  const n2 = await createNewNote(page, wsName1, 'file-2');

  const wsPathsOfWsName1 = await getWsPathsShownInFilePalette(page);
  expect(wsPathsOfWsName1).toEqual([n2, n1]);

  const wsName2 = await createWorkspace(page);

  const wsPathsOfWsName2 = await getWsPathsShownInFilePalette(page);
  expect(wsPathsOfWsName2).toEqual([]);

  const nA = await createNewNote(page, wsName2, 'file-a');
  expect(await getWsPathsShownInFilePalette(page)).toEqual([nA]);
});

test('Create a new workspace when already in a workspace and go back', async () => {
  const wsName1 = await createWorkspace(page);
  const n1 = await createNewNote(page, wsName1, 'file-1');
  const n2 = await createNewNote(page, wsName1, 'file-2');

  const wsPathsOfWsName1 = await getWsPathsShownInFilePalette(page);
  expect(wsPathsOfWsName1).toEqual([n2, n1]);

  const wsName2 = await createWorkspace(page);

  const wsPathsOfWsName2 = await getWsPathsShownInFilePalette(page);
  expect(wsPathsOfWsName2).toEqual([]);
  await page.goBack({ waitUntil: 'networkidle2' });

  expect(await page.url()).toMatch(url + '/ws/' + wsName1);
  await getPrimaryEditorHandler(page);

  expect((await getWsPathsShownInFilePalette(page)).sort()).toEqual(
    [n2, n1].sort(),
  );
});

test('Create a new workspace from home page', async () => {
  await longSleep();
  const wsName1 = await createWorkspace(page);

  const wsPathsOfWsName2 = await getWsPathsShownInFilePalette(page);
  // new workspace should start empty
  expect(wsPathsOfWsName2).toEqual([]);

  const n1 = await createNewNote(page, wsName1, 'file-1');
  expect(await getWsPathsShownInFilePalette(page)).toEqual([n1]);
});
