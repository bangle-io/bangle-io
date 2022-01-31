import { expect, Page, test } from '@playwright/test';

import {
  clearEditor,
  createNewNote,
  createWorkspace,
  getEditorDebugString,
  getEditorHTML,
  getEditorJSON,
  getEditorLocator,
  longSleep,
  SELECTOR_TIMEOUT,
  sleep,
} from '../helpers';

test.beforeEach(async ({ page, baseURL }, testInfo) => {
  await page.goto(baseURL!, { waitUntil: 'networkidle' });
});

test('Is able to search for a note', async ({ page }) => {
  const wsName = await createWorkspace(page);
  await createNewNote(page, wsName, 'test-one');

  await getEditorLocator(page, 0, { focus: true });

  await page.keyboard.press('Enter');
  await page.keyboard.type('i am a lovely planet from outer galaxy', {
    delay: 20,
  });

  await createNewNote(page, wsName, 'test-two');

  await getEditorLocator(page, 0, { focus: true });

  await page.keyboard.press('Enter');
  await page.keyboard.type(
    'here galaxies are a collection of stars held together by gravity',
    { delay: 20 },
  );

  await sleep();

  await page.click('button[aria-label^="Search notes"]');

  const searchInput = page.locator('input[aria-label="Search"]');

  await searchInput.type('galaxy', { delay: 10 });

  const searchResultLocator = page.locator(
    'div[data-id^="search-notes-result-"]',
  );
  await searchResultLocator.first().waitFor();

  let noteMatches = await searchResultLocator.allInnerTexts();
  expect(noteMatches.length).toBe(1);
  expect(noteMatches[0]?.includes('test-one')).toBe(true);

  await page.click('button[aria-label="Clear search"]');

  expect(await searchInput.evaluate((node: any) => node.value)).toBe('');

  await searchInput.type('galax', { delay: 10 });
  expect(await searchInput.evaluate((node: any) => node.value)).toBe('galax');

  // the input debounce slows us down
  await longSleep(300);

  await searchResultLocator.first().waitFor();

  noteMatches = await searchResultLocator.allInnerTexts();

  expect(noteMatches.length).toBe(2);
  expect(noteMatches).toEqual(['test-one\n1', 'test-two\n1']);

  // highlights in editor
  expect(
    countOcurrences(
      await getEditorHTML(await getEditorLocator(page, 0)),
      'bangle-search-match',
    ),
  ).toBe(1);
});

function countOcurrences(string: string, match: string) {
  return string.split(match).length - 1;
}
