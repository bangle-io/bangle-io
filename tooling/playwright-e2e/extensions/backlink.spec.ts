import { expect, Page, test } from '@playwright/test';

import {
  clearEditor,
  createNewNote,
  createWorkspace,
  getEditorLocator,
  runOperation,
  SELECTOR_TIMEOUT,
  sleep,
  waitForEditorTextToContain,
  waitForWsPathToLoad,
} from '../helpers';

test.beforeEach(async ({ page, baseURL }, testInfo) => {
  await page.goto(baseURL!, { waitUntil: 'networkidle' });
});

test.describe('backlink workflow', () => {
  const setup = async (page: Page) => {
    let wsName = await createWorkspace(page);

    const wsPath = await createNewNote(page, wsName, 'note-0');

    await getEditorLocator(page, 0, {
      focus: true,
      wsPath,
    });

    await clearEditor(page, 0);

    // create note-1
    await page.keyboard.type('this is the zeroth note ', { delay: 35 });
    await page.keyboard.type('[[note-1]]', { delay: 55 });

    await sleep();

    await waitForEditorTextToContain(page, 0, 'note-1');

    await clickBacklinkHandle(page, 'note-1');

    await sleep();

    await waitForEditorTextToContain(page, 0, 'note-1');

    // now in note-1
    // lets create backlink to note-0
    await clearEditor(page, 0);
    await page.keyboard.type('[[0', { delay: 55 });

    await page.keyboard.press('Enter', { delay: 30 });

    await page.waitForSelector('.B-inline-backlink_backlink', {
      timeout: 4 * SELECTOR_TIMEOUT,
    });

    return { wsName, note0WsPath: wsPath };
  };

  test('Creating', async ({ page }) => {
    await setup(page);
    // make sure the backlink created is for note-0

    await expect(page.locator('.B-inline-backlink_backlink')).toHaveText(
      'note-0',
      { useInnerText: true },
    );
  });

  test('Hovering and clicking works', async ({ page }) => {
    test.slow();

    const { note0WsPath } = await setup(page);
    // make sure we are on note-1's page
    expect(await page.url()).toContain('note-1');

    await page.locator('.B-inline-backlink_backlink').waitFor();
    // // Hover to see if it is correctly shown
    await page.hover('.B-inline-backlink_backlink');

    await page.locator('.B-editor_display-popup').waitFor();

    await expect(page.locator('.B-editor_display-popup')).toHaveText(
      /this is the zeroth note note-1/,
      { useInnerText: true },
    );

    // // This block exists because I was unable to click using regular way
    const popupPara = await page.$('.B-editor_display-popup .bangle-editor p');
    const coordinates = await popupPara?.boundingBox();

    if (!coordinates) {
      throw new Error('Coordinates not set');
    }

    await page.mouse.click(coordinates.x, coordinates.y);
    await page.keyboard.press('ArrowLeft', { delay: 15 }); // just move arrow to extreme left
    await page.keyboard.press('ArrowLeft', { delay: 15 });
    // Type in the popup
    await page.keyboard.type('AWESOME ', { delay: 5 });

    await expect(page.locator('.B-editor_display-popup')).toHaveText(
      /AWESOME this is the zeroth note/,
      { useInnerText: true },
    );

    await clickBacklinkHandle(page, 'note-0');

    await sleep(200);
    await waitForWsPathToLoad(page, 0, { wsPath: note0WsPath });

    await waitForEditorTextToContain(
      page,
      0,
      'AWESOME this is the zeroth note',
    );
    expect(await page.url()).toContain('note-0');
  });

  test('note widget shows backlinks', async ({ page }) => {
    test.slow();

    const { wsName } = await setup(page);
    // make sure we are on note-1's page
    expect(await page.url()).toContain('note-1');

    await runOperation(
      page,
      'operation::@bangle.io/core-extension:NOTE_TOGGLE_SIDEBAR',
    );

    await Promise.all([
      page.waitForNavigation(),
      page.click(
        `.B-inline-backlink_widget-container [data-id="${wsName}:note-0.md"]`,
      ),
    ]);

    expect(await page.url()).toContain('note-0');
  });
});

async function clickBacklinkHandle(page: Page, text: string) {
  let loc = page.locator(`.bangle-editor button:has-text("${text}")`);

  await loc.waitFor();

  await Promise.all([page.waitForNavigation(), loc.click()]);
}
