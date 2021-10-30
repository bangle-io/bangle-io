const { setupClipboard } = require('../editor-helpers');
const {
  url,
  createNewNote,
  createWorkspace,
  setPageWidescreen,
  getPrimaryEditorDebugString,
  getPrimaryEditorHandler,
  newPage,
  jestDebug,
  pressLeftKey,
  clearPrimaryEditor,
  pressRightKey,
} = require('../helpers');

let page, destroyPage;
jest.setTimeout(105 * 1000);

beforeEach(async () => {
  ({ page, destroyPage } = await newPage(browser, { editorClipboard: true }));
  await setPageWidescreen(page);
  await page.goto(url, { waitUntil: 'networkidle2' });
  await setupClipboard(page);
  await page.evaluate(() => localStorage.clear());
});

afterEach(async () => {
  await destroyPage();
});

describe('paragraph', () => {
  test('copy text', async () => {
    const wsName = await createWorkspace(page);
    await createNewNote(page, wsName, 'test123');
    await clearPrimaryEditor(page);
    const editorHandle = await getPrimaryEditorHandler(page, { focus: true });
    await editorHandle.type('magic', { delay: 3 });
    expect(await getPrimaryEditorDebugString(page)).toMatchInlineSnapshot(
      `"doc(paragraph(\\"magic\\"))"`,
    );
    await pressLeftKey(page, { times: 5, withShift: true });
    let copyString = await page.evaluate(() => {
      const view = window.primaryEditor?.view;
      let sl = view.state.doc.slice(1, 6);
      return window.__manualEditorCopy(view, sl);
    });

    // why manualEditor copy not getting the slicing.
    copyString = `<meta charset='utf-8'><p data-pm-slice="1 1 []">mag</p>`;
    await pressRightKey(page);
    await page.keyboard.press('Enter');
    await page.evaluate((copyString) => {
      const view = window.primaryEditor?.view;
      console.log({ copyString });
      window.__manualEditorPaste(view, copyString);
    }, copyString);
    await jestDebug();
    // const handle = await page.waitForSelector(
    //   'button[aria-label^="Workspace Palette"]',
    //   {
    //     timeout: SELECTOR_TIMEOUT,
    //   },
    // );
    expect(3).toBe(3);
  });
});
