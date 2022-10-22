import { expect } from '@playwright/test';

import { SECONDARY_EDITOR_INDEX } from '@bangle.io/constants';

import { withBangle as test } from '../fixture-with-bangle';
import {
  createNewNote,
  createWorkspace,
  ctrlKey,
  getEditorLocator,
  runOperation,
  SELECTOR_TIMEOUT,
  sleep,
} from '../helpers';

test.beforeEach(async ({ bangleApp }, testInfo) => {
  await bangleApp.open();
});

test('split screen shortcut works', async ({ page }) => {
  const wsName = await createWorkspace(page);
  await createNewNote(page, wsName, 'test123');

  await page.keyboard.down(ctrlKey);
  await page.keyboard.press('\\');
  await page.keyboard.up(ctrlKey);
  await sleep();

  await getEditorLocator(page, SECONDARY_EDITOR_INDEX);
  expect(await page.$('.B-editor-container_editor-1')).not.toBeNull();
});

test('shows note sidebar correctly', async ({ page }) => {
  const wsName = await createWorkspace(page);

  await createNewNote(page, wsName, 'test123');

  await runOperation(
    page,
    'operation::@bangle.io/core-extension:NOTE_TOGGLE_SIDEBAR',
  );

  await page.waitForSelector('.B-ui-dhancha_note-sidebar', {
    timeout: 4 * SELECTOR_TIMEOUT,
  });

  expect(await page.$('.B-ui-dhancha_note-sidebar')).not.toBeNull();
});
