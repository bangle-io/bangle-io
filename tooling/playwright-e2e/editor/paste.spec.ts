import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { PRIMARY_EDITOR_INDEX } from '@bangle.io/constants';

import { withBangle as test } from '../fixture-with-bangle';
import {
  clearEditor,
  createNewNote,
  createWorkspace,
  getEditorDebugString,
  getEditorJSON,
  getEditorLocator,
} from '../helpers';

test.beforeEach(async ({ page, bangleApp }, testInfo) => {
  await bangleApp.open();
  let wsName = await createWorkspace(page);
  const noteName = 'my-mark-test-123';
  await createNewNote(page, wsName, noteName);
  await clearEditor(page, PRIMARY_EDITOR_INDEX);
  await getEditorLocator(page, PRIMARY_EDITOR_INDEX, { focus: true });
});

const pasteSliceJson = async (page: Page, sliceJson: object) => {
  await page.evaluate(async (sliceJson) => {
    const e2e = window._nsmE2e;

    if (!e2e) {
      throw new Error('e2e not found');
    }

    e2e.sliceManualPaste(
      e2e.primaryEditor!.view,
      e2e.EditorSlice.fromJSON(e2e.primaryEditor!.view.state.schema, sliceJson),
    );
  }, sliceJson);
};

test.describe('Pasting rich test', () => {
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
    expect(await getEditorDebugString(page, PRIMARY_EDITOR_INDEX)).toEqual(
      `doc(heading("Hello"), paragraph)`,
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
    expect(await getEditorDebugString(page, PRIMARY_EDITOR_INDEX)).toEqual(
      `doc(paragraph("Hello"))`,
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

    expect(await getEditorDebugString(page, PRIMARY_EDITOR_INDEX)).toEqual(
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

    expect(await getEditorJSON(page, PRIMARY_EDITOR_INDEX)).toEqual({
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

    expect(await getEditorJSON(page, PRIMARY_EDITOR_INDEX)).toEqual({
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
