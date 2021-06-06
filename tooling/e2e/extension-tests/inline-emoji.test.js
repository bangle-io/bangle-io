const {
  sleep,
  longSleep,
  ctrlKey,
  frmtHTML,
  url,
  createNewNote,
  clearEditor,
  getEditorHTML,
  createWorkspace,
} = require('../helpers');
jest.setTimeout(105 * 1000);

beforeEach(async () => {
  await jestPuppeteer.resetPage();
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
  // await longSleep();
});

test('Emoji works in heading', async () => {
  const wsName = await createWorkspace();

  await createNewNote(wsName, 'test-123');

  const editorHandle = await page.$('.bangle-editor');

  await clearEditor(editorHandle);

  await editorHandle.type('# Wow :', { delay: 3 });
  await editorHandle.press('ArrowDown');
  await editorHandle.press('Enter');

  const html = await getEditorHTML(editorHandle);

  expect(html.includes('😉')).toBe(true);

  expect(html).toMatchSnapshot();
});

test('Emoji works in para', async () => {
  const wsName = await createWorkspace();

  await createNewNote(wsName, 'test-123');

  const editorHandle = await page.$('.bangle-editor');

  await clearEditor(editorHandle);

  await editorHandle.type('life is good :zeb', { delay: 1 });
  await editorHandle.press('Enter');
  const html = await getEditorHTML(editorHandle);
  expect(html.includes('🦓')).toBe(true);
  expect(await getEditorHTML(editorHandle)).toMatchSnapshot();
});

test('Emoji works in list', async () => {
  const wsName = await createWorkspace();

  await createNewNote(wsName, 'test-123');

  const editorHandle = await page.$('.bangle-editor');

  await clearEditor(editorHandle);

  await editorHandle.type('- I am a list :zeb', { delay: 1 });
  await editorHandle.press('Enter');
  const html = await getEditorHTML(editorHandle);
  expect(html.includes('🦓')).toBe(true);
  expect(await getEditorHTML(editorHandle)).toMatchSnapshot();
});
