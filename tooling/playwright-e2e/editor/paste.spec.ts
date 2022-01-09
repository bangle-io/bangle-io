import { expect, Page, test } from '@playwright/test';

import {
  clearEditor,
  createNewNote,
  createWorkspace,
  ctrlKey,
  getEditorDebugString,
  getEditorLocator,
  sleep,
} from '../helpers';

test.beforeEach(async ({ page, baseURL }, testInfo) => {
  await page.goto(baseURL!, { waitUntil: 'networkidle' });
  let wsName = await createWorkspace(page);
  const noteName = 'my-mark-test-123';
  await createNewNote(page, wsName, noteName);
  await clearEditor(page, 0);
});

test.describe.parallel('Italics markdown shortcut', () => {
  test('typing _ triggers italics', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    const z = await page.evaluate(async (text) => {
      await navigator.clipboard.writeText(text);
      const clipText = await navigator.clipboard.readText();

      return clipText;
    }, '123');
    await getEditorLocator(page, 0, { focus: true });

    await page.keyboard.press('Meta+v');
    await page.pause();
    console.log({ z });
  });
});
