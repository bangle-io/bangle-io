import { expect, type Locator, test } from '@playwright/test';
import {
  createBrowserWorkspaceAndNote,
  getEditorLocator,
  readStoredMarkdown,
} from './common';

async function expectBreadcrumbControlsContained(breadcrumb: Locator) {
  await expect
    .poll(() =>
      breadcrumb.locator('a, button').evaluateAll((controls) => {
        const violations: string[] = [];
        let previousRight = 0;
        for (const control of controls) {
          const bounds = control.getBoundingClientRect();
          const item = control.closest('li')?.getBoundingClientRect();
          const navigation = control.closest('nav')?.getBoundingClientRect();
          const name =
            control.getAttribute('aria-label') ?? control.textContent;
          if (!item || !navigation) {
            violations.push(`${name} is missing its breadcrumb container`);
            continue;
          }
          if (
            bounds.left < Math.max(item.left, navigation.left) - 1 ||
            bounds.right > Math.min(item.right, navigation.right) + 1
          ) {
            violations.push(`${name} extends outside its breadcrumb item`);
          }
          if (bounds.left < previousRight - 1) {
            violations.push(`${name} overlaps the previous breadcrumb control`);
          }
          previousRight = bounds.right;
        }
        return violations;
      }),
    )
    .toEqual([]);
}

for (const viewport of [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'mobile', width: 390, height: 844 },
]) {
  test(`header keeps Home and Workspace home distinct on ${viewport.name}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    const workspaceName = 'header-navigation';
    const noteName = 'plans/2026/November/Weekly plan';
    const content = 'Keep this note when navigating between home pages.';
    await createBrowserWorkspaceAndNote(page, { workspaceName, noteName });
    const noteUrl = page.url();
    const breadcrumb = page.getByRole('navigation', { name: 'breadcrumb' });
    const home = breadcrumb.getByRole('link', { name: 'Home', exact: true });
    const workspaceHome = breadcrumb.getByRole('link', {
      name: 'Workspace home',
      exact: true,
    });

    await expect(home).toBeVisible();
    await expect(home).toHaveAttribute('href', '/ws#route=welcome');
    await expect(workspaceHome).toBeVisible();
    await expect(workspaceHome).toHaveAttribute(
      'href',
      '/ws#route=ws-home&wsName=header-navigation',
    );
    const editor = getEditorLocator(page, {});
    await expect(editor).toHaveAttribute('contenteditable', 'true');
    await editor.fill(content);
    await expect
      .poll(() => readStoredMarkdown(page, workspaceName, noteName))
      .toBe(content);

    const directoryDropdown = breadcrumb.getByRole('button', {
      name: 'November',
      exact: true,
    });
    const noteDropdown = breadcrumb.getByRole('button', {
      name: 'Weekly plan.md',
      exact: true,
    });
    await expect(directoryDropdown).toHaveAccessibleName('November');
    await expect(noteDropdown).toHaveAccessibleName('Weekly plan.md');
    await expectBreadcrumbControlsContained(breadcrumb);
    if (viewport.name === 'mobile') {
      await expect
        .poll(() =>
          noteDropdown.evaluate(
            (button) => button.scrollWidth > button.clientWidth,
          ),
        )
        .toBe(true);
    }
    await noteDropdown.focus();
    await expect(noteDropdown).toBeFocused();
    await noteDropdown.press('Enter');
    await expect(page.getByRole('menu')).toBeVisible();
    await expect(
      page.getByRole('menuitem', { name: 'New Note', exact: true }),
    ).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('menu')).toHaveCount(0);

    // The Home destination is the workspace list even from a nested note.
    await home.click();
    await expect(page).toHaveURL(/#route=welcome$/);
    await expect(
      page.getByRole('heading', { name: 'Recent workspaces' }),
    ).toBeVisible();
    await expect(home).toHaveAttribute('href', '/ws#route=welcome');
    await expect(workspaceHome).toHaveCount(0);
    await home.click();
    await expect(page).toHaveURL(/#route=welcome$/);

    await page.goBack();
    await expect(page).toHaveURL(noteUrl);
    await expect(workspaceHome).toBeVisible();
    await expect(editor).toHaveAttribute('contenteditable', 'true');
    // Both destinations work with normal keyboard link activation.
    await workspaceHome.focus();
    await expect(workspaceHome).toBeFocused();
    await workspaceHome.press('Enter');
    await expect(page).toHaveURL(/#route=ws-home&wsName=header-navigation$/);
    await expect(
      page.getByRole('heading', { name: workspaceName, exact: true }),
    ).toBeVisible();
    await expect(home).toHaveAttribute('href', '/ws#route=welcome');
    await home.click();
    await expect(page).toHaveURL(/#route=welcome$/);

    await page.goto(noteUrl);
    await page.reload();
    await expect(getEditorLocator(page, {})).toHaveText(content);
    await expect(home).toBeVisible();
    await expect(workspaceHome).toBeVisible();
  });
}
