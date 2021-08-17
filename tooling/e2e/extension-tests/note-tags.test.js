const {
  url,
  createNewNote,
  createWorkspace,
  sleep,
  getPrimaryEditorHandler,
  newPage,
  getPrimaryEditorDebugString,
  getPrimaryEditorJSON,
  sendCtrlABackspace,
} = require('../helpers');
jest.setTimeout(155 * 1000);

let page, destroyPage;

beforeEach(async () => {
  ({ page, destroyPage } = await newPage(browser, { widescreen: true }));

  await page.goto(url, { waitUntil: 'networkidle2' });
  await page.evaluate(() => localStorage.clear());
  await page.goto(url, { waitUntil: 'networkidle2' });
});

afterEach(async () => {
  await destroyPage();
});

async function getTagsFromDoc() {
  // A contrived way to search and get the tag object
  return (await getPrimaryEditorJSON(page)).content
    ?.flatMap((r) =>
      r.content?.flatMap((rr) => (rr.type === 'tag' ? rr : undefined)),
    )
    .filter(Boolean);
}

test('is able to create a tag using inline palette', async () => {
  const wsName = await createWorkspace(page);
  await createNewNote(page, wsName, 'test-one');

  await getPrimaryEditorHandler(page, { focus: true });

  await page.keyboard.press('Enter');
  await page.keyboard.type('#yellow');

  await sleep(10);
  expect(await getPrimaryEditorDebugString(page)).toContain(
    `heading(note-tags-paletteMark("#yellow")`,
  );

  await page.keyboard.press('Enter');

  const tag = await getTagsFromDoc();

  expect(tag).toEqual([
    {
      attrs: {
        tagValue: 'yellow',
      },
      type: 'tag',
    },
  ]);
});

describe('multiple keyboard cases', () => {
  beforeEach(async () => {
    const wsName = await createWorkspace(page);
    await createNewNote(page, wsName, 'test-one');

    await getPrimaryEditorHandler(page, { focus: true });
  });

  test('is able to create a tag by typing and then pressing a space', async () => {
    await page.keyboard.press('Enter');
    await page.keyboard.type('#mellow');

    await sleep(10);

    await page.keyboard.press('Space');

    const tag = await getTagsFromDoc();

    expect(tag).toEqual([
      {
        attrs: {
          tagValue: 'mellow',
        },
        type: 'tag',
      },
    ]);
  });

  test('Typing # followed by space allows heading 1', async () => {
    await sendCtrlABackspace(page);
    await sleep();
    await page.keyboard.type('#');

    await sleep(10);

    await page.keyboard.press('Space');

    await page.keyboard.type('bob');

    expect(await getPrimaryEditorJSON(page)).toEqual({
      content: [
        {
          attrs: {
            collapseContent: null,
            level: 1,
          },
          content: [
            {
              text: 'bob',
              type: 'text',
            },
          ],
          type: 'heading',
        },
        {
          type: 'paragraph',
        },
      ],
      type: 'doc',
    });
  });

  test('Typing # twice followed by space allows heading 2', async () => {
    await sendCtrlABackspace(page);
    await sleep();
    await page.keyboard.type('#');
    await page.keyboard.type('#');

    await sleep(10);

    await page.keyboard.press('Space');

    await page.keyboard.type('bob');

    expect(await getPrimaryEditorJSON(page)).toEqual({
      content: [
        {
          attrs: {
            collapseContent: null,
            level: 2,
          },
          content: [
            {
              text: 'bob',
              type: 'text',
            },
          ],
          type: 'heading',
        },
        {
          type: 'paragraph',
        },
      ],
      type: 'doc',
    });
  });

  test('Inside a paragraph typing # followed space', async () => {
    await sendCtrlABackspace(page);
    await sleep();
    await page.keyboard.type('start of para');
    await sleep(10);

    await page.keyboard.press('Space');

    await page.keyboard.type('#');

    await page.keyboard.press('Space');

    await page.keyboard.press('c');

    expect(await getPrimaryEditorJSON(page)).toEqual({
      content: [
        {
          content: [
            {
              text: 'start of para # c',
              type: 'text',
            },
          ],
          type: 'paragraph',
        },
      ],
      type: 'doc',
    });
  });

  test('Illegal tag creation in heading', async () => {
    await sendCtrlABackspace(page);
    await page.keyboard.type('#');
    await page.keyboard.press('Space');

    await page.keyboard.type('#');
    await page.keyboard.type('#');
    await page.keyboard.type('bob');

    await sleep(10);
    expect(await getPrimaryEditorDebugString(page)).toEqual(
      `doc(heading("##bob"), paragraph)`,
    );
  });
});
