import { expect } from '@playwright/test';

import { PRIMARY_EDITOR_INDEX } from '@bangle.io/constants';

import { withBangle as test } from '../fixture-with-bangle';
import {
  clearEditor,
  createNewNote,
  createWorkspace,
  ctrlKey,
  getEditorHTML,
  getEditorLocator,
  getPrimaryEditorDebugString,
  longSleep,
  SELECTOR_TIMEOUT,
  sleep,
} from '../helpers';

test.beforeEach(async ({ bangleApp }, testInfo) => {
  await bangleApp.open();
});

test.describe('loading', () => {
  test('basic test', async ({ page, baseURL }) => {
    const title = await page.title();
    expect(title).toMatch('getting started.md - bangle.io');
  });

  test('Activity bar', async ({ page }) => {
    const handle = await page.$('[data-testid="app-activitybar_activitybar"]');
    expect(handle).not.toBe(null);
  });

  test('Main content exists', async ({ page }) => {
    const handle = await page.$('main');
    expect(handle).not.toBe(null);
  });

  test('shows file palette', async ({ page }) => {
    let handle = await page.$('.B-ui-components_universal-palette-container');
    expect(handle).toBe(null);

    await page.keyboard.down(ctrlKey);
    await page.keyboard.press('p');
    await page.keyboard.up(ctrlKey);

    const locator = page.locator(
      '.B-ui-components_universal-palette-container',
    );

    expect(await locator.textContent()).toMatch('NavigateEnter');
  });

  test('shows operation palette', async ({ page }) => {
    await page.keyboard.down(ctrlKey);
    await page.keyboard.down('Shift');
    await page.keyboard.press('P');
    await page.keyboard.up('Shift');
    await page.keyboard.up(ctrlKey);

    let handle = await page.waitForSelector(
      '.B-ui-components_universal-palette-container',
      {
        timeout: 2 * SELECTOR_TIMEOUT,
      },
    );
    expect(handle).not.toBe(null);
    expect(
      (
        await page.$$eval('.B-ui-components_universal-palette-item', (nodes) =>
          nodes.map((n) => n.getAttribute('data-id')),
        )
      ).includes('operation::@bangle.io/core-extension:TOGGLE_UI_COLOR_SCHEME'),
    ).toBe(true);
  });

  test('create a new page saved in browser', async ({ page }) => {
    const newFileName = 'new_file';
    const wsName = await createWorkspace(page);
    await createNewNote(page, wsName, newFileName);

    const editorHandle = await page.waitForSelector('.bangle-editor', {
      timeout: SELECTOR_TIMEOUT,
    });
    await clearEditor(page, PRIMARY_EDITOR_INDEX);

    await sleep();

    await editorHandle.type('# Wow', { delay: 10 });
    await editorHandle.press('Enter', { delay: 20 });
    await editorHandle.type('[ ] list', { delay: 10 });

    await sleep();

    expect(await getPrimaryEditorDebugString(editorHandle)).toMatchSnapshot({
      name: 'create a new page saved in browser',
    });
  });

  test('inline action palette convert to bullet list', async ({ page }) => {
    const newFileName = 'new_file';
    const wsName = await createWorkspace(page);

    await createNewNote(page, wsName, newFileName);

    const editorLocator = await getEditorLocator(page, PRIMARY_EDITOR_INDEX);

    const hasOneUnorderedListElement = () =>
      editorLocator.evaluate(
        (node) => node.querySelectorAll('ul').length === 1,
      );

    await clearEditor(page, PRIMARY_EDITOR_INDEX);
    expect(await hasOneUnorderedListElement()).toBe(false);

    await editorLocator.type('/bullet list', { delay: 3 });
    await page.keyboard.press('Enter');
    await sleep(30);
    expect(await hasOneUnorderedListElement()).toBe(true);
    await editorLocator.type('I should a bullet list', { delay: 1 });
    expect(await getEditorHTML(editorLocator)).toMatchSnapshot({
      name: 'inline action palette convert to bullet list',
    });
  });

  test('inline action palette convert to heading 3', async ({ page }) => {
    const newFileName = 'new_file';
    const wsName = await createWorkspace(page);

    await createNewNote(page, wsName, newFileName);

    const editorLocator = await getEditorLocator(page, PRIMARY_EDITOR_INDEX);

    const hasOneH3Element = () =>
      editorLocator.evaluate(
        (node) => node.querySelectorAll('h3').length === 1,
      );

    await clearEditor(page, PRIMARY_EDITOR_INDEX);

    expect(await hasOneH3Element()).toBe(false);

    await editorLocator.type('/h3', { delay: 10 });
    await sleep();
    await page.keyboard.press('Enter');
    await longSleep();

    expect(await hasOneH3Element()).toBe(true);
    await editorLocator.type('I am a heading', { delay: 1 });
    expect(await getEditorHTML(editorLocator)).toContain('I am a heading');
  });
});
