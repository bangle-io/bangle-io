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

test.describe.parallel('workspaces', () => {
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

  test('persists workspaces after reload', async ({ page }) => {
    const wsName1 = await createWorkspace(page);
    const wsName2 = await createWorkspace(page);
    const wsName3 = await createWorkspace(page);

    await sleep();
    await page.reload({ timeout: 8000, waitUntil: 'networkidle' });

    await openWorkspacePalette(page);

    const result = (await getItemsInPalette(page, { hasItems: true })).sort();

    expect(result).toEqual(
      [
        `bangle-help-(helpfs)`,
        wsName3 + '-(browser)',
        wsName2 + '-(browser)',
        wsName1 + '-(browser)',
      ].sort(),
    );
  });

  test('deleting workspace works', async ({ page }) => {
    const wsName1 = await createWorkspace(page);
    const wsName2 = await createWorkspace(page);

    await sleep();

    page.on('dialog', (dialog) => dialog.accept());

    await Promise.all([
      page.waitForNavigation(),
      runOperation(
        page,
        'operation::@bangle.io/core-operations:REMOVE_ACTIVE_WORKSPACE',
      ),
    ]);

    expect(await page.url()).toMatch(new RegExp('help'));

    await openWorkspacePalette(page);

    const result = (await getItemsInPalette(page, { hasItems: true })).sort();

    expect(result).toEqual(
      [`bangle-help-(helpfs)`, wsName1 + '-(browser)'].sort(),
    );
  });
});
