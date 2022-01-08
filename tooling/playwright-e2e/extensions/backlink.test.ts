import { expect, Page, test } from '@playwright/test';

import {
  clearEditor,
  createNewNote,
  createWorkspace,
  getEditorLocator,
  longSleep,
  runOperation,
  SELECTOR_TIMEOUT,
  sleep,
  waitForEditorTextToContain,
} from '../helpers';

test.beforeEach(async ({ page, baseURL }, testInfo) => {
  await page.goto(baseURL!, { waitUntil: 'networkidle' });
});

test.describe.parallel('backlink workflow', () => {
  const setup = async (page: Page): Promise<string> => {
    let wsName = await createWorkspace(page);

    const wsPath = await createNewNote(page, wsName, 'note-0');

    const editorLocator = await getEditorLocator(page, 0, {
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

    await page.waitForSelector('.inline-backlink_backlink', {
      timeout: 4 * SELECTOR_TIMEOUT,
    });

    return wsName;
  };

  test('Creating', async ({ page }) => {
    const wsName = await setup(page);
    // make sure the backlink created is for note-0

    await expect(page.locator('.inline-backlink_backlink')).toHaveText(
      'note-0',
      { useInnerText: true },
    );
  });

  test('Hovering and clicking works', async ({ page }) => {
    test.slow();
    const wsName = await setup(page);
    // make sure we are on note-1's page
    expect(await page.url()).toContain('note-1');
    // // Hover to see if it is correctly shown
    await page.hover('.inline-backlink_backlink');

    await page.locator('.editor_editor-display-popup').waitFor();

    await expect(page.locator('.editor_editor-display-popup')).toHaveText(
      /this is the zeroth note note-1/,
      { useInnerText: true },
    );

    // // This block exists because I was unable to click using regular way
    const popupPara = await page.$(
      '.editor_editor-display-popup .bangle-editor p',
    );
    const coOrdinates = await popupPara?.boundingBox();
    if (!coOrdinates) {
      throw new Error('Coordinates not set');
    }

    await page.mouse.click(coOrdinates.x, coOrdinates.y);
    await page.keyboard.press('ArrowLeft'); // just move arrow to extreme left
    await page.keyboard.press('ArrowLeft');
    // Type in the popup
    await page.keyboard.type('AWESOME ', { delay: 5 });

    await clickBacklinkHandle(page, 'note-0');
    await waitForEditorTextToContain(
      page,
      0,
      'AWESOME this is the zeroth note',
    );
    expect(await page.url()).toContain('note-0');
  });

  test('note widget shows backlinks', async ({ page }) => {
    test.slow();

    const wsName = await setup(page);
    // make sure we are on note-1's page
    expect(await page.url()).toContain('note-1');

    await runOperation(
      page,
      'operation::bangle-io-core-operations:NOTE_TOGGLE_SIDEBAR',
    );

    await Promise.all([
      page.waitForNavigation(),
      page.click(
        `.inline-backlink_widget-container [data-id="${wsName}:note-0.md"]`,
      ),
    ]);

    expect(await page.url()).toContain('note-0');
  });
});

async function clickBacklinkHandle(page: Page, text: string) {
  await Promise.all([
    page.waitForNavigation(),
    page.click(`.bangle-editor button:has-text("${text}")`),
  ]);
}
