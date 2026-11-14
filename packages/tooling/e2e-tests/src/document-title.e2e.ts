import { expect, test } from '@playwright/test';
import { createBrowserWorkspaceAndNote, getEditorLocator } from './common';

test('document title follows note, settings, workspace, and home navigation', async ({
  page,
}) => {
  await createBrowserWorkspaceAndNote(page, {
    workspaceName: 'title-ws',
    noteName: 'Groceries',
  });
  await expect(page).toHaveTitle('Groceries.md - title-ws - Bangle.io');

  await page.reload();
  await expect(page).toHaveTitle('Groceries.md - title-ws - Bangle.io');

  await page.getByRole('button', { name: /Bangle\.io/ }).click();
  await page.getByRole('menuitem', { name: 'Settings' }).click();
  await expect(page.getByRole('heading', { name: 'General' })).toBeVisible();
  await expect(page).toHaveTitle('Bangle.io');
  await page.getByRole('link', { name: 'Back to app' }).click();
  await expect(page).toHaveTitle('Groceries.md - title-ws - Bangle.io');

  await page.getByRole('link', { name: 'Workspace home', exact: true }).click();
  await expect(page).toHaveURL(/#route=ws-home\b/);
  await expect(page).toHaveTitle('title-ws - Bangle.io');

  await page.getByRole('link', { name: 'Home', exact: true }).click();
  await expect(page).not.toHaveURL(/route=ws-home|wsName=|wsPath=/);
  await expect(page).toHaveTitle('Bangle.io');

  await page.goBack();
  await expect(page).toHaveTitle('title-ws - Bangle.io');
  await page.goForward();
  await expect(page).toHaveTitle('Bangle.io');
});

test('tabs keep their own note titles through renaming and reload', async ({
  page,
  context,
}) => {
  const workspaceName = 'title-tabs';
  const content = 'Keep this note content when its title changes.';
  await createBrowserWorkspaceAndNote(page, {
    workspaceName,
    noteName: 'Groceries',
  });
  const groceriesUrl = page.url();
  const editor = getEditorLocator(page, {});
  await expect(editor).toHaveAttribute('contenteditable', 'true');
  await editor.fill(content);

  const explorer = page.getByTestId('bangle-file-explorer');
  await explorer.getByLabel('New File', { exact: true }).click();
  const nameInput = explorer.getByRole('textbox');
  await nameInput.fill('Travel');
  await nameInput.press('Enter');
  await expect(page).toHaveTitle('Travel.md - title-tabs - Bangle.io');

  const secondPage = await context.newPage();
  await secondPage.goto(groceriesUrl);
  await expect(secondPage).toHaveTitle('Groceries.md - title-tabs - Bangle.io');
  await expect(getEditorLocator(secondPage, {})).toHaveText(content);

  await secondPage
    .getByTestId('bangle-file-explorer')
    .getByRole('treeitem', { name: 'Groceries.md', exact: true })
    .click({ button: 'right' });
  await secondPage
    .locator('[data-file-tree-context-menu-root="true"]')
    .getByRole('button', { name: 'Rename', exact: true })
    .click();
  const renameDialog = secondPage.getByRole('dialog', { name: 'Rename Note' });
  await renameDialog
    .getByRole('textbox', { name: 'New name' })
    .fill('Shopping');
  await renameDialog
    .getByRole('button', { name: 'Rename', exact: true })
    .click();

  await expect(secondPage).toHaveTitle('Shopping.md - title-tabs - Bangle.io');
  await expect(page).toHaveTitle('Travel.md - title-tabs - Bangle.io');
  await secondPage.reload();
  await expect(secondPage).toHaveTitle('Shopping.md - title-tabs - Bangle.io');
  await expect(getEditorLocator(secondPage, {})).toHaveText(content);
  await page.reload();
  await expect(page).toHaveTitle('Travel.md - title-tabs - Bangle.io');

  await explorer
    .getByRole('treeitem', { name: 'Shopping.md', exact: true })
    .click();
  await expect(page).toHaveTitle('Shopping.md - title-tabs - Bangle.io');
  await expect(getEditorLocator(page, {})).toHaveText(content);
});

test('workspace names distinguish notes with the same filename', async ({
  page,
}) => {
  await createBrowserWorkspaceAndNote(page, {
    workspaceName: 'title-personal',
    noteName: 'Tasks',
  });
  await expect(page).toHaveTitle('Tasks.md - title-personal - Bangle.io');
  await createBrowserWorkspaceAndNote(page, {
    workspaceName: 'title-work',
    noteName: 'Tasks',
  });
  await expect(page).toHaveTitle('Tasks.md - title-work - Bangle.io');

  await page.getByRole('link', { name: 'Home', exact: true }).click();
  await page.getByRole('link', { name: /^title-personal\b/ }).click();
  await expect(page).toHaveTitle('title-personal - Bangle.io');
  await page
    .getByTestId('bangle-file-explorer')
    .getByRole('treeitem', { name: 'Tasks.md', exact: true })
    .click();
  await expect(page).toHaveTitle('Tasks.md - title-personal - Bangle.io');
});
