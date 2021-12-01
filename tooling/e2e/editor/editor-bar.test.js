const {
  createNewNote,
  createWorkspace,
  ctrlKey,
  getPrimaryEditorHandler,
  getSecondaryEditorHTML,
  newPage,
  SELECTOR_TIMEOUT,
  setPageWidescreen,
  sleep,
  url,
  waitForSecondaryEditorFocus,
} = require('../helpers');

jest.setTimeout(105 * 1000);
let page, destroyPage;

beforeEach(async () => {
  ({ page, destroyPage } = await newPage(browser));
  await setPageWidescreen(page);
  await page.goto(url, { waitUntil: 'networkidle2' });
  await page.evaluate(() => localStorage.clear());
  await page.goto(url, { waitUntil: 'networkidle2' });
});

afterEach(async () => {
  await destroyPage();
});

describe('editor bar', () => {
  const isEditorBarFocused = (editorId) => {
    return page.evaluate((editorId) => {
      return Boolean(
        document
          .querySelector('.editor-container_editor-container-' + editorId)
          .querySelector('.editor-container_editor-bar > .active'),
      );
    }, editorId);
  };

  test('shows currerntly focused editor', async () => {
    const wsName = await createWorkspace(page);
    await createNewNote(page, wsName, 'test123');
    await getPrimaryEditorHandler(page);

    await page.keyboard.down(ctrlKey);
    await page.keyboard.press('\\');
    await page.keyboard.up(ctrlKey);
    await sleep();

    // split screen auto focuses on the second (secondary) editor
    await waitForSecondaryEditorFocus(page);

    expect(await isEditorBarFocused(0)).toBe(false);
    expect(await isEditorBarFocused(1)).toBe(true);

    // Focus on first editor
    await getPrimaryEditorHandler(page, { focus: true });

    expect(await isEditorBarFocused(0)).toBe(true);
    expect(await isEditorBarFocused(1)).toBe(false);
  });
});
