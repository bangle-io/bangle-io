import { expect, test } from '@playwright/test';
import { createBrowserWorkspace } from './common';

// Guards the app-shell macro layout: a full-height, edge-to-edge sidebar (the
// flush "sidebar" variant, not the old rounded floating card), a thin titlebar,
// and off-canvas collapse/expand that reclaims the space for content. These are
// the load-bearing pieces of the shell that also drive the Electron desktop
// look, so a regression here is very visible to users.
test('app shell: full-height flush sidebar, thin titlebar, collapse/expand', async ({
  page,
}) => {
  await createBrowserWorkspace(page, { workspaceName: 'layout-ws' });

  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();
  const viewportHeight = viewport?.height ?? 0;

  // The sidebar must be the flush full-height variant, expanded by default.
  const sidebar = page.locator('[data-variant][data-side="left"]').first();
  await expect(sidebar).toHaveAttribute('data-variant', 'sidebar');
  await expect(sidebar).toHaveAttribute('data-state', 'expanded');

  // Its visible panel spans the whole window height and sits flush against the
  // top-left corner (no floating-card gap).
  const sidebarPanel = sidebar.locator('[data-sidebar="sidebar"]');
  const expandedBox = await sidebarPanel.boundingBox();
  expect(expandedBox).not.toBeNull();
  expect(expandedBox?.x ?? 99).toBeLessThanOrEqual(1);
  expect(expandedBox?.y ?? 99).toBeLessThanOrEqual(1);
  expect(expandedBox?.height ?? 0).toBeGreaterThanOrEqual(viewportHeight - 2);

  // The titlebar is thin.
  const titlebar = page.locator('header.desktop-titlebar-surface').first();
  const titlebarBox = await titlebar.boundingBox();
  expect(titlebarBox).not.toBeNull();
  expect(titlebarBox?.height ?? 999).toBeLessThanOrEqual(56);

  // Collapsing slides the sidebar off-canvas (its panel leaves the viewport).
  await page.getByRole('button', { name: 'Toggle Sidebar' }).first().click();
  await expect(sidebar).toHaveAttribute('data-state', 'collapsed');
  await expect
    .poll(async () => (await sidebarPanel.boundingBox())?.x ?? 0)
    .toBeLessThan(0);

  // Re-expanding restores it flush against the left edge.
  await page.getByRole('button', { name: 'Toggle Sidebar' }).first().click();
  await expect(sidebar).toHaveAttribute('data-state', 'expanded');
  await expect
    .poll(async () => (await sidebarPanel.boundingBox())?.x ?? -1)
    .toBeGreaterThanOrEqual(0);
});
