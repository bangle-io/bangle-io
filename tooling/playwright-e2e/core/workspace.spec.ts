import { expect, test } from '@playwright/test';

import { resolvePath } from '../bangle-helpers';
import {
  clickItemInPalette,
  createNewNote,
  createWorkspace,
  getAllWsPaths,
  getEditorLocator,
  getItemsInPalette,
  getPrimaryEditorHandler,
  getWsPathsShownInFilePalette,
  longSleep,
  openWorkspacePalette,
  pushWsPathToSecondary,
  runOperation,
  sleep,
  waitForEditorFocus,
} from '../helpers';

test.beforeEach(async ({ page, baseURL }, testInfo) => {
  await page.goto(baseURL!, { waitUntil: 'networkidle' });
});

test.describe.parallel('workspace', () => {
  test('Create a new workspace when already in a workspace', async ({
    page,
  }) => {
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

  test('Rename note', async ({ page, baseURL }) => {
    const wsName1 = await createWorkspace(page);
    const n1 = await createNewNote(page, wsName1, 'file-1');

    await runOperation(
      page,
      'operation::@bangle.io/core-operations:RENAME_ACTIVE_NOTE',
    );

    await expect(
      page.locator('.universal-palette-container input[aria-label]'),
    ).toHaveValue(resolvePath(n1).filePath);

    await page.fill(
      '.universal-palette-container input[aria-label]',
      'file-1-renamed',
    );

    await Promise.all([page.waitForNavigation(), page.keyboard.press('Enter')]);

    await expect(page).toHaveURL(new RegExp('file-1-renamed'));
  });

  test('Create a new workspace when already in a workspace and go back', async ({
    page,
    baseURL,
  }) => {
    const wsName1 = await createWorkspace(page);
    const n1 = await createNewNote(page, wsName1, 'file-1');
    const n2 = await createNewNote(page, wsName1, 'file-2');

    const wsPathsOfWsName1 = await getWsPathsShownInFilePalette(page);
    expect(wsPathsOfWsName1).toEqual([n2, n1]);

    const wsName2 = await createWorkspace(page);

    const wsPathsOfWsName2 = await getWsPathsShownInFilePalette(page);
    expect(wsPathsOfWsName2).toEqual([]);
    await page.goBack({ waitUntil: 'networkidle' });

    expect(await page.url()).toMatch(baseURL + '/ws/' + wsName1);
    await getPrimaryEditorHandler(page);

    expect((await getWsPathsShownInFilePalette(page)).sort()).toEqual(
      [n2, n1].sort(),
    );
  });

  test('switching a workspace using the palette', async ({ page, baseURL }) => {
    test.slow();
    const wsName1 = await createWorkspace(page);
    const n1 = await createNewNote(page, wsName1, 'file-1');

    const wsName2 = await createWorkspace(page);

    expect(await page.url()).toMatch(new RegExp(wsName2));

    await sleep();

    await openWorkspacePalette(page);

    const result = (await getItemsInPalette(page, { hasItems: true })).sort();

    expect(result).toEqual(
      [
        `bangle-help-(helpfs)`,
        wsName2 + '-(browser)',
        wsName1 + '-(browser)',
      ].sort(),
    );

    await Promise.all([
      page.waitForNavigation(),
      clickItemInPalette(page, wsName2 + '-(browser)'),
    ]);

    expect(await page.url()).toMatch(new RegExp(wsName2));
  });

  test('Create a new workspace from home page', async ({ page }) => {
    const wsName1 = await createWorkspace(page);

    const wsPathsOfWsName2 = await getWsPathsShownInFilePalette(page);
    // new workspace should start empty
    expect(wsPathsOfWsName2).toEqual([]);

    const n1 = await createNewNote(page, wsName1, 'file-1');
    expect(await getWsPathsShownInFilePalette(page)).toEqual([n1]);
  });

  test('Opening an unknown workspace', async ({ page, baseURL }) => {
    await Promise.all([
      page.waitForNavigation({
        timeout: 5000,
        waitUntil: 'networkidle',
      }),
      page.goto(baseURL + '/ws/random-wrong-wsname', {
        waitUntil: 'networkidle',
      }),
    ]);

    expect(await page.url()).toBe(
      `${baseURL}/ws-not-found/random-wrong-wsname`,
    );

    expect(await page.$eval('body', (el) => el.innerText)).toContain(
      `not found`,
    );
  });

  test('Opening an invalid file name', async ({ page, baseURL }) => {
    const wsName1 = await createWorkspace(page);

    await Promise.all([
      page.waitForNavigation({
        timeout: 5000,
        waitUntil: 'networkidle',
      }),
      page.goto(baseURL + `/ws/${wsName1}/wrong-ws-path`, {
        waitUntil: 'networkidle',
      }),
    ]);

    expect(await page.url()).toBe(`${baseURL}/ws-invalid-path/${wsName1}`);

    expect(await page.$eval('body', (el) => el.innerText)).toContain(
      `🙈 Invalid path`,
    );
  });

  test('Opening an invalid file name in secondary', async ({
    page,
    baseURL,
  }) => {
    const wsName1 = await createWorkspace(page);

    await Promise.all([
      page.waitForNavigation(),
      page.goto(
        baseURL +
          `/ws/${wsName1}/wrong-ws-path?secondary=bangle-help%253Agetting%2520started`,
        {
          waitUntil: 'networkidle',
        },
      ),
    ]);

    expect(await page.url()).toBe(`${baseURL}/ws-invalid-path/${wsName1}`);

    expect(await page.$eval('body', (el) => el.innerText)).toContain(
      `🙈 Invalid path`,
    );
  });

  test('Opens the last known workspace', async ({ browser, baseURL }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(baseURL!, { waitUntil: 'networkidle' });

    const wsName1 = await createWorkspace(page);

    await longSleep(700);

    await page.close();

    const page2 = await context.newPage();

    await page2.goto(baseURL!, { waitUntil: 'networkidle' });

    await expect(page2).toHaveURL(new RegExp(wsName1));
  });

  test('deleting a note', async ({ page, baseURL }) => {
    const wsName1 = await createWorkspace(page);
    const n1 = await createNewNote(page, wsName1, 'file-1');

    await expect(page).toHaveURL(new RegExp(resolvePath(n1).fileName));

    await longSleep(100);
    expect(await getAllWsPaths(page)).toContain(n1);
    page.on('dialog', (dialog) => dialog.accept());

    await Promise.all([
      page.waitForNavigation(),
      runOperation(
        page,
        'operation::@bangle.io/core-operations:DELETE_ACTIVE_NOTE',
      ),
    ]);

    await expect(page).toHaveURL(new RegExp('/ws/' + wsName1));
    await longSleep(100);
    expect(await getAllWsPaths(page)).toEqual([]);
  });

  test('deleting secondary note in split screen', async ({ page, baseURL }) => {
    // n2 as primary
    // n1 as secondary
    const wsName1 = await createWorkspace(page);

    const n1 = await createNewNote(page, wsName1, 'file-1');
    const n2 = await createNewNote(page, wsName1, 'file-2');

    await expect(page).toHaveURL(new RegExp(resolvePath(n2).fileName));

    await pushWsPathToSecondary(page, n1);

    await waitForEditorFocus(page, 1, { wsPath: n1 });

    page.on('dialog', (dialog) => dialog.accept());

    await Promise.all([
      page.waitForNavigation(),
      runOperation(
        page,
        'operation::@bangle.io/core-operations:DELETE_ACTIVE_NOTE',
      ),
    ]);

    await expect(page).toHaveURL(
      new RegExp('/ws/' + wsName1 + '/' + resolvePath(n2).filePath),
    );
    await longSleep(100);
    expect(await getAllWsPaths(page)).toEqual([n2]);
  });

  test('deleting primary note in split screen', async ({ page, baseURL }) => {
    // n2 as primary
    // n1 as secondary
    const wsName1 = await createWorkspace(page);

    const n1 = await createNewNote(page, wsName1, 'file-1');
    const n2 = await createNewNote(page, wsName1, 'file-2');

    await expect(page).toHaveURL(new RegExp(resolvePath(n2).fileName));

    await pushWsPathToSecondary(page, n1);
    await getEditorLocator(page, 0, { focus: true, wsPath: n2 });

    page.on('dialog', (dialog) => dialog.accept());

    await Promise.all([
      page.waitForNavigation(),
      runOperation(
        page,
        'operation::@bangle.io/core-operations:DELETE_ACTIVE_NOTE',
      ),
    ]);
    await expect(page).toHaveURL(
      new RegExp('/ws/' + wsName1 + '/' + resolvePath(n1).filePath),
    );
    await longSleep(100);
    expect(await getAllWsPaths(page)).toEqual([n1]);
  });
});
