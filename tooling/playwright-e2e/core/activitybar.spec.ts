/* eslint-disable testing-library/no-await-sync-query */
/* eslint-disable testing-library/prefer-screen-queries */
import { expect } from '@playwright/test';

import { PRIMARY_EDITOR_INDEX } from '@bangle.io/constants';

import { withBangle as test } from '../fixture-with-bangle';
import {
  getEditorDebugString,
  getPrimaryEditorDebugString,
  getPrimaryEditorHandler,
  isDarwin,
  runOperation,
  SELECTOR_TIMEOUT,
  sleep,
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
      page.locator('[data-testid="app-workspace-sidebar_workspace-sidebar"]'),
    ).toContainText('Note browser');

    await page.locator('[aria-label="Hide Note browser"]').click();

    await expect
      .poll(() => getPrimaryEditorDebugString(page))
      .toContain('Hello');
  });

  test('edit button works', async ({ page }) => {
    let activityBar = page.locator('.B-ui-dhancha_activitybar');

    await activityBar.waitFor();
    // by default on chrome editing is enabled
    const done = await activityBar.getByRole('button', {
      name: 'done editing',
    });

    await test.step('clicking on done works', async () => {
      await expect(done).toContainText(/done/i);
      await done.click();
    });

    const edit = await activityBar.getByRole('button', {
      name: 'edit',
    });

    await test.step('clicking edit should make the document typables', async () => {
      await expect(edit).toContainText(/edit/i);

      await edit.click();
      await done.waitFor();

      await expect(done).toContainText(/done/i);
      expect(
        await page.evaluate(
          async ([editorId]) => {
            return _nsmE2e?.getEditorDetailsById(editorId)?.editor.view
              .editable;
          },
          [PRIMARY_EDITOR_INDEX] as const,
        ),
      ).toBe(true);

      await sleep(100);

      await getPrimaryEditorHandler(page, {
        focus: true,
      });

      await sleep(50);

      // clicking edit should focus editor
      await page.keyboard.type('manthanoy', { delay: 30 });

      let primaryText = await getEditorDebugString(page, PRIMARY_EDITOR_INDEX);
      expect(primaryText).toMatch(/manthanoy/);
    });

    await test.step('clicking done should prevent any editing', async () => {
      await done.click();
      await edit.waitFor();

      await page.keyboard.type('sugar', { delay: 30 });

      let primaryText = await getEditorDebugString(page, PRIMARY_EDITOR_INDEX);
      expect(primaryText?.includes('sugar')).toBe(false);
    });
  });
});

test('edit button works in desktop', async ({ page }) => {
  await runOperation(
    page,
    'operation::@bangle.io/core-extension:toggle-editing-mode',
  );

  const done = await page.getByLabel('enable editing');

  await done.waitFor();

  await expect(done).toContainText(/enable editing/i);
  await done.click();

  await getPrimaryEditorHandler(page, {
    focus: true,
  });

  await page.keyboard.type('sugar', { delay: 30 });

  let primaryText = await getEditorDebugString(page, PRIMARY_EDITOR_INDEX);
  expect(primaryText?.includes('sugar')).toBe(true);
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
