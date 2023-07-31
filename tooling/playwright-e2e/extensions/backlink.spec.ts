/* eslint-disable testing-library/no-await-sync-query */
/* eslint-disable testing-library/prefer-screen-queries */
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { PRIMARY_EDITOR_INDEX } from '@bangle.io/constants';

import { resolvePath } from '../bangle-helpers';
import { withBangle as test } from '../fixture-with-bangle';
import {
  clearEditor,
  createNewNote,
  createNotesFromMdString,
  createWorkspace,
  getAllWsPathsHtml,
  getEditorLocator,
  getTestIdLocator,
  longSleep,
  pushWsPathToPrimary,
  runOperation,
  SELECTOR_TIMEOUT,
  sleep,
  testIdSelector,
  waitForEditorTextToContain,
  waitForWsPathToLoad,
} from '../helpers';

test.beforeEach(async ({ bangleApp }, testInfo) => {
  await bangleApp.open();
});

const BACKLINK_BUTTON_TEST_ID = 'inline-backlink-button';

const BACKLINK_NOT_FOUND_CLASS = 'B-inline-backlink_backlink-node-not-found';

test.describe('backlink workflow', () => {
  const setup = async (page: Page) => {
    let wsName = await createWorkspace(page);

    const wsPath = await createNewNote(page, wsName, 'note-0');

    await getEditorLocator(page, PRIMARY_EDITOR_INDEX, {
      focus: true,
      wsPath,
    });

    await clearEditor(page, PRIMARY_EDITOR_INDEX);

    await longSleep();
    // create note-1
    await page.keyboard.type('this is the zeroth note ', { delay: 50 });
    await page.keyboard.type('[[note-1]]', { delay: 55 });

    await sleep();

    await waitForEditorTextToContain(page, PRIMARY_EDITOR_INDEX, 'note-1');

    await clickBacklinkHandle(page, 'note-1');

    await sleep();

    await waitForEditorTextToContain(page, PRIMARY_EDITOR_INDEX, 'note-1');

    // now in note-1
    // lets create backlink to note-0
    await clearEditor(page, PRIMARY_EDITOR_INDEX);
    await page.keyboard.type('[[0', { delay: 55 });

    await page.keyboard.press('Enter', { delay: 30 });

    await page.getByTestId(BACKLINK_BUTTON_TEST_ID).waitFor({
      timeout: 4 * SELECTOR_TIMEOUT,
    });

    return { wsName, note0WsPath: wsPath };
  };

  test('Creating', async ({ page }) => {
    await setup(page);
    // make sure the backlink created is for note-0

    await expect(getTestIdLocator(BACKLINK_BUTTON_TEST_ID, page)).toHaveText(
      'note-0',
      { useInnerText: true },
    );
  });

  test('Hovering and clicking works', async ({ page }) => {
    test.slow();

    const { note0WsPath } = await setup(page);
    // make sure we are on note-1's page
    await expect(page).toHaveURL(/note-1/);

    await getTestIdLocator(BACKLINK_BUTTON_TEST_ID, page).waitFor();
    // // Hover to see if it is correctly shown
    await getTestIdLocator(BACKLINK_BUTTON_TEST_ID, page).hover();

    await page.locator('.B-editor_display-popup').waitFor();

    await expect(page.locator('.B-editor_display-popup')).toHaveText(
      /this is the zeroth note[\n\s]+note-1/,
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
    await waitForWsPathToLoad(page, PRIMARY_EDITOR_INDEX, {
      wsPath: note0WsPath,
    });

    await waitForEditorTextToContain(
      page,
      PRIMARY_EDITOR_INDEX,
      'AWESOME this is the zeroth note',
    );
    await expect(page).toHaveURL(/note-0/);
  });

  test('note widget shows backlinks', async ({ page }) => {
    test.slow();

    const { wsName } = await setup(page);
    // make sure we are on note-1's page
    await expect(page).toHaveURL(/note-1/);

    await runOperation(
      page,
      'operation::@bangle.io/core-extension:NOTE_TOGGLE_SIDEBAR',
    );

    await page.click(
      `${testIdSelector(
        'inline-backlink_widget-container',
      )} [data-id="${wsName}:note-0.md"]`,
    );

    await page.waitForURL(/note-0/);
  });

  test('correctly sets popupEditorWsPath in openedWsPath', async ({ page }) => {
    test.slow();

    const { wsName } = await setup(page);

    const getPopupEditorWsPath = async () =>
      page.evaluate(() => {
        return window._nsmE2e?.getOpenedWsPaths().popupEditorWsPath;
      }, []);

    expect(await getPopupEditorWsPath()).toBeUndefined();

    await getTestIdLocator(BACKLINK_BUTTON_TEST_ID, page).hover();

    await expect.poll(() => getPopupEditorWsPath()).toBe(`${wsName}:note-0.md`);

    // hover on something else
    await getTestIdLocator('app-editor-container_editorbar', page)
      .locator('button')
      .first()
      .hover();

    // the path should now be undefined
    // we do a poll because it takes a little while for the popup to disappear
    await expect.poll(() => getPopupEditorWsPath()).toBeUndefined();
  });
});

test.describe('backlink rendering', () => {
  const setup = async (
    page: Page,
    notes: (wsName: string) => Array<[string, string]>,
    wsName?: string,
  ) => {
    if (!wsName) {
      wsName = await createWorkspace(page);
    }

    const finalNotes: Array<[string, string]> = notes(wsName).map(
      ([wsPath, content], i) => [wsPath, content],
    );
    await createNotesFromMdString(page, wsName, finalNotes);

    let results = Object.fromEntries(
      await getAllWsPathsHtml(page, {
        omitWsName: false,
      }),
    );

    if (Object.keys(results).length !== finalNotes.length) {
      throw new Error(
        `Expected ${finalNotes.length} notes, got ${
          Object.keys(results).length
        }`,
      );
    }

    await sleep(10);
    // push the last note to primary
    await pushWsPathToPrimary(page, finalNotes[finalNotes.length - 1]?.[0]!);

    await sleep(10);

    // maintain the order of the notes and omit the wsName (because it is not stable)
    return finalNotes.map(([wsPath]) =>
      [resolvePath(wsPath).fileName, results[wsPath]].join('\n'),
    );
  };

  test('regular backlink', async ({ page }) => {
    const [result0, result1, result2] = await setup(page, (wsName) => [
      [`${wsName}:note-0.md`, 'This a note 0'],
      [`${wsName}:note-1.md`, 'This a note1 and here is a link to [[note-0]]'],
      [
        `${wsName}:note-2.md`,
        'This a note1 and here is a link to [[note-not-found]]',
      ],
    ]);

    expect(result0).toContain('This a note 0');
    expect(result1).toContain('note-0');
    expect(result2).toContain('This a note1 and here is a link to');

    expect(result1).not.toContain(BACKLINK_NOT_FOUND_CLASS);
    expect(result2).toContain(BACKLINK_NOT_FOUND_CLASS);
  });

  test('shows the title', async ({ page }) => {
    const [result1] = await setup(page, (wsName) => [
      [
        `${wsName}:note-0.md`,
        'This a note 0 and here is a link to [[note-0|alternative name]]',
      ],
    ]);

    expect(result1).toContain('alternative name');
  });

  test('renders greyed out if there is no match', async ({ page }) => {
    const [result1] = await setup(page, (wsName) => [
      [
        `${wsName}:note-1.md`,
        'This a note 0 and here is a link to [[note-unknown]]',
      ],
    ]);

    expect(result1).toContain(BACKLINK_NOT_FOUND_CLASS);
  });

  test('picks the least nested when there are two matches', async ({
    page,
  }) => {
    const wsName = await createWorkspace(page);

    await setup(
      page,
      (wsName) => [
        [`${wsName}:magic/note-A.md`, 'some content'],
        [`${wsName}:magic/some/note-A.md`, 'some other content'],
        [`${wsName}:note-B.md`, `hello world [[note-A]]`],
      ],
      wsName,
    );

    await expect(page).toHaveURL(/note-B/);

    await page.getByTestId(BACKLINK_BUTTON_TEST_ID).click();

    await expect(page).toHaveURL(/magic\/note-A\.md/);
  });

  test('does not work if not a matching file extension', async ({ page }) => {
    const wsName = await createWorkspace(page);

    const [, , result3] = await setup(
      page,
      (wsName) => [
        [`${wsName}:magic/note-A.md`, 'some content'],
        [`${wsName}:magic/some/note-A.md`, 'some other content'],
        [`${wsName}:note-B.md`, `hello world [[note-A.txt]]`],
      ],
      wsName,
    );

    await expect(page).toHaveURL(/note-B/);

    expect(result3).toContain(BACKLINK_NOT_FOUND_CLASS);
  });

  test('fall backs to case insensitive if no case sensitive match', async ({
    page,
  }) => {
    const [, result2] = await setup(page, (wsName) => [
      [`${wsName}:magic/note-A.md`, 'some content'],
      [`${wsName}:note-B.md`, `hello world [[Note-A]]`],
    ]);

    await expect(page).toHaveURL(/note-B/);

    await page.getByTestId(BACKLINK_BUTTON_TEST_ID).click();

    await expect(page).toHaveURL(/magic\/note-A\.md/);
  });

  test('Gets the exact match if it exists', async ({ page }) => {
    await setup(page, (wsName) => [
      [`${wsName}:magic/nested/NoTe-A.md`, 'some content'],
      [`${wsName}:magic/note-A.md`, 'some content'],
      [`${wsName}:note-B.md`, `hello world [[NoTe-A]]`],
    ]);

    await expect(page).toHaveURL(/note-B/);

    await page.getByTestId(BACKLINK_BUTTON_TEST_ID).click();

    await expect(page).toHaveURL(/nested\/NoTe-A/);
  });

  test("doesn't confuse if match ends with same file name", async ({
    page,
  }) => {
    const [, , result3] = await setup(page, (wsName) => [
      [`${wsName}:magic/some-place/hotel/something-note-1.md`, 'content a'],
      [`${wsName}:magic/some-other/place/dig/some-else-note-1.md`, 'content b'],
      [`${wsName}:note-2.md`, `hello world [[note-1]]`],
    ]);

    expect(result3).toContain(BACKLINK_NOT_FOUND_CLASS);
  });

  test('matches if relative path 1', async ({ page }) => {
    await setup(page, (wsName) => [
      [`${wsName}:magic/some-place/hotel/note1.md`, 'content'],
      [`${wsName}:magic/some/note2.md`, 'content'],
      [`${wsName}:magic/note2.md`, 'content'],
      [`${wsName}:magic/hello/beautiful/world.md`, `hello world [[../note2]]`],
    ]);

    await expect(page).toHaveURL(/world\.md/);

    await page.getByTestId(BACKLINK_BUTTON_TEST_ID).click();

    await expect(page).toHaveURL(/magic\/hello\/note2/);
  });

  test('matches if relative path 2', async ({ page }) => {
    await setup(page, (wsName) => [
      [`${wsName}:magic/some-place/hotel/note1.md`, 'content'],
      [`${wsName}:magic/some/note2.md`, 'content'],
      [`${wsName}:magic/note2.md`, 'content'],
      [
        `${wsName}:magic/hello/beautiful/world.md`,
        `hello world [[../../note2]]`,
      ],
    ]);

    await expect(page).toHaveURL(/world\.md/);

    await page.getByTestId(BACKLINK_BUTTON_TEST_ID).click();

    await expect(page).toHaveURL(/magic\/note2\.md/);
  });

  test('matches if relative path 3', async ({ page }) => {
    const wsName = await createWorkspace(page);

    await setup(
      page,
      (wsName) => [
        [`${wsName}:magic/some-place/hotel/note1.md`, 'content'],
        [`${wsName}:magic/some/note2.md`, 'content'],
        [`${wsName}:magic/note2.md`, 'content'],
        [
          `${wsName}:magic/hello/beautiful/world.md`,
          `hello world [[../../../note2]]`,
        ],
      ],
      wsName,
    );

    await expect(page).toHaveURL(/world\.md/);

    await page.getByTestId(BACKLINK_BUTTON_TEST_ID).click();

    const regex = new RegExp(`${wsName}/note2.md`);

    await expect(page).toHaveURL(regex);
  });

  test('if relative is outside', async ({ page }) => {
    const wsName = await createWorkspace(page);

    await setup(
      page,
      (wsName) => [
        [`${wsName}:magic/some-place/hotel/note1.md`, 'content'],
        [`${wsName}:magic/some/note2.md`, 'content'],
        [`${wsName}:magic/note2.md`, 'content'],
        [
          `${wsName}:magic/hello/beautiful/world.md`,
          `hello world [[../../../../note2]]`,
        ],
      ],
      wsName,
    );

    await expect(page).toHaveURL(/world\.md/);

    await page.getByTestId(BACKLINK_BUTTON_TEST_ID).click();

    const regex = new RegExp(`${wsName}/note2.md`);

    await expect(page).toHaveURL(regex);
  });

  test('if path starts with /', async ({ page }) => {
    const wsName = await createWorkspace(page);

    await setup(
      page,
      (wsName) => [
        [`${wsName}:magic/some-place/hotel/note1.md`, 'content'],
        [`${wsName}:magic/some/note2.md`, 'content'],
        [`${wsName}:magic/note2.md`, 'content'],
        [`${wsName}:magic/hello/beautiful/world.md`, `hello world [[/note2]]`],
      ],
      wsName,
    );

    await expect(page).toHaveURL(/world\.md/);

    await page.getByTestId(BACKLINK_BUTTON_TEST_ID).click();

    const regex = new RegExp(`${wsName}/note2.md`);

    await expect(page).toHaveURL(regex);
  });

  test('if path starts with / and has a directory', async ({ page }) => {
    const wsName = await createWorkspace(page);

    await setup(
      page,
      (wsName) => [
        [`${wsName}:magic/some-place/hotel/note1.md`, 'content'],
        [`${wsName}:magic/some/note2.md`, 'content'],
        [`${wsName}:magic/note2.md`, 'content'],
        [
          `${wsName}:magic/hello/beautiful/world.md`,
          `hello world [[/magic/some/note2.md]]`,
        ],
      ],
      wsName,
    );

    await expect(page).toHaveURL(/world\.md/);

    await page.pause();
    await page.getByTestId(BACKLINK_BUTTON_TEST_ID).click();

    await page.pause();

    await expect(page).toHaveURL(/magic\/some\/note2\.md/);
  });
});

async function clickBacklinkHandle(page: Page, text: string) {
  let loc = page.locator(`.bangle-editor button:has-text("${text}")`);

  await loc.waitFor();

  await Promise.all([page.waitForNavigation(), loc.click()]);
}
