import { expect } from '@playwright/test';

import { withBangle as test } from '../fixture-with-bangle';
import {
  getPrimaryEditorDebugString,
  isDarwin,
  SELECTOR_TIMEOUT,
} from '../helpers';

test.beforeEach(async ({ bangleApp }, testInfo) => {
  await bangleApp.open();
});

test('lists options', async ({ page }) => {
  await page.click('button[aria-label="options menu"]');

  let optionsHandle = await page.$('[aria-label^="options dropdown"]');
  expect(Boolean(optionsHandle)).toBe(true);

  expect(
    JSON.stringify(
      (
        await page
          .locator('[aria-label="options dropdown"] li[data-key]')
          .allInnerTexts()
      ).map((r) => r.split('⌘').join('Ctrl')),
    ),
  ).toEqual(
    JSON.stringify([
      'New note',
      'New workspace',
      isDarwin ? 'Switch workspace\nCtrlR' : 'Switch workspace\nCtrlH',
      'Switch Dark/Light theme',
      'Notes palette\nCtrlP',
      'Operation palette\nCtrl⇧P',
      'Whats new',
      'Report issue',
      'Twitter',
      'Discord',
    ]),
  );
});

test.describe('mobile', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 480, height: 960 });
  });

  test('lists options in mobile', async ({ page }) => {
    await page.click('button[aria-label="options menu"]');

    let optionsHandle = await page.$('[aria-label^="options dropdown"]');
    expect(Boolean(optionsHandle)).toBe(true);

    expect(
      JSON.stringify(
        await page
          .locator('[aria-label="options dropdown"] li[data-key]')
          .allInnerTexts(),
      ),
    ).toEqual(
      JSON.stringify([
        'New note',
        'New workspace',
        'Switch workspace',
        'Note browser',
        'Search notes',
        'Switch Dark/Light theme',
        'Notes palette',
        'Operation palette',
        'Whats new',
        'Report issue',
        'Twitter',
        'Discord',
      ]),
    );
  });

  test('clicking on Note browser works', async ({ page }) => {
    await page.click('button[aria-label="options menu"]');

    await page.locator('[aria-label="Note browser"]').click();

    await expect(
      page.locator('.B-workspace-sidebar_workspace-sidebar '),
    ).toContainText('Note browser');

    await page.locator('[aria-label="hide Note browser"]').click();

    await expect
      .poll(() => getPrimaryEditorDebugString(page))
      .toContain('Hello');
  });
});

test('clicking on new workspace', async ({ page }) => {
  await page.click('button[aria-label="options menu"]');

  await page.click(
    '[aria-label="options dropdown"] li[data-key="NewWorkspace"]',
  );

  await page.waitForSelector('.B-ui-components_dialog-content-container', {
    timeout: SELECTOR_TIMEOUT,
  });
  expect(Boolean(await page.$('text=Choose a storage type'))).toBe(true);
});
