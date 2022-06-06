import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import {
  clearEditor,
  createNewNote,
  createWorkspace,
  getEditorDebugString,
  getEditorJSON,
  longSleep,
  sleep,
} from '../helpers';

let wsName: string;

test.beforeEach(async ({ page, baseURL }, testInfo) => {
  await page.goto(baseURL!, { waitUntil: 'networkidle' });

  wsName = await createWorkspace(page);
  await createNewNote(page, wsName, 'test-one');
  await clearEditor(page, 0);
  await sleep();
});

async function getTagsFromDoc(page: Page) {
  // A contrived way to search and get the tag object
  return (await getEditorJSON(page, 0)).content
    ?.flatMap((r: any) =>
      r.content?.flatMap((rr: any) => (rr.type === 'tag' ? rr : undefined)),
    )
    .filter(Boolean);
}

test('is able to create a tag using inline palette', async ({ page }) => {
  await page.keyboard.press('Enter');
  await page.keyboard.type('#yellow');

  await longSleep();

  expect(await getEditorDebugString(page, 0)).toContain(
    `doc(paragraph, paragraph(__bangle__io__note__tags__palette_mark("#yellow")`,
  );

  await page.keyboard.press('Enter');

  const tag = await getTagsFromDoc(page);

  expect(tag).toEqual([
    {
      attrs: {
        tagValue: 'yellow',
      },
      type: 'tag',
    },
  ]);
});

test.describe('multiple keyboard cases', () => {
  test('is able to create a tag by typing and then pressing a space', async ({
    page,
  }) => {
    await page.keyboard.press('Enter');
    await page.keyboard.type('#mellow');

    await sleep(10);

    await page.keyboard.press('Space');

    const tag = await getTagsFromDoc(page);

    expect(tag).toEqual([
      {
        attrs: {
          tagValue: 'mellow',
        },
        type: 'tag',
      },
    ]);
  });

  test('Typing # followed by space allows heading 1', async ({ page }) => {
    await page.keyboard.type('#');

    await sleep(10);

    await page.keyboard.press('Space');

    await page.keyboard.type('bob');

    expect(await getEditorJSON(page, 0)).toEqual({
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

  test('Typing # twice followed by space allows heading 2', async ({
    page,
  }) => {
    await page.keyboard.type('#');
    await page.keyboard.type('#');

    await sleep(10);

    await page.keyboard.press('Space');

    await page.keyboard.type('bob');

    expect(await getEditorJSON(page, 0)).toEqual({
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

  test('Inside a paragraph typing # followed space', async ({ page }) => {
    await page.keyboard.type('start of para');
    await sleep(10);

    await page.keyboard.press('Space');

    await page.keyboard.type('#');

    await page.keyboard.press('Space');

    await page.keyboard.press('c');

    expect(await getEditorJSON(page, 0)).toEqual({
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

  test('Illegal tag creation in heading', async ({ page }) => {
    await page.keyboard.type('#');
    await page.keyboard.press('Space');

    await page.keyboard.type('#');
    await page.keyboard.type('#');
    await page.keyboard.type('bob');

    await sleep(10);
    expect(await getEditorDebugString(page, 0)).toEqual(
      `doc(heading("##bob"), paragraph)`,
    );
  });

  test('pressing / does not clear tag', async ({ page }) => {
    await page.keyboard.type('#');
    await page.keyboard.type('hello');
    await page.keyboard.type('/');
    await page.keyboard.type('world');
    await page.keyboard.press('Space');

    await sleep(10);
    expect(await getTagsFromDoc(page)).toEqual([
      {
        attrs: {
          tagValue: 'hello/world',
        },
        type: 'tag',
      },
    ]);
  });

  test('pressing . clears tag', async ({ page }) => {
    await page.keyboard.type('#');
    await page.keyboard.type('hello');
    await page.keyboard.type('.');
    await sleep(10);

    expect(await getTagsFromDoc(page)).toEqual([]);
    expect(await getEditorDebugString(page, 0)).toEqual(
      `doc(paragraph("#hello."))`,
    );
  });
});

test.describe('auto complete', () => {
  test('shows existing tags in auto complete', async ({ page }) => {
    await page.keyboard.type('#');
    await page.keyboard.type('hello', { delay: 3 });
    await page.keyboard.press('Space');
    await longSleep();

    // we are creating a new note because currently newly created
    // tags in the same page donot show up in auto complete
    await createNewNote(page, wsName, 'test-two');
    await clearEditor(page, 0);

    await sleep();

    await page.keyboard.type('#hel', { delay: 20 });

    await sleep();

    await page.locator('.tag-picker-inline-palette-item').first().waitFor();

    await page.waitForFunction(() => {
      const [firstItem, secondItem] = [
        ...document.querySelectorAll('.tag-picker-inline-palette-item'),
      ].map((n: any) => n.innerText);

      return firstItem === 'Create a tag "hel"' && secondItem === 'hello';
    });

    await page.keyboard.press('ArrowDown', { delay: 20 });
    await page.keyboard.press('Enter', { delay: 20 });

    expect(await getTagsFromDoc(page)).toEqual([
      {
        attrs: {
          tagValue: 'hello',
        },

        type: 'tag',
      },
    ]);
  });
});
