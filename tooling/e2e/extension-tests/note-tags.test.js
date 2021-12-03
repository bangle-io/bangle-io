const {
  url,
  createNewNote,
  createWorkspace,
  sleep,
  SELECTOR_TIMEOUT,
  newPage,
  getPrimaryEditorDebugString,
  getPrimaryEditorJSON,
  clearPrimaryEditor,
  longSleep,
} = require('../helpers');

jest.setTimeout(155 * 1000);
jest.retryTimes(2);

let page, destroyPage, wsName;

beforeEach(async () => {
  ({ page, destroyPage } = await newPage(browser, { widescreen: true }));

  await page.goto(url, { waitUntil: 'networkidle2' });
  await page.evaluate(() => localStorage.clear());
  await page.goto(url, { waitUntil: 'networkidle2' });
  wsName = await createWorkspace(page);
  await createNewNote(page, wsName, 'test-one');

  await clearPrimaryEditor(page);
  await sleep();
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
  await page.keyboard.press('Enter');
  await page.keyboard.type('#yellow');

  await longSleep();

  expect(await getPrimaryEditorDebugString(page)).toContain(
    `doc(paragraph, paragraph(bangle-io-note-tags-paletteMark("#yellow")`,
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

  test('pressing / does not clear tag', async () => {
    await page.keyboard.type('#');
    await page.keyboard.type('hello');
    await page.keyboard.type('/');
    await page.keyboard.type('world');
    await page.keyboard.press('Space');

    await sleep(10);
    expect(await getTagsFromDoc()).toEqual([
      {
        attrs: {
          tagValue: 'hello/world',
        },
        type: 'tag',
      },
    ]);
  });

  test('pressing . clears tag', async () => {
    await page.keyboard.type('#');
    await page.keyboard.type('hello');
    await page.keyboard.type('.');
    await sleep(10);

    expect(await getTagsFromDoc()).toEqual([]);
    expect(await getPrimaryEditorDebugString(page)).toEqual(
      `doc(paragraph("#hello."))`,
    );
  });
});

describe('auto complete', () => {
  test('shows existing tags in auto complete', async () => {
    await page.keyboard.type('#');
    await page.keyboard.type('hello', { delay: 3 });
    await page.keyboard.press('Space');

    // we are creating a new note because currently newly created
    // tags in the same page donot show up in auto complete
    await createNewNote(page, wsName, 'test-two');
    await clearPrimaryEditor(page);
    await sleep();

    await page.keyboard.type('#hel', { delay: 20 });

    await page.waitForSelector('.tag-picker-inline-palette-item', {
      timeout: SELECTOR_TIMEOUT,
    });

    await page.waitForFunction(
      () => {
        const [firstItem, secondItem] = [
          ...document.querySelectorAll('.tag-picker-inline-palette-item'),
        ].map((n) => n.innerText);

        return firstItem === 'Create a tag "hel"' && secondItem === 'hello';
      },
      {
        timeout: SELECTOR_TIMEOUT,
      },
    );

    await page.keyboard.press('ArrowDown', { delay: 20 });
    await page.keyboard.press('Enter', { delay: 20 });

    expect(await getTagsFromDoc()).toEqual([
      {
        attrs: {
          tagValue: 'hello',
        },

        type: 'tag',
      },
    ]);
  });
});
