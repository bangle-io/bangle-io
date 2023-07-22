/* eslint-disable no-loop-func */
import { expect } from '@playwright/test';

import { withBangle as test } from '../fixture-with-bangle';
import {
  createNewNote,
  createWorkspace,
  getPrimaryEditorHandler,
  mobileEnableEditing,
} from '../helpers';

for (const screenType of ['desktop', 'mobile']) {
  const isMobile = screenType === 'mobile';
  test.describe(screenType + ' editor issue', () => {
    test.beforeEach(async ({ page, bangleApp }, testInfo) => {
      if (isMobile) {
        await page.setViewportSize({ width: 480, height: 960 });
      }

      await bangleApp.open();
    });

    test('displays editor issue correctly', async ({ page }) => {
      const wsName1 = await createWorkspace(page);
      const wsPath1 = await createNewNote(page, wsName1, 'file-1', {
        // since editor is disabled by default in isMobile, we need to focus it
        skipWaitForFocus: isMobile,
      });

      if (isMobile) {
        await mobileEnableEditing(page);
        await getPrimaryEditorHandler(page, { focus: true });
      }

      // manually trigger an error
      await page.evaluate(
        async ([wsPath1]) => {
          // deleting a collab instance will cause current editor to crash
          _nsmE2e?.testRequestDeleteCollabInstance(wsPath1);
        },
        [wsPath1] as const,
      );

      await page.keyboard.type('1234', { delay: 14 });

      const editorIssue = page.locator(
        '[aria-label="Editor encountered an issue"]',
      );

      await expect(editorIssue).toContainText('Editor crashed');

      expect(await page.screenshot()).toMatchSnapshot({
        maxDiffPixels: 20,
      });

      await editorIssue.click();

      await page.waitForSelector('[role="alertdialog"]');

      await expect(page.locator('[role="alertdialog"] h2')).toHaveText(
        'Editor crashed!',
      );
    });
  });
}
