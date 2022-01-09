import { expect, Page, test } from '@playwright/test';

import {
  clearEditor,
  createNewNote,
  createWorkspace,
  getEditorDebugString,
  getEditorJSON,
  getEditorLocator,
} from '../helpers';

test.beforeEach(async ({ page, baseURL }, testInfo) => {
  await page.goto(baseURL!, { waitUntil: 'networkidle' });
  let wsName = await createWorkspace(page);
  const noteName = 'my-mark-test-123';
  await createNewNote(page, wsName, noteName);
  await clearEditor(page, 0);
  await getEditorLocator(page, 0, { focus: true });
});

const pasteSliceJson = async (page: Page, sliceJson: object) => {
  await page.evaluate(async (sliceJson) => {
    const h = (window as any)._e2eHelpers;
    h._sliceManualPaste(
      h._primaryEditor.view,
      h._EditorSlice.fromJSON(h._editorSchema, sliceJson),
    );
  }, sliceJson);
};

test.describe.parallel('Pasting rich test', () => {
  test('heading', async ({ page, context }) => {
    await pasteSliceJson(page, {
      content: [
        {
          type: 'heading',
          attrs: {
            level: 2,
          },
          content: [
            {
              type: 'text',
              text: 'Hello',
            },
          ],
        },
      ],
      openStart: 1,
      openEnd: 1,
    });
    expect(await getEditorDebugString(page, 0)).toEqual(
      `doc(heading(\"Hello\"), paragraph)`,
    );
  });

  test('paragraph', async ({ page, context }) => {
    await pasteSliceJson(page, {
      content: [
        {
          type: 'paragraph',
          attrs: {
            level: 2,
          },
          content: [
            {
              type: 'text',
              text: 'Hello',
            },
          ],
        },
      ],
      openStart: 1,
      openEnd: 1,
    });
    expect(await getEditorDebugString(page, 0)).toEqual(
      `doc(paragraph(\"Hello\"))`,
    );
  });

  test('todo list', async ({ page }) => {
    let sliceJson = {
      content: [
        {
          type: 'bulletList',
          attrs: {
            tight: false,
          },
          content: [
            {
              type: 'listItem',
              attrs: {
                todoChecked: false,
              },
              content: [
                {
                  type: 'paragraph',
                  content: [
                    {
                      type: 'text',
                      text: 'Test in the house',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
      openStart: 1,
      openEnd: 1,
    };

    await pasteSliceJson(page, sliceJson);

    expect(await getEditorDebugString(page, 0)).toEqual(
      'doc(bulletList(listItem(paragraph("Test in the house"))), paragraph)',
    );
  });

  test('todo list checked', async ({ page }) => {
    let sliceJson = {
      content: [
        {
          type: 'bulletList',
          attrs: {
            tight: false,
          },
          content: [
            {
              type: 'listItem',
              attrs: {
                todoChecked: true,
              },
              content: [
                {
                  type: 'paragraph',
                  content: [
                    {
                      type: 'text',
                      text: 'Test in the house',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
      openStart: 1,
      openEnd: 1,
    };

    await pasteSliceJson(page, sliceJson);

    expect(await getEditorJSON(page, 0)).toEqual({
      content: [
        {
          attrs: {
            tight: false,
          },
          content: [
            {
              attrs: {
                todoChecked: true,
              },
              content: [
                {
                  content: [
                    {
                      text: 'Test in the house',
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

  test('emoji', async ({ page }) => {
    const sliceJson = {
      content: [
        {
          type: 'heading',
          attrs: {
            level: 2,
            collapseContent: null,
          },
          content: [
            {
              type: 'text',
              text: 'Hello ',
            },
            {
              type: 'emoji',
              attrs: {
                emojiAlias: 'writing_hand',
              },
            },
          ],
        },
      ],
      openStart: 1,
      openEnd: 1,
    };

    await pasteSliceJson(page, sliceJson);

    expect(await getEditorJSON(page, 0)).toEqual({
      content: [
        {
          attrs: { collapseContent: null, level: 2 },
          content: [
            { text: 'Hello ', type: 'text' },
            { attrs: { emojiAlias: 'writing_hand' }, type: 'emoji' },
          ],
          type: 'heading',
        },
        { type: 'paragraph' },
      ],
      type: 'doc',
    });
  });
});
