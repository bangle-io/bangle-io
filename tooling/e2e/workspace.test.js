const {
  sleep,
  longSleep,
  ctrlKey,
  frmtHTML,
  url,
  createNewNote,
  clearEditor,
  getEditorHTML,
  createWorkspace,
  getWsPathsShownInFilePalette,
  getPrimaryEditorHandler,
} = require('./helpers');
jest.setTimeout(105 * 1000);

beforeEach(async () => {
  await jestPuppeteer.resetPage();
  await page.goto(url);
  page.on('error', (err) => {
    console.log('error happen at the page');
    throw err;
  });
  page.on('pageerror', (pageerr) => {
    console.log('pageerror occurred');
    console.log(pageerr);
    throw pageerr;
  });
  await page.evaluate(() => localStorage.clear());
});

test('Create a new workspace when already in a workspace', async () => {
  const wsName1 = await createWorkspace();
  const n1 = await createNewNote(wsName1, 'file-1');
  const n2 = await createNewNote(wsName1, 'file-2');

  const wsPathsOfWsName1 = await getWsPathsShownInFilePalette(page);
  expect(wsPathsOfWsName1).toEqual([n2, n1]);

  const wsName2 = await createWorkspace();

  const wsPathsOfWsName2 = await getWsPathsShownInFilePalette(page);
  expect(wsPathsOfWsName2).toEqual([]);

  const nA = await createNewNote(wsName2, 'file-a');
  expect(await getWsPathsShownInFilePalette(page)).toEqual([nA]);
});

test('Create a new workspace when already in a workspace and go back', async () => {
  const wsName1 = await createWorkspace();
  const n1 = await createNewNote(wsName1, 'file-1');
  const n2 = await createNewNote(wsName1, 'file-2');

  const wsPathsOfWsName1 = await getWsPathsShownInFilePalette(page);
  expect(wsPathsOfWsName1).toEqual([n2, n1]);

  const wsName2 = await createWorkspace();

  const wsPathsOfWsName2 = await getWsPathsShownInFilePalette(page);
  expect(wsPathsOfWsName2).toEqual([]);
  await page.goBack({ waitUntil: 'networkidle2' });

  expect(await page.url()).toMatch(url + '/ws/' + wsName1);
  await getPrimaryEditorHandler(page);

  expect(await getWsPathsShownInFilePalette(page)).toEqual([n2, n1]);
});

test('Create a new workspace from home page', async () => {
  await longSleep();
  const wsName1 = await createWorkspace();

  const wsPathsOfWsName2 = await getWsPathsShownInFilePalette(page);
  // new workspace should start empty
  expect(wsPathsOfWsName2).toEqual([]);

  const n1 = await createNewNote(wsName1, 'file-1');
  expect(await getWsPathsShownInFilePalette(page)).toEqual([n1]);
});
