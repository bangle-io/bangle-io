import { expect, test } from '@playwright/test';

import {
  createNewNote,
  createWorkspace,
  ctrlKey,
  getEditorLocator,
  runOperation,
  SELECTOR_TIMEOUT,
  sleep,
} from '../helpers';

test.beforeEach(async ({ page, baseURL }, testInfo) => {
  await page.goto(baseURL!, { waitUntil: 'networkidle' });
});

test('split screen shortcut works', async ({ page }) => {
  const wsName = await createWorkspace(page);
  await createNewNote(page, wsName, 'test123');

  await page.keyboard.down(ctrlKey);
  await page.keyboard.press('\\');
  await page.keyboard.up(ctrlKey);
  await sleep();

  await getEditorLocator(page, 1);
  expect(await page.$('.editor-container_editor-1')).not.toBeNull();
});

test('shows note sidebar correctly', async ({ page }) => {
  const wsName = await createWorkspace(page);

  await createNewNote(page, wsName, 'test123');

  await runOperation(
    page,
    'operation::bangle-io-core-operations:NOTE_TOGGLE_SIDEBAR',
  );

  await page.waitForSelector('.ui-dhancha_note-sidebar', {
    timeout: 4 * SELECTOR_TIMEOUT,
  });

  expect(await page.$('.ui-dhancha_note-sidebar')).not.toBeNull();
});
