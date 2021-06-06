const {
  url,
  createNewNote,
  clearEditor,
  getEditorHTML,
  createWorkspace,
  setPageWidescreen,
  getPrimaryEditorDebugString,
  getSecondaryEditorDebugString,
  sleep,
  longSleep,
  getPrimaryEditorHandler,
} = require('./helpers');
const { ctrlKey } = require('./helpers');

jest.setTimeout(105 * 1000);

describe('widescreen', () => {
  beforeEach(async () => {
    await jestPuppeteer.resetPage();
    await setPageWidescreen(page);
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
  });

  test('between notes scroll is preserved', async () => {
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
    const wsName = await createWorkspace();
    await createNewNote(wsName, 'test-123');
    let primaryHandle = await getPrimaryEditorHandler(page);

    await clearEditor(primaryHandle);
    await page.keyboard.type('## top element');
    await page.keyboard.press('Enter');
    for (let i = 0; i < 20; i++) {
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

    let { topElement, lastElement } = await getTopAndLastElement(page);
    // check that the last element is in view port
    expect(await topElement.isIntersectingViewport()).toBe(false);
    expect(await lastElement.isIntersectingViewport()).toBe(true);

    await createNewNote(wsName, 'other-note-1');
    await sleep();
    await expect(page.title()).resolves.toMatch('other-note-1');
    expect(await getPrimaryEditorDebugString(page)).toMatchInlineSnapshot(
      `"doc(heading(\\"other-note-1\\"), paragraph(\\"Hello world!\\"))"`,
    );
    await longSleep();

    await page.goBack();

    await longSleep();

    // make sure we are back to our previous page
    await expect(page.title()).resolves.toMatch('test-123');

    ({ topElement, lastElement } = await getTopAndLastElement(page));
    // check if the scroll state is preserved
    expect(await topElement.isIntersectingViewport()).toBe(false);
    expect(await lastElement.isIntersectingViewport()).toBe(true);
  });
});
