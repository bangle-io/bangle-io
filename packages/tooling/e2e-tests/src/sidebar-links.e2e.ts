import { expect, test } from '@playwright/test';
import { createBrowserWorkspace } from './common';

const CHANGELOG_URL =
  'https://github.com/bangle-io/bangle-io/blob/main/CHANGELOG.md';

// The footer menu's Links section is the app's only route to the changelog, so
// assert the entry exists and points at it. GitHub is stubbed rather than
// fetched: it keeps the test off the network, and it makes the popup commit its
// navigation immediately instead of racing `about:blank`.
test('the sidebar footer links to the changelog', async ({ page }) => {
  await page.context().route(CHANGELOG_URL, (route) =>
    route.fulfill({
      body: '<title>stub changelog</title>',
      contentType: 'text/html',
    }),
  );

  await createBrowserWorkspace(page, { workspaceName: 'sidebar-links-ws' });

  await page.getByRole('button', { name: /Bangle\.io/ }).click();

  const whatsNew = page.getByRole('menuitem', { name: "What's New" });
  await expect(whatsNew).toBeVisible();

  const popupPromise = page.context().waitForEvent('page');
  await whatsNew.click();
  const popup = await popupPromise;
  await popup.waitForLoadState('domcontentloaded');

  expect(popup.url()).toBe(CHANGELOG_URL);
  await popup.close();
});
