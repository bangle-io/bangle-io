const {
  longSleep,
  url,
  createNewNote,
  createWorkspace,
  getWsPathsShownInFilePalette,
  getPrimaryEditorHandler,
  newPage,
} = require('../helpers');

jest.setTimeout(105 * 1000);

let page, destroyPage;

beforeEach(async () => {
  ({ page, destroyPage } = await newPage(browser));
  await page.goto(url, { waitUntil: 'networkidle2' });
  await page.evaluate(() => localStorage.clear());
});

afterEach(async () => {
  await destroyPage();
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
  const wsName1 = await createWorkspace(page);

  const wsPathsOfWsName2 = await getWsPathsShownInFilePalette(page);
  // new workspace should start empty
  expect(wsPathsOfWsName2).toEqual([]);

  const n1 = await createNewNote(page, wsName1, 'file-1');
  expect(await getWsPathsShownInFilePalette(page)).toEqual([n1]);
});

test('Opening an unknown workspace', async () => {
  await Promise.all([
    page.waitForNavigation({
      timeout: 5000,
      waitUntil: 'networkidle0',
    }),
    page.goto(url + '/ws/random-wrong-wsname', {
      waitUntil: 'networkidle2',
    }),
  ]);

  expect(await page.url()).toBe(
    `http://localhost:1234/ws-not-found/random-wrong-wsname`,
  );

  expect(await page.$eval('body', (el) => el.innerText)).toContain(
    `Workspace random-wrong-wsname not found`,
  );
});

test('Opening an invalid file name', async () => {
  const wsName1 = await createWorkspace(page);

  await Promise.all([
    page.waitForNavigation({
      timeout: 5000,
      waitUntil: 'networkidle0',
    }),
    page.goto(url + `/ws/${wsName1}/wrong-ws-path`, {
      waitUntil: 'networkidle2',
    }),
  ]);

  expect(await page.url()).toBe(
    `http://localhost:1234/ws-invalid-path/${wsName1}`,
  );

  expect(await page.$eval('body', (el) => el.innerText)).toContain(
    `🙈 Invalid path`,
  );
});
