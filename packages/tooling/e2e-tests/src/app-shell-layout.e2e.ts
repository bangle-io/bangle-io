import { expect, test } from '@playwright/test';
import {
  createBrowserWorkspace,
  createBrowserWorkspaceAndNote,
  expectNoPageHorizontalOverflow,
} from './common';

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
  await expect
    .poll(async () => (await titlebar.boundingBox())?.height ?? 999)
    .toBeLessThanOrEqual(42);

  const titlebarBox = await titlebar.boundingBox();
  expect(titlebarBox).not.toBeNull();
  expect(titlebarBox?.height ?? 999).toBeGreaterThanOrEqual(38);

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

test('app shell: mobile titlebar scrolls away with the document', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 500 });
  await createBrowserWorkspaceAndNote(page, {
    workspaceName: 'mobile-scroll-titlebar-ws',
    noteName: 'Long note',
  });

  const titlebar = page.locator('header.desktop-titlebar-surface').first();
  await expect(titlebar).toBeVisible();

  await page.locator('.ProseMirror').evaluate((element) => {
    element.style.minHeight = '200vh';
  });
  await page.evaluate(() => window.scrollTo({ top: 300, behavior: 'instant' }));

  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBeGreaterThanOrEqual(300);
  await expect
    .poll(() =>
      titlebar.evaluate((element) => element.getBoundingClientRect().top),
    )
    .toBeLessThanOrEqual(-300);
});

test('app shell: mobile titlebar shows only the truncated current filename', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const directoryName = 'Directory that must not consume titlebar space';
  const fileName =
    'Current filename that is deliberately much too long for a mobile titlebar.md';
  await createBrowserWorkspaceAndNote(page, {
    workspaceName: 'mobile-filename-titlebar-ws',
    noteName: `${directoryName}/Nested directory/${fileName}`,
  });

  const titlebar = page.locator('header.desktop-titlebar-surface').first();
  const breadcrumb = titlebar.getByRole('navigation', { name: 'breadcrumb' });
  await expect(breadcrumb).toBeVisible();
  await expect(
    breadcrumb.getByRole('button', { name: fileName, exact: true }),
  ).toBeVisible();
  await expect(
    breadcrumb.getByText(directoryName, { exact: true }),
  ).toBeHidden();
  await expect(
    breadcrumb.getByText('Nested directory', { exact: true }),
  ).toBeHidden();
  await expect(
    breadcrumb.locator('[data-slot="breadcrumb-item"]:visible'),
  ).toHaveCount(1);
  await expect(
    breadcrumb.locator('[data-slot="breadcrumb-separator"]:visible'),
  ).toHaveCount(0);

  const filenameButton = breadcrumb.getByRole('button', {
    name: fileName,
    exact: true,
  });
  await expect
    .poll(() =>
      filenameButton.evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          isOverflowing: element.scrollWidth > element.clientWidth,
          overflow: style.overflow,
          textOverflow: style.textOverflow,
          whiteSpace: style.whiteSpace,
        };
      }),
    )
    .toEqual({
      isOverflowing: true,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    });
  await expectNoPageHorizontalOverflow(page);

  await page.setViewportSize({ width: 767, height: 844 });
  await expect(
    breadcrumb.getByText(directoryName, { exact: true }),
  ).toBeHidden();
  await expect(
    breadcrumb.locator('[data-slot="breadcrumb-item"]:visible'),
  ).toHaveCount(1);

  await page.setViewportSize({ width: 768, height: 844 });
  await expect(
    breadcrumb.getByText(directoryName, { exact: true }),
  ).toBeVisible();
  await expect(
    breadcrumb.locator('[data-slot="breadcrumb-item"]:visible'),
  ).toHaveCount(4);
  await expect
    .poll(async () => {
      const titlebarBox = await titlebar.boundingBox();
      const breadcrumbBox = await breadcrumb.boundingBox();
      if (!titlebarBox || !breadcrumbBox) {
        return false;
      }
      return (
        breadcrumbBox.y >= titlebarBox.y &&
        breadcrumbBox.y + breadcrumbBox.height <=
          titlebarBox.y + titlebarBox.height
      );
    })
    .toBe(true);
});

