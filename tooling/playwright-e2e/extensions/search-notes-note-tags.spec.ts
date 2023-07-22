import { expect } from '@playwright/test';

import { PRIMARY_EDITOR_INDEX } from '@bangle.io/constants';

import { withBangle as test } from '../fixture-with-bangle';
import {
  createNewNote,
  createWorkspace,
  getEditorLocator,
  SELECTOR_TIMEOUT,
  sleep,
  waitForEditorFocus,
} from '../helpers';

test.beforeEach(async ({ page, bangleApp }, testInfo) => {
  await bangleApp.open();

  const wsName = await createWorkspace(page);

  await createNewNote(page, wsName, 'test-one');
  await waitForEditorFocus(page, PRIMARY_EDITOR_INDEX);

  await page.keyboard.press('Enter');
  await page.keyboard.type(
    'i am a lovely planet from outer galaxy #cosmic #space .',
    { delay: 20 },
  );

  await sleep();

  // creating new note because the data typed above might not have been flushed to disk
  // resulting in 0 search results
  await createNewNote(page, wsName, 'test-two');

  await getEditorLocator(page, PRIMARY_EDITOR_INDEX, { focus: true });
});

test('Is able to search note tags', async ({ page }) => {
  await page.click('button[aria-label^="Search notes"]');

  await page.locator('input[aria-label="Search"]').type('tag:cosmic', {
    delay: 10,
  });

  await page
    .locator(
      '.B-search-notes_search-notes .B-search-notes_search-result-note-match',
    )
    .waitFor();
  await page.locator('div[data-id^="search-notes-result-"]').first().waitFor();

  let noteMatches = await page
    .locator('div[data-id^="search-notes-result-"]')
    .allInnerTexts();

  expect(noteMatches.length).toBe(1);
  expect(noteMatches).toEqual(['test-one\n1']);

  await sleep(100);
  expect(await page.screenshot()).toMatchSnapshot({
    maxDiffPixels: 20,
  });
});

test('clicking on a note tag in editor searches for it', async ({ page }) => {
  await page.keyboard.type(' #cosmic .', { delay: 10 });
  await sleep();

  const tag = await page.waitForSelector('.B-note-tags_inline-note-tag', {
    timeout: 2 * SELECTOR_TIMEOUT,
  });

  expect(await page.screenshot()).toMatchSnapshot({
    maxDiffPixels: 20,
  });

  await tag.click();

  await page.waitForSelector('.B-search-notes_search-notes', {
    timeout: SELECTOR_TIMEOUT,
  });

  const searchInput = await page.waitForSelector('input[aria-label="Search"]', {
    timeout: SELECTOR_TIMEOUT,
  });

  expect(await searchInput.evaluate((node: any) => node.value)).toBe(
    'tag:cosmic',
  );

  await page.locator('div[data-id^="search-notes-result-"]').first().waitFor();

  let noteMatches = await page
    .locator('div[data-id^="search-notes-result-"]')
    .allInnerTexts();
  expect(noteMatches.length).toBe(2);
});
