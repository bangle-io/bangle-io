import { expect } from '@playwright/test';
import path from 'path';

import { PRIMARY_EDITOR_INDEX } from '@bangle.io/constants';

import { withBangle as test } from '../fixture-with-bangle';
import {
  clearEditor,
  createNewNote,
  createWorkspace,
  getEditorDebugString,
  getEditorLocator,
  longSleep,
  sleep,
  waitForEditorTextToContain,
} from '../helpers';

test.beforeEach(async ({ bangleApp }, testInfo) => {
  await bangleApp.open();
});

test('should work in safari', async ({ page, baseURL }) => {
  const handle = await getEditorLocator(page, PRIMARY_EDITOR_INDEX);

  await waitForEditorTextToContain(page, PRIMARY_EDITOR_INDEX, 'short guide');
  const result = await handle.evaluate((node: any) => node.innerText);
  expect(result).toMatchSnapshot('landing page');
});

// eslint-disable-next-line jest/no-disabled-tests
test.skip('writing tag', async ({ page }) => {
  let wsName = await createWorkspace(page);
  await createNewNote(page, wsName, 'test-one');
  await clearEditor(page, PRIMARY_EDITOR_INDEX);
  await sleep();

  await page.keyboard.press('Enter');
  await page.keyboard.type('#yellow');

  await longSleep();

  expect(await getEditorDebugString(page, PRIMARY_EDITOR_INDEX)).toContain(
    `doc(paragraph, paragraph(__bangle__io__note__tags__palette_mark("#yellow")`,
  );
});