test('app shell: resize the sidebar with pointer or keyboard and persist its width', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await createBrowserWorkspace(page, { workspaceName: 'resizable-sidebar-ws' });

  const sidebar = page.locator('[data-sidebar="sidebar"]').first();
  const rail = page.getByRole('separator', {
    name: 'Resize sidebar. Double-click to reset.',
  });
  await expect(rail).toBeVisible();
  await expect(rail).toHaveAttribute('aria-valuemin', '224');
  await expect(rail).toHaveAttribute('aria-valuemax', '400');
  await expect(rail).toHaveCSS('cursor', 'col-resize');

  const initialSidebarBox = await sidebar.boundingBox();
  const initialWidth = Number(await rail.getAttribute('aria-valuenow'));
  await rail.hover({ position: { x: 8, y: 120 } });
  const railBox = await rail.boundingBox();
  expect(initialSidebarBox).not.toBeNull();
  expect(railBox).not.toBeNull();
  expect(railBox?.width ?? 0).toBeGreaterThanOrEqual(12);

  const startX = (railBox?.x ?? 0) + 8;
  const startY = (railBox?.y ?? 0) + 120;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 80, startY, { steps: 5 });
  await page.mouse.up();

  const resizedWidth = (initialSidebarBox?.width ?? 0) + 80;
  await expect
    .poll(async () => (await sidebar.boundingBox())?.width ?? 0)
    .toBeCloseTo(resizedWidth, 0);
  await expect(rail).toHaveAttribute('aria-valuenow', `${initialWidth + 80}`);

  await page.reload();
  await expect
    .poll(async () => (await sidebar.boundingBox())?.width ?? 0)
    .toBeCloseTo(resizedWidth, 0);

  await rail.focus();
  await page.keyboard.press('ArrowLeft');
  await expect
    .poll(async () => (await sidebar.boundingBox())?.width ?? 0)
    .toBeCloseTo(resizedWidth - 8, 0);

  await page.keyboard.press('Home');
  await expect(rail).toHaveAttribute('aria-valuenow', '224');
  await page.keyboard.press('End');
  await expect(rail).toHaveAttribute('aria-valuenow', '400');
  await expectNoPageHorizontalOverflow(page);

  const companionPage = await page.context().newPage();
  await companionPage.goto('/');
  const companionRail = companionPage.getByRole('separator', {
    name: 'Resize sidebar. Double-click to reset.',
  });
  await expect(companionRail).toHaveAttribute('aria-valuenow', '400');
  await rail.focus();
  await page.keyboard.press('ArrowLeft');
  await expect(companionRail).toHaveAttribute('aria-valuenow', '392');
  await page.keyboard.press('ArrowRight');
  await expect(companionRail).toHaveAttribute('aria-valuenow', '400');
  await companionPage.close();

  const toggle = page.getByRole('button', { name: 'Toggle Sidebar' }).first();
  await toggle.click();
  await expect(
    page.locator('[data-variant][data-side="left"]').first(),
  ).toHaveAttribute('data-state', 'collapsed');
  await toggle.click();
  await expect(rail).toHaveAttribute('aria-valuenow', '400');

  await rail.dblclick();
  await expect(rail).toHaveAttribute('aria-valuenow', '272');
});

