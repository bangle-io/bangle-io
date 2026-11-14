import { expect, test } from '@playwright/test';
import {
  createBrowserWorkspaceAndNote,
  getEditorLocator,
  readStoredMarkdown,
} from './common';

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
    // Both destinations work with normal keyboard link activation.
    await workspaceHome.focus();
    await page.keyboard.press('Enter');
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
