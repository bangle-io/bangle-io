import { expect } from '@playwright/test';

import { PRIMARY_EDITOR_INDEX } from '@bangle.io/constants';

import { withBangle as test } from '../fixture-with-bangle';
import {
  clearEditor,
  createNewNote,
  createWorkspace,
  getEditorDebugString,
  getEditorHTML,
  sleep,
} from '../helpers';

test.beforeEach(async ({ bangleApp }, testInfo) => {
  await bangleApp.open();
});

test.describe('emoji', () => {
  test('Emoji works in heading', async ({ page }) => {
    const wsName = await createWorkspace(page);

    await createNewNote(page, wsName, 'test123');

    const editorHandle = page.locator('.bangle-editor');
    await clearEditor(page, PRIMARY_EDITOR_INDEX);
    await sleep();
    await editorHandle.type('# Wow :', { delay: 3 });
    await editorHandle.press('ArrowDown');
    await editorHandle.press('Enter');

    const html = await getEditorHTML(editorHandle);

    expect(html.includes('😉')).toBe(true);

    expect(
      await getEditorDebugString(page, PRIMARY_EDITOR_INDEX),
    ).toMatchSnapshot('emonji in headings');
  });

  test('Emoji works in para', async ({ page }) => {
    const wsName = await createWorkspace(page);

    await createNewNote(page, wsName, 'test123');

    const editorHandle = page.locator('.bangle-editor');

    await clearEditor(page, PRIMARY_EDITOR_INDEX);

    await editorHandle.type('life is good :zeb', { delay: 1 });
    await editorHandle.press('Enter');
    const html = await getEditorHTML(editorHandle);
    expect(html.includes('🦓')).toBe(true);
    expect(await getEditorHTML(editorHandle)).toMatchSnapshot('emoji in para');
  });

  test('Emoji works in list', async ({ page }) => {
    const wsName = await createWorkspace(page);

    await createNewNote(page, wsName, 'test123');

    const editorHandle = page.locator('.bangle-editor');

    await clearEditor(page, PRIMARY_EDITOR_INDEX);

    await editorHandle.type('- I am a list :zeb', { delay: 1 });
    await editorHandle.press('Enter');
    const html = await getEditorHTML(editorHandle);
    expect(html.includes('🦓')).toBe(true);
    expect(await getEditorHTML(editorHandle)).toMatchSnapshot('emoji in list');
  });
});
