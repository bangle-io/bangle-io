import { expect, test } from '@playwright/test';

import {
  clearEditor,
  createNewNote,
  createWorkspace,
  runOperation,
  waitForEditorFocus,
} from '../helpers';

test.beforeEach(async ({ page, baseURL }, testInfo) => {
  await page.goto(baseURL!, { waitUntil: 'networkidle' });
});

test('shows note sidebar correctly', async ({ page }) => {
  const wsName = await createWorkspace(page);

  await createNewNote(page, wsName, 'test123');
  await waitForEditorFocus(page, 0);

  await clearEditor(page, 0);
  await page.keyboard.type('## top heading');
  await page.keyboard.press('Enter');
  await page.keyboard.type('### child heading');
  await page.keyboard.press('Enter');

  await runOperation(
    page,
    'operation::@bangle.io/core-operations:NOTE_TOGGLE_SIDEBAR',
  );

  await expect(
    page.locator('.note-outline_container button[aria-label="top heading"]'),
  ).toContainText(/top heading/, { useInnerText: true });

  const result = await page
    .locator('.note-outline_container button')
    .allInnerTexts();

  expect(result).toEqual(['top heading', 'child heading']);
});
