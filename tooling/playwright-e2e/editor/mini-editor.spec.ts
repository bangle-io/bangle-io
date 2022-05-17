import { expect, test } from '@playwright/test';

import {
  createNewNote,
  createWorkspace,
  getEditorDebugString,
  runOperation,
  sleep,
} from '../helpers';

test.beforeEach(async ({ page, baseURL }, testInfo) => {
  await page.goto(baseURL!, { waitUntil: 'networkidle' });
});

const MINI_EDITOR_SELECTOR = '.B-editor-container_mini-editor';
test.describe.parallel('miniEditor', () => {
  test('shows and closes mini editor', async ({ page }) => {
    const wsName = await createWorkspace(page);
    await createNewNote(page, wsName, 'test123');

    await runOperation(
      page,
      'operation::@bangle.io/core-extension:OPEN_IN_MINI_EDITOR',
    );

    const locator = page.locator(MINI_EDITOR_SELECTOR);

    await locator.waitFor();

    expect(await page.$(MINI_EDITOR_SELECTOR)).not.toBeNull();

    expect(await locator.textContent()).toMatch('test123');

    await runOperation(
      page,
      'operation::@bangle.io/core-extension:CLOSE_MINI_EDITOR',
    );

    await expect
      .poll(async () => {
        return Boolean(await page.$(MINI_EDITOR_SELECTOR));
      })
      .toBe(false);
  });

  test('close button works', async ({ page }) => {
    const wsName = await createWorkspace(page);
    await createNewNote(page, wsName, 'test123');

    await runOperation(
      page,
      'operation::@bangle.io/core-extension:OPEN_IN_MINI_EDITOR',
    );

    const locator = page.locator(MINI_EDITOR_SELECTOR);

    await locator.waitFor();
    expect(await page.$(MINI_EDITOR_SELECTOR)).not.toBeNull();
    expect(await locator.textContent()).toMatch('test123');

    await locator.locator('[aria-label="Close"]').click();

    await expect
      .poll(async () => {
        return Boolean(await page.$(MINI_EDITOR_SELECTOR));
      })
      .toBe(false);
  });

  test('typing works', async ({ page }) => {
    const wsName = await createWorkspace(page);
    await createNewNote(page, wsName, 'test123');

    await runOperation(
      page,
      'operation::@bangle.io/core-extension:OPEN_IN_MINI_EDITOR',
    );

    const locator = page.locator(MINI_EDITOR_SELECTOR);

    await locator.waitFor();
    expect(await page.$(MINI_EDITOR_SELECTOR)).not.toBeNull();
    expect(await locator.textContent()).toMatch('test123');

    // make sure to type it in mini editor
    await locator.locator('.bangle-editor').type('AWESOME', { delay: 15 });

    await sleep();

    // check if text was updated in primary editor
    expect(await getEditorDebugString(page, 0)).toMatch('AWESOME');
  });

  test('expand button works', async ({ page }) => {
    const wsName = await createWorkspace(page);
    await createNewNote(page, wsName, 'note1.md');
    await runOperation(
      page,
      'operation::@bangle.io/core-extension:OPEN_IN_MINI_EDITOR',
    );

    const locator = page.locator(MINI_EDITOR_SELECTOR);
    await locator.waitFor();

    await createNewNote(page, wsName, 'note2.md');

    await expect(page).toHaveURL(new RegExp('note2'));

    expect(await locator.textContent()).toMatch('note1');

    // clicking on expand should open the note1 in primary
    await Promise.all([
      page.waitForNavigation(),
      locator.locator('[aria-label="Expand"]').click(),
    ]);

    await expect(page).toHaveURL(new RegExp('note1'));

    await expect
      .poll(async () => {
        return Boolean(await page.$(MINI_EDITOR_SELECTOR));
      })
      .toBe(false);
  });
});
