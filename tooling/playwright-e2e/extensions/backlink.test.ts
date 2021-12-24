import { expect, Page, test } from '@playwright/test';

import {
  clearEditor,
  createNewNote,
  createWorkspace,
  getPrimaryEditorHandler,
  runAction,
  SELECTOR_TIMEOUT,
  waitForEditorTextToContain,
} from '../helpers';

test.beforeEach(async ({ page, baseURL }, testInfo) => {
  await page.goto(baseURL!, { waitUntil: 'networkidle' });
});

test.describe.parallel('backlink workflow', () => {
  const setup = async (page: Page): Promise<string> => {
    let wsName = await createWorkspace(page);

    await createNewNote(page, wsName, 'note-0');

    await getPrimaryEditorHandler(page, { focus: true });
    await clearEditor(page, 0);

    // create note-1
    await page.keyboard.type('this is the zeroth note ');

    await page.keyboard.type('[[note-1]]', { delay: 30 });

    await waitForEditorTextToContain(page, 0, 'note-1');

    await clickBacklinkHandle(page, 'note-1');

    await waitForEditorTextToContain(page, 0, 'note-1');

    // now in note-1
    // lets create backlink to note-0
    await clearEditor(page, 0);
    await page.keyboard.type('[[0', { delay: 30 });
    await page.keyboard.press('Enter', { delay: 30 });

    await page.waitForSelector('.inline-backlink_backlink', {
      timeout: 4 * SELECTOR_TIMEOUT,
    });

    return wsName;
  };

  test('Creating', async ({ page }) => {
    test.slow();
    const wsName = await setup(page);
    // make sure the backlink created is for note-0
    expect(
      await page.$eval(
        '.inline-backlink_backlink',
        (n) => (n as HTMLElement).innerText,
      ),
    ).toEqual('note-0');
  });

  test('Hovering and clicking works', async ({ page }) => {
    test.slow();

    const wsName = await setup(page);
    // make sure we are on note-1's page
    expect(await page.url()).toContain('note-1');
    // // Hover to see if it is correctly shown
    await page.hover('.inline-backlink_backlink');

    await page.waitForSelector('.editor_editor-display-popup', {
      timeout: SELECTOR_TIMEOUT,
    });

    expect(
      await page.$eval(
        '.editor_editor-display-popup',
        (el) => (el as HTMLElement).innerText,
      ),
    ).toContain('this is the zeroth note note-1');

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
    await runAction(
      page,
      'action::bangle-io-core-actions:NOTE_TOGGLE_SIDEBAR_ACTION',
    );

    await page.waitForSelector(`.inline-backlink_widget-container`, {
      timeout: SELECTOR_TIMEOUT,
    });

    await page.waitForFunction(
      () =>
        (
          document.querySelector(
            '.inline-backlink_widget-container',
          ) as HTMLElement
        )?.innerText
          .trim()
          .includes('note-0'),
      {
        timeout: 4 * SELECTOR_TIMEOUT,
      },
    );

    expect(
      await page.$eval(
        '.inline-backlink_widget-container',
        (el) => (el as HTMLElement).innerText,
      ),
    ).toContain('note-0');

    await page.click(
      `.inline-backlink_widget-container [data-id="${wsName}:note-0.md"]`,
    );

    await page.waitForFunction(
      () => window.location.pathname.includes('note-0'),
      {
        timeout: 4 * SELECTOR_TIMEOUT,
      },
    );

    // Click triggers navigation
    await page.waitForLoadState('networkidle');

    expect(await page.url()).toContain('note-0');
  });
});

async function clickBacklinkHandle(page: Page, text: string) {
  const editorHandle = await getPrimaryEditorHandler(page);
  await Promise.all([
    page.waitForNavigation({
      timeout: 5000,
      waitUntil: 'networkidle',
    }),
    editorHandle?.$$eval(
      '.inline-backlink_backlink',
      (nodes: HTMLElement[], text) =>
        [...nodes].find((n) => n?.innerText === text)?.click(),
      text,
    ),
  ]);
}
