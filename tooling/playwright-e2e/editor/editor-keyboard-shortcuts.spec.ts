import { expect, test } from '@playwright/test';

import {
  clearEditor,
  createNewNote,
  createWorkspace,
  getEditorJSON,
  isDarwin,
} from '../helpers';

test.beforeEach(async ({ page, baseURL }, testInfo) => {
  await page.goto(baseURL!, { waitUntil: 'networkidle' });
});

test.describe.parallel('editor keyboard shortcuts', () => {
  test.describe.parallel('creating node above or below', () => {
    test('creates paragraph above', async ({ page, baseURL }) => {
      const wsName = await createWorkspace(page);
      await createNewNote(page, wsName, 'test123');

      await clearEditor(page, 0);
      await page.keyboard.type('### Hello world!', { delay: 10 });
      await page.pause();
      await page.keyboard.press('Enter');
      await page.keyboard.type('I am a para!', { delay: 10 });

      if (isDarwin) {
        await page.keyboard.press('Shift+Meta+Enter');
      } else {
        await page.keyboard.press('Shift+Control+Enter');
      }

      await page.keyboard.type('para above!', { delay: 10 });

      expect(await getEditorJSON(page, 0)).toEqual({
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

    test('creates paragraph below', async ({ page, baseURL }) => {
      const wsName = await createWorkspace(page);
      await createNewNote(page, wsName, 'test123');

      await clearEditor(page, 0);
      await page.keyboard.type('### Hello world!', { delay: 10 });
      await page.pause();
      await page.keyboard.press('Enter');
      await page.keyboard.type('I am a para!', { delay: 10 });

      if (isDarwin) {
        await page.keyboard.press('Meta+Enter');
      } else {
        await page.keyboard.press('Control+Enter');
      }

      await page.keyboard.type('para below!', { delay: 10 });

      expect(await getEditorJSON(page, 0)).toEqual({
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
  });
});
