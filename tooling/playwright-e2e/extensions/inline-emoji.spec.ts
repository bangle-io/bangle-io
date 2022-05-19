import { expect, test } from '@playwright/test';

import {
  clearEditor,
  createNewNote,
  createWorkspace,
  getEditorDebugString,
  getEditorHTML,
  longSleep,
  sleep,
} from '../helpers';

test.beforeEach(async ({ page, baseURL }, testInfo) => {
  await page.goto(baseURL!, { waitUntil: 'networkidle' });
});

test.describe('emoji', () => {
  test('Emoji works in heading', async ({ page }) => {
    const wsName = await createWorkspace(page);

    await createNewNote(page, wsName, 'test123');
    await longSleep();

    const editorHandle = page.locator('.bangle-editor');
    await clearEditor(page, 0);
    await sleep();
    await editorHandle.type('# Wow :', { delay: 3 });
    await editorHandle.press('ArrowDown');
    await editorHandle.press('Enter');

    const html = await getEditorHTML(editorHandle);

    expect(html.includes('😉')).toBe(true);

    expect(await getEditorDebugString(page, 0)).toMatchSnapshot(
      'emonji in headings',
    );
  });

  test('Emoji works in para', async ({ page }) => {
    const wsName = await createWorkspace(page);

    await createNewNote(page, wsName, 'test123');

    const editorHandle = page.locator('.bangle-editor');

    await clearEditor(page, 0);

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

    await clearEditor(page, 0);

    await editorHandle.type('- I am a list :zeb', { delay: 1 });
    await editorHandle.press('Enter');
    const html = await getEditorHTML(editorHandle);
    expect(html.includes('🦓')).toBe(true);
    expect(await getEditorHTML(editorHandle)).toMatchSnapshot('emoji in list');
  });
});
