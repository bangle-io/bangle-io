import { expect } from '@playwright/test';

import { PRIMARY_EDITOR_INDEX } from '@bangle.io/constants';

import { withBangle as test } from '../fixture-with-bangle';
import {
  clearEditor,
  createNewNote,
  createWorkspace,
  runOperation,
  waitForEditorFocus,
} from '../helpers';

test.beforeEach(async ({ bangleApp }, testInfo) => {
  await bangleApp.open();
});

test('shows note sidebar correctly', async ({ page }) => {
  const wsName = await createWorkspace(page);

  await createNewNote(page, wsName, 'test123');
  await waitForEditorFocus(page, PRIMARY_EDITOR_INDEX);

  await clearEditor(page, PRIMARY_EDITOR_INDEX);
  await page.keyboard.type('## top heading');
  await page.keyboard.press('Enter');
  await page.keyboard.type('### child heading');
  await page.keyboard.press('Enter');

  await runOperation(
    page,
    'operation::@bangle.io/core-extension:NOTE_TOGGLE_SIDEBAR',
  );

  await expect(
    page.locator('.note-outline_container button[aria-label="top heading"]'),
  ).toContainText(/top heading/, { useInnerText: true });

  const result = await page
    .locator('.note-outline_container button')
    .allInnerTexts();

  expect(result).toEqual(['top heading', 'child heading']);
});
