import { expect } from '@playwright/test';

import { PRIMARY_EDITOR_INDEX } from '@bangle.io/constants';

import { withBangle as test } from '../fixture-with-bangle';
import {
  clearEditor,
  createNewNote,
  createWorkspace,
  getEditorJSON,
  isDarwin,
  sleep,
} from '../helpers';

test.beforeEach(async ({ page, bangleApp }) => {
  await bangleApp.open();
  const wsName = await createWorkspace(page);
  await createNewNote(page, wsName, 'test123');
  await clearEditor(page, PRIMARY_EDITOR_INDEX);
});

test.describe('creating node above or below', () => {
  test('above a paragraph', async ({ page }) => {
    await page.keyboard.type('### Hello world!', { delay: 10 });
    await page.keyboard.press('Enter');
    await sleep();
    await page.keyboard.type('I am a para!', { delay: 10 });

    if (isDarwin) {
      await page.keyboard.press('Shift+Meta+Enter');
    } else {
      await page.keyboard.press('Shift+Control+Enter');
    }

    await page.keyboard.type('para above!', { delay: 10 });

    expect(await getEditorJSON(page, PRIMARY_EDITOR_INDEX)).toEqual({
      content: [
        {
          attrs: {
            collapseContent: null,
            level: 3,
          },
          content: [
            {
              text: 'Hello world!',
              type: 'text',
            },
          ],
          type: 'heading',
        },
        {
          content: [
            {
              text: 'para above!',
              type: 'text',
            },
          ],
          type: 'paragraph',
        },
        {
          content: [
            {
              text: 'I am a para!',
              type: 'text',
            },
          ],
          type: 'paragraph',
        },
        {
          type: 'paragraph',
        },
      ],
      type: 'doc',
    });
  });

  test('below a paragraph', async ({ page }) => {
    await page.keyboard.type('### Hello world!', { delay: 10 });
    await page.keyboard.press('Enter');
    await page.keyboard.type('I am a para!', { delay: 10 });

    if (isDarwin) {
      await page.keyboard.press('Meta+Enter');
    } else {
      await page.keyboard.press('Control+Enter');
    }

    await page.keyboard.type('para below!', { delay: 10 });

    expect(await getEditorJSON(page, PRIMARY_EDITOR_INDEX)).toEqual({
      content: [
        {
          attrs: {
            collapseContent: null,
            level: 3,
          },
          content: [
            {
              text: 'Hello world!',
              type: 'text',
            },
          ],
          type: 'heading',
        },
        {
          content: [
            {
              text: 'I am a para!',
              type: 'text',
            },
          ],
          type: 'paragraph',
        },
        {
          content: [
            {
              text: 'para below!',
              type: 'text',
            },
          ],
          type: 'paragraph',
        },
        {
          type: 'paragraph',
        },
      ],
      type: 'doc',
    });
  });

  test('above a heading', async ({ page }) => {
    await page.keyboard.type('### Hello world!', { delay: 10 });

    if (isDarwin) {
      await page.keyboard.press('Shift+Meta+Enter');
    } else {
      await page.keyboard.press('Shift+Control+Enter');
    }

    await page.keyboard.type('para above!', { delay: 10 });

    expect(await getEditorJSON(page, PRIMARY_EDITOR_INDEX)).toEqual({
      content: [
        {
          content: [
            {
              text: 'para above!',
              type: 'text',
            },
          ],
          type: 'paragraph',
        },
        {
          attrs: {
            collapseContent: null,
            level: 3,
          },
          content: [
            {
              text: 'Hello world!',
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

  test('below a heading', async ({ page }) => {
    await page.keyboard.type('### Hello world!', { delay: 10 });

    if (isDarwin) {
      await page.keyboard.press('Meta+Enter');
    } else {
      await page.keyboard.press('Control+Enter');
    }

    await page.keyboard.type('para below!', { delay: 10 });

    expect(await getEditorJSON(page, PRIMARY_EDITOR_INDEX)).toEqual({
      content: [
        {
          attrs: {
            collapseContent: null,
            level: 3,
          },
          content: [
            {
              text: 'Hello world!',
              type: 'text',
            },
          ],
          type: 'heading',
        },
        {
          content: [
            {
              text: 'para below!',
              type: 'text',
            },
          ],
          type: 'paragraph',
        },
        {
          type: 'paragraph',
        },
      ],
      type: 'doc',
    });
  });

  test('above a list', async ({ page }) => {
    await page.keyboard.type('- Hello world!', { delay: 10 });

    if (isDarwin) {
      await page.keyboard.press('Shift+Meta+Enter');
    } else {
      await page.keyboard.press('Shift+Control+Enter');
    }

    await page.keyboard.type('list item above', { delay: 10 });

    expect(await getEditorJSON(page, PRIMARY_EDITOR_INDEX)).toEqual({
      content: [
        {
          attrs: {
            tight: false,
          },
          content: [
            {
              attrs: {
                todoChecked: null,
              },
              content: [
                {
                  content: [
                    {
                      text: 'list item above',
                      type: 'text',
                    },
                  ],
                  type: 'paragraph',
                },
              ],
              type: 'listItem',
            },
            {
              attrs: {
                todoChecked: null,
              },
              content: [
                {
                  content: [
                    {
                      text: 'Hello world!',
                      type: 'text',
                    },
                  ],
                  type: 'paragraph',
                },
              ],
              type: 'listItem',
            },
          ],
          type: 'bulletList',
        },
        {
          type: 'paragraph',
        },
      ],
      type: 'doc',
    });
  });

  test('below a list', async ({ page }) => {
    await page.keyboard.type('- Hello world!', { delay: 10 });

    if (isDarwin) {
      await page.keyboard.press('Meta+Enter');
    } else {
      await page.keyboard.press('Control+Enter');
    }

    await page.keyboard.type('list item below', { delay: 10 });

    expect(await getEditorJSON(page, PRIMARY_EDITOR_INDEX)).toEqual({
      content: [
        {
          attrs: {
            tight: false,
          },
          content: [
            {
              attrs: {
                todoChecked: null,
              },
              content: [
                {
                  content: [
                    {
                      text: 'Hello world!',
                      type: 'text',
                    },
                  ],
                  type: 'paragraph',
                },
              ],
              type: 'listItem',
            },
            {
              attrs: {
                todoChecked: null,
              },
              content: [
                {
                  content: [
                    {
                      text: 'list item below',
                      type: 'text',
                    },
                  ],
                  type: 'paragraph',
                },
              ],
              type: 'listItem',
            },
          ],
          type: 'bulletList',
        },
        {
          type: 'paragraph',
        },
      ],
      type: 'doc',
    });
  });
});
