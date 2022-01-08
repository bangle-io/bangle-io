import { expect, Page, test } from '@playwright/test';

import {
  clearEditor,
  createNewNote,
  createWorkspace,
  getEditorDebugString,
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
  test('typing _ triggers italics', async ({ page }) => {
    await page.keyboard.type('Hello _world_!', { delay: 10 });
    expect(await getEditorDebugString(page, 0)).toBe(
      `doc(paragraph("Hello ", italic("world"), "!"))`,
    );
  });

  test('typing _ inside word does not trigger italics', async ({ page }) => {
    await page.keyboard.type('Hello w_orld_!', { delay: 10 });
    expect(await getEditorDebugString(page, 0)).toBe(
      `doc(paragraph("Hello w_orld_!"))`,
    );
  });

  test('typing * triggers italics', async ({ page }) => {
    await page.keyboard.type('Hello *world*!', { delay: 10 });
    expect(await getEditorDebugString(page, 0)).toBe(
      `doc(paragraph("Hello ", italic("world"), "!"))`,
    );
  });

  test('typing * inside word does not trigger italics', async ({ page }) => {
    await page.keyboard.type('Hello w*orld*!', { delay: 10 });
    expect(await getEditorDebugString(page, 0)).toBe(
      `doc(paragraph("Hello w*orld*!"))`,
    );
  });
});

test.describe.parallel('link', () => {
  test('typing a link should convert to a link mark', async ({ page }) => {
    await page.keyboard.type('Hello google.com ', { delay: 10 });
    expect(await getEditorDebugString(page, 0)).toBe(
      `doc(paragraph("Hello ", link("google.com"), " "))`,
    );
  });

  test('typing a link inside backlink should not convert to a link mark', async ({
    page,
  }) => {
    await page.keyboard.type('Hello [[', { delay: 15 });
    // triggering [[ is slow
    await sleep();
    await page.keyboard.type('google.com ', { delay: 15 });
    expect(await getEditorDebugString(page, 0)).toBe(
      `doc(paragraph("Hello ", @bangle.io/inline-backlink:paletteMark("[[google.com ")))`,
    );
  });
});
