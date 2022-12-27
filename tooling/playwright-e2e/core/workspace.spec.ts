import { expect } from '@playwright/test';

import {
  PRIMARY_EDITOR_INDEX,
  SECONDARY_EDITOR_INDEX,
} from '@bangle.io/constants';

import { resolvePath } from '../bangle-helpers';
import { withBangle as test } from '../fixture-with-bangle';
import {
  createNewNote,
  createWorkspace,
  getAllWsPaths,
  getEditorLocator,
  getWsPathsShownInFilePalette,
  longSleep,
  pushWsPathToSecondary,
  runOperation,
  waitForEditorFocus,
  waitForNotification,
} from '../helpers';

test.beforeEach(async ({ bangleApp }, testInfo) => {
  await bangleApp.open();
});

test.describe('workspace', () => {
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
      'operation::@bangle.io/core-extension:RENAME_ACTIVE_NOTE',
    );

    await expect(
      page.locator(
        '.B-ui-components_universal-palette-container input[aria-label]',
      ),
    ).toHaveValue(resolvePath(n1).filePath);

    await page.fill(
      '.B-ui-components_universal-palette-container input[aria-label]',
      'file-1-renamed',
    );

    await Promise.all([page.waitForNavigation(), page.keyboard.press('Enter')]);

    await expect(page).toHaveURL(new RegExp('file-1-renamed'));
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

    await expect(page).toHaveURL(`${baseURL}/ws-not-found/random-wrong-wsname`);

    expect(await page.$eval('body', (el) => el.innerText)).toContain(
      `not found`,
    );

    expect(await page.screenshot()).toMatchSnapshot({
      maxDiffPixels: 20,
    });
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

    await expect(page).toHaveURL(`${baseURL}/ws-invalid-path/${wsName1}`);

    await expect(page.locator('body')).toContainText(`🙈 Invalid path`);

    expect(await page.screenshot()).toMatchSnapshot({
      maxDiffPixels: 20,
    });
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

    await expect(page).toHaveURL(`${baseURL}/ws-invalid-path/${wsName1}`);

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

    await expect(page2).toHaveURL(`${baseURL}/landing`);

    await expect(page2.locator(`text=${wsName1} (last opened)`)).toBeVisible();
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
        'operation::@bangle.io/core-extension:DELETE_ACTIVE_NOTE',
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

    await waitForEditorFocus(page, SECONDARY_EDITOR_INDEX, { wsPath: n1 });

    page.on('dialog', (dialog) => dialog.accept());

    await Promise.all([
      page.waitForNavigation(),
      runOperation(
        page,
        'operation::@bangle.io/core-extension:DELETE_ACTIVE_NOTE',
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
    await getEditorLocator(page, PRIMARY_EDITOR_INDEX, {
      focus: true,
      wsPath: n2,
    });

    page.on('dialog', (dialog) => dialog.accept());

    await Promise.all([
      page.waitForNavigation(),
      runOperation(
        page,
        'operation::@bangle.io/core-extension:DELETE_ACTIVE_NOTE',
      ),
    ]);
    await expect(page).toHaveURL(
      new RegExp('/ws/' + wsName1 + '/' + resolvePath(n1).filePath),
    );
    await longSleep(100);
    expect(await getAllWsPaths(page)).toEqual([n1]);
  });
});

test.describe('in invalid path', () => {
  test('creating new note', async ({ page, baseURL }) => {
    const wsName1 = await createWorkspace(page);

    await Promise.all([
      page.waitForNavigation({
        timeout: 5000,
        waitUntil: 'load',
      }),
      page.goto(baseURL + `/ws/${wsName1}/wrong-ws-path`, {
        waitUntil: 'load',
      }),
    ]);

    await expect(page).toHaveURL(new RegExp('/ws-invalid-path/' + wsName1));

    await runOperation(page, 'operation::@bangle.io/core-extension:NEW_NOTE');

    await waitForNotification(page, 'Please first select a workspace');
  });
});