test('app shell: PWA window controls overlay keeps titlebar actions outside reserved chrome geometry', async ({
  page,
}) => {
  await createBrowserWorkspaceAndNote(page, {
    workspaceName: 'overlay-layout-ws',
    noteName: 'Overlay Note',
  });

  await page.evaluate(() => {
    const titlebarLeftInset = 80;
    const titlebarRightInset = 96;
    const root = document.documentElement;

    root.setAttribute('data-bangle-window-controls-overlay', 'visible');
    root.setAttribute('data-bangle-window-controls-overlay-controls', 'both');
    root.style.setProperty(
      '--bangle-titlebar-area-x',
      `${titlebarLeftInset}px`,
    );
    root.style.setProperty(
      '--bangle-titlebar-area-width',
      `calc(100vw - ${titlebarLeftInset + titlebarRightInset}px)`,
    );
    root.style.setProperty('--bangle-titlebar-area-height', '40px');
  });

  const titlebar = page.locator('header.desktop-titlebar-surface').first();
  const toggleMaxWidthButton = page.getByRole('button', {
    name: 'Toggle Max Width',
  });
  await expect(toggleMaxWidthButton).toBeVisible();

  await expect
    .poll(async () =>
      titlebar.evaluate((element) => getComputedStyle(element).paddingRight),
    )
    .toBe('104px');
  await expect
    .poll(async () =>
      toggleMaxWidthButton.evaluate(
        (element) => window.innerWidth - element.getBoundingClientRect().right,
      ),
    )
    .toBeGreaterThanOrEqual(96);
});

test('app shell: mobile PWA titlebar keeps controls inside the window-controls-overlay area', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await createBrowserWorkspaceAndNote(page, {
    workspaceName: 'mobile-overlay-layout-ws',
    noteName: 'Overlay Note',
  });

  const titlebarLeftInset = 80;
  const titlebarRightInset = 96;
  await page.evaluate(
    ({ leftInset, rightInset }) => {
      const root = document.documentElement;

      root.setAttribute('data-bangle-window-controls-overlay', 'visible');
      root.setAttribute('data-bangle-window-controls-overlay-controls', 'both');
      root.style.setProperty('--bangle-titlebar-area-x', `${leftInset}px`);
      root.style.setProperty(
        '--bangle-titlebar-area-width',
        `calc(100vw - ${leftInset + rightInset}px)`,
      );
      root.style.setProperty('--bangle-titlebar-area-height', '40px');
    },
    { leftInset: titlebarLeftInset, rightInset: titlebarRightInset },
  );

  const titlebar = page.locator('header.desktop-titlebar-surface').first();
  const sidebarToggle = titlebar.getByRole('button', {
    name: 'Toggle Sidebar',
  });
  const starButton = titlebar.getByRole('button', { name: 'Star this item' });

  await expect(sidebarToggle).toBeVisible();
  await expect(starButton).toBeVisible();
  await expect
    .poll(() =>
      sidebarToggle.evaluate((element) => element.getBoundingClientRect().left),
    )
    .toBeGreaterThanOrEqual(titlebarLeftInset);
  await expect
    .poll(() =>
      sidebarToggle.evaluate((element) => element.getBoundingClientRect().left),
    )
    .toBeLessThanOrEqual(titlebarLeftInset + 12);
  await expect
    .poll(() =>
      starButton.evaluate(
        (element) => window.innerWidth - element.getBoundingClientRect().right,
      ),
    )
    .toBeGreaterThanOrEqual(titlebarRightInset);
  await expectNoPageHorizontalOverflow(page);
});

test('app shell: max-width control follows the responsive layout after resize', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 844 });
  await createBrowserWorkspaceAndNote(page, {
    workspaceName: 'responsive-max-width-ws',
    noteName: 'Responsive Width',
  });

  const toggleMaxWidthButton = page.getByRole('button', {
    name: 'Toggle Max Width',
  });
  const pageContent = page.locator('main.B-app-page-content');
  await expect(toggleMaxWidthButton).toBeVisible();
  await toggleMaxWidthButton.click();
  await expect
    .poll(() =>
      pageContent.evaluate((element) => getComputedStyle(element).maxWidth),
    )
    .toBe('768px');

  await page.setViewportSize({ width: 767, height: 844 });
  await expect(toggleMaxWidthButton).toBeHidden();
  await expect
    .poll(() =>
      pageContent.evaluate((element) => getComputedStyle(element).maxWidth),
    )
    .toBe('none');

  await page.setViewportSize({ width: 768, height: 844 });
  await expect(toggleMaxWidthButton).toBeVisible();
  await expect
    .poll(() =>
      pageContent.evaluate((element) => getComputedStyle(element).maxWidth),
    )
    .toBe('768px');
});
