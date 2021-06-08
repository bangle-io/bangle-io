const {
  url,
  createNewNote,
  clearEditor,
  getEditorHTML,
  createWorkspace,
  setPageWidescreen,
  setPageSmallscreen,
  getPrimaryEditorDebugString,
  getSecondaryEditorDebugString,
  sleep,
  longSleep,
  getPrimaryEditorHandler,
} = require('./helpers');
const { ctrlKey } = require('./helpers');

jest.setTimeout(105 * 1000);

const setupScreenSize = async (screenType) => {
  await jestPuppeteer.resetPage();
  if (screenType === 'small') {
    await setPageSmallscreen(page);
  } else {
    await setPageWidescreen(page);
  }

  await page.goto(url);
  page.on('error', (err) => {
    console.log('error happen at the page');
    throw err;
  });
  page.on('pageerror', (pageerr) => {
    console.log('pageerror occurred');
    throw pageerr;
  });
  await page.evaluate(() => localStorage.clear());
};

describe('type', () => {
  const getTopAndLastElement = async (page) => {
    let topElement = await page.$('.primary-editor h2');
    expect(await topElement.evaluate((node) => node.innerText)).toEqual(
      'top element',
    );

    let lastElement = await page.$('.primary-editor h3');
    expect(await lastElement.evaluate((node) => node.innerText)).toEqual(
      'last element',
    );
    return { topElement, lastElement };
  };

  const typeScrollable = async () => {
    let primaryHandle = await getPrimaryEditorHandler(page);
    await page.focus('.primary-editor .bangle-editor');
    await longSleep();
    await clearEditor(primaryHandle);
    await page.keyboard.type('## top element');
    await page.keyboard.press('Enter');
    for (let i = 0; i < 15; i++) {
      await page.keyboard.type('# ' + i);
      await page.keyboard.press('Enter');
    }

    await page.keyboard.type('### last element');
    await page.keyboard.press('Enter');
    expect(
      await primaryHandle.evaluate((node) =>
        Boolean(
          node.querySelectorAll('h2').length === 1 &&
            node.querySelectorAll('h3').length === 1,
        ),
      ),
    ).toBe(true);

    await longSleep();
  };

  test.each(['small', 'regular', 'split-screen'])(
    '%s scroll state preserve',
    async (screenType) => {
      await setupScreenSize(screenType);

      const wsName = await createWorkspace();
      await createNewNote(wsName, 'test123');

      if (screenType === 'split-screen') {
        await page.keyboard.down(ctrlKey);
        await page.keyboard.press('\\');
        await page.keyboard.up(ctrlKey);
        await sleep();
        // eslint-disable-next-line jest/no-conditional-expect
        expect(await page.$('.secondary-editor')).not.toBeNull();
      }
      await typeScrollable();

      let { topElement, lastElement } = await getTopAndLastElement(page);
      // check that the last element is in view port
      expect(await topElement.isIntersectingViewport()).toBe(false);
      expect(await lastElement.isIntersectingViewport()).toBe(true);

      await createNewNote(wsName, 'other-note-1');
      await longSleep();
      await expect(page.title()).resolves.toMatch('other-note-1');
      expect(await getPrimaryEditorDebugString(page)).toMatchInlineSnapshot(
        `"doc(heading(\\"other-note-1\\"), paragraph(\\"Hello world!\\"))"`,
      );
      await longSleep();

      await page.goBack();

      await longSleep();

      // make sure we are back to our previous page
      await expect(page.title()).resolves.toMatch('test123');

      ({ topElement, lastElement } = await getTopAndLastElement(page));
      // check if the scroll state is preserved
      expect(await topElement.isIntersectingViewport()).toBe(false);
      expect(await lastElement.isIntersectingViewport()).toBe(true);
    },
  );

  test('reloading preserves scroll', async () => {
    await setupScreenSize('regular');

    const wsName = await createWorkspace();
    await createNewNote(wsName, 'test123');

    await typeScrollable();

    let { topElement, lastElement } = await getTopAndLastElement(page);
    // check that the last element is in view port
    expect(await topElement.isIntersectingViewport()).toBe(false);
    expect(await lastElement.isIntersectingViewport()).toBe(true);
    // let editor flush out changes or it will block reload
    await sleep(500);

    await page.reload({ timeout: 8000, waitUntil: 'networkidle0' });

    await longSleep();

    // make sure we are back to our previous page
    await expect(page.title()).resolves.toMatch('test123');

    ({ topElement, lastElement } = await getTopAndLastElement(page));
    // check if the scroll state is preserved
    expect(await topElement.isIntersectingViewport()).toBe(false);
    expect(await lastElement.isIntersectingViewport()).toBe(true);
  });
});
