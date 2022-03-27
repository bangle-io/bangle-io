import { expect, test } from '@playwright/test';

import { isDarwin, SELECTOR_TIMEOUT } from '../helpers';

test.beforeEach(async ({ page, baseURL }, testInfo) => {
  await page.goto(baseURL!, { waitUntil: 'networkidle' });
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
      'Toggle dark theme',
      'Notes palette\nCtrlP',
      'Operation palette\nCtrl⇧P',
      'Report issue',
      'Twitter',
      'Discord',
    ]),
  );
});

test('clicking on new workspace', async ({ page }) => {
  await page.click('button[aria-label="options menu"]');

  await page.click(
    '[aria-label="options dropdown"] li[data-key="NewWorkspace"]',
  );

  await page.waitForSelector('.B-ui-components_modal-container', {
    timeout: SELECTOR_TIMEOUT,
  });
  expect(Boolean(await page.$('[aria-label="select storage type"]'))).toBe(
    true,
  );
});
