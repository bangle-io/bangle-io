import { expect, type Locator, test } from '@playwright/test';
import { createBrowserWorkspace } from './common';

function cssTimeToMilliseconds(value: string): number {
  const time = value.trim();
  if (time.endsWith('ms')) {
    return Number.parseFloat(time);
  }
  if (time.endsWith('s')) {
    return Number.parseFloat(time) * 1000;
  }
  return Number.POSITIVE_INFINITY;
}

async function expectNearInstantCssTime(
  locator: Locator,
  property: 'animation-duration' | 'transition-duration',
) {
  await expect
    .poll(async () => {
      const value = await locator.evaluate(
        (element, cssProperty) =>
          getComputedStyle(element).getPropertyValue(cssProperty),
        property,
      );
      return value
        .split(',')
        .every((time) => cssTimeToMilliseconds(time) <= 0.01);
    })
    .toBe(true);
}

async function expectReducedMotionStyle(locator: Locator) {
  await expect(locator).toHaveCSS('animation-delay', '0s');
  await expectNearInstantCssTime(locator, 'animation-duration');
  await expect(locator).toHaveCSS('animation-iteration-count', '1');
  await expect(locator).toHaveCSS('transition-delay', '0s');
  await expectNearInstantCssTime(locator, 'transition-duration');
}

test('reduced motion preserves app, dialog, and file-tree outcomes', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await createBrowserWorkspace(page, {
    workspaceName: `reduced-motion-${Date.now()}`,
  });

  await test.step('sidebar completes its off-canvas transition near-instantly', async () => {
    const sidebar = page.locator('[data-variant][data-side="left"]').first();
    const sidebarContainer = sidebar.locator('[data-slot="sidebar-container"]');
    const sidebarPanel = sidebar.locator('[data-sidebar="sidebar"]');

    await expectReducedMotionStyle(sidebarContainer);
    await page.getByRole('button', { name: 'Toggle Sidebar' }).first().click();
    await expect(sidebar).toHaveAttribute('data-state', 'collapsed');
    await expect
      .poll(async () => (await sidebarPanel.boundingBox())?.x ?? 0)
      .toBeLessThan(0);

    await page.getByRole('button', { name: 'Toggle Sidebar' }).first().click();
    await expect(sidebar).toHaveAttribute('data-state', 'expanded');
    await expect
      .poll(async () => (await sidebarPanel.boundingBox())?.x ?? -1)
      .toBeGreaterThanOrEqual(0);
  });

  await test.step('the standard note dialog remains usable without motion', async () => {
    await page.getByRole('button', { name: 'New Note' }).click();

    const dialog = page.getByRole('dialog', { name: 'Create Note' });
    await expect(dialog).toBeVisible();
    await expectReducedMotionStyle(dialog);

    await dialog.getByLabel('Note name').fill('motion-note');
    await dialog.getByRole('button', { name: 'Create' }).click();
    await expect(
      page
        .getByLabel('breadcrumb')
        .getByRole('button', { name: 'motion-note.md' }),
    ).toBeVisible();
  });

  await test.step('the shadow-root file tree receives the same policy', async () => {
    const explorer = page.getByTestId('bangle-file-explorer');
    const treeItem = explorer.getByRole('treeitem', {
      name: /^motion-note\.md$/,
    });
    const treeScrollContainer = explorer.locator(
      '[data-file-tree-virtualized-scroll="true"]',
    );

    await expect(treeItem).toHaveAttribute('aria-selected', 'true');
    await expectReducedMotionStyle(treeItem);
    await expect(treeScrollContainer).toHaveCSS('scroll-behavior', 'auto');
  });
});
