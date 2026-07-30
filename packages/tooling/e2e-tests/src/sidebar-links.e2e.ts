import { expect, test } from '@playwright/test';
import { createBrowserWorkspace } from './common';

// The footer menu's Links section is the app's only route to the changelog, so
// assert the entry exists and points at it. The popup URL is checked without
// letting the tab load, keeping the test off the network.
test('the sidebar footer links to the changelog', async ({ page }) => {
  await createBrowserWorkspace(page, { workspaceName: 'sidebar-links-ws' });

  await page.getByRole('button', { name: /Bangle\.io/ }).click();

  const whatsNew = page.getByRole('menuitem', { name: "What's New" });
  await expect(whatsNew).toBeVisible();

  const popupPromise = page.context().waitForEvent('page');
  await whatsNew.click();
  const popup = await popupPromise;

  expect(popup.url()).toBe(
    'https://github.com/bangle-io/bangle-io/blob/main/CHANGELOG.md',
  );
  await popup.close();
});
