import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

import {
  PRIMARY_EDITOR_INDEX,
  SECONDARY_EDITOR_INDEX,
} from '@bangle.io/constants';

import { withBangle as test } from '../fixture-with-bangle';
import {
  clearEditor,
  createNewNote,
  createWorkspace,
  getEditorDebugString,
  getEditorLocator,
  getEditorSelectionJson,
  longSleep,
  runOperation,
  sleep,
  splitScreen,
  waitForEditorFocus,
  waitForEditorTextToContain,
  waitForWsPathToLoad,
} from '../helpers';

test.beforeEach(async ({ bangleApp }, testInfo) => {
  await bangleApp.open();
});

const getTopAndLastElement = async (page: Page) => {
  const topLocator = page.locator('.B-editor-container_editor-0 h2');
  const lastLocator = page.locator('.B-editor-container_editor-0 h3');

  await expect(topLocator).toHaveText('top element', { useInnerText: true });

  await expect(lastLocator).toHaveText('last element', { useInnerText: true });

  return {
    topLocator,
    lastLocator,
  };
};

const typeScrollableThings = async (page: Page) => {
  let editorLocator = await getEditorLocator(page, PRIMARY_EDITOR_INDEX, {
    focus: true,
  });
  // TODO there is a bug that sometimes typed thing is missed and never recorded
  await clearEditor(page, PRIMARY_EDITOR_INDEX);
  await page.keyboard.type('## top element', { delay: 5 });
  await page.keyboard.press('Enter');
  for (let i = 0; i < 15; i++) {
    await page.keyboard.type('# ' + i, { delay: 10 });
    await page.keyboard.press('Enter', { delay: 10 });
  }

  await page.keyboard.type('### last element', { delay: 5 });

  await sleep();

  expect(
    await editorLocator.evaluate((node) =>
      Boolean(
        node.querySelectorAll('h2').length === 1 &&
          node.querySelectorAll('h3').length === 1,
      ),
    ),
  ).toBe(true);

  await longSleep();
};

test.describe('scroll', () => {
  for (const screenType of ['regular', 'split-screen']) {
    test(screenType + ' scroll state preserve', async ({ page }) => {
      const wsName = await createWorkspace(page);
      await createNewNote(page, wsName, 'test123');

      if (screenType === 'split-screen') {
        await splitScreen(page);
        await getEditorLocator(page, SECONDARY_EDITOR_INDEX);

        // eslint-disable-next-line jest/no-conditional-expect
        expect(await page.$('.B-editor-container_editor-1')).not.toBeNull();
      }

      await typeScrollableThings(page);

      const selectionJSON = await getEditorSelectionJson(
        page,
        PRIMARY_EDITOR_INDEX,
      );

      let { topLocator, lastLocator } = await getTopAndLastElement(page);

      // check that the last element is in view port
      await expect(topLocator).not.toBeInViewport();
      await expect(lastLocator).toBeInViewport();

      await createNewNote(page, wsName, 'other-note-1');

      await getEditorLocator(page, PRIMARY_EDITOR_INDEX);

      await expect(page).toHaveTitle(/other-note-1/);

      await waitForEditorTextToContain(
        page,
        PRIMARY_EDITOR_INDEX,
        'other-note-1',
      );

      expect(await getEditorDebugString(page, PRIMARY_EDITOR_INDEX)).toEqual(
        `doc(heading("other-note-1"), paragraph("Hello world!"))`,
      );

      await page.goBack({ waitUntil: 'networkidle' });

      await getEditorLocator(page, PRIMARY_EDITOR_INDEX);

      // make sure we are back to our previous page
      await expect(page).toHaveTitle(/test123/);

      await longSleep();

      await expect(topLocator).not.toBeInViewport();
      await expect(lastLocator).toBeInViewport();

      // check if selection is preserved
      expect(selectionJSON).toEqual(
        await getEditorSelectionJson(page, PRIMARY_EDITOR_INDEX),
      );
    });
  }
  test('reloading preserves scroll & selection', async ({ page }) => {
    const wsName = await createWorkspace(page);
    await createNewNote(page, wsName, 'test123');

    await typeScrollableThings(page);

    let { topLocator, lastLocator } = await getTopAndLastElement(page);
    // check that the last element is in view port
    await expect(topLocator).not.toBeInViewport();
    await expect(lastLocator).toBeInViewport();

    // let editor flush out changes or it will block reload
    await longSleep(300);

    await page.reload({ timeout: 8000, waitUntil: 'networkidle' });

    await getEditorLocator(page, PRIMARY_EDITOR_INDEX);

    // make sure we are back to our previous page
    await expect(page).toHaveTitle(/test123/);

    // check if the scroll state is preserved
    await expect(topLocator).not.toBeInViewport();
    await expect(lastLocator).toBeInViewport();

    await page.keyboard.press('Enter');

    // selection should be at the bottom
    await page.keyboard.type(
      '#### My existence at the bottom proves that I was spared from a reload.',
    );

    await expect(topLocator).not.toBeInViewport();
    await expect(lastLocator).toBeInViewport();
    expect(await getEditorDebugString(page, PRIMARY_EDITOR_INDEX)).toEqual(
      `doc(heading("top element"), heading("0"), heading("1"), heading("2"), heading("3"), heading("4"), heading("5"), heading("6"), heading("7"), heading("8"), heading("9"), heading("10"), heading("11"), heading("12"), heading("13"), heading("14"), heading("last element"), heading("My existence at the bottom proves that I was spared from a reload."), paragraph)`,
    );
  });

  test('on reload preserves selection on secondary in a splitscreen', async ({
    page,
  }) => {
    const wsName = await createWorkspace(page);
    const wsPath = await createNewNote(page, wsName, 'test123');

    await runOperation(
      page,
      'operation::@bangle.io/core-extension:TOGGLE_EDITOR_SPLIT',
    );

    await getEditorLocator(page, SECONDARY_EDITOR_INDEX, { wsPath });

    // let editor flush out changes or it will block reload
    await longSleep(300);

    await page.reload({ timeout: 8000, waitUntil: 'networkidle' });

    await getEditorLocator(page, SECONDARY_EDITOR_INDEX, { wsPath });

    expect(true).toBe(true);
  });

  test('on reload preserves selection on primary in a splitscreen', async ({
    page,
  }) => {
    const wsName = await createWorkspace(page);
    const wsPath = await createNewNote(page, wsName, 'test123');

    await runOperation(
      page,
      'operation::@bangle.io/core-extension:TOGGLE_EDITOR_SPLIT',
    );

    await sleep();

    await waitForWsPathToLoad(page, SECONDARY_EDITOR_INDEX, { wsPath });

    await runOperation(
      page,
      'operation::@bangle.io/core-extension:focus-primary-editor',
    );

    await waitForEditorFocus(page, PRIMARY_EDITOR_INDEX, { wsPath });

    // let editor flush out changes or it will block reload
    await longSleep(700);

    await page.reload({ waitUntil: 'networkidle' });

    await waitForEditorFocus(page, PRIMARY_EDITOR_INDEX);
  });
});
