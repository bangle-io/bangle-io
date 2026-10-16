import { expect, test } from '@playwright/test';
import { createBrowserWorkspace, readStoredMarkdown } from './common';

test('New File asks for the note name inline before creating it', async ({
  page,
}) => {
  const workspaceName = 'inline-new-file';
  await createBrowserWorkspace(page, { workspaceName });
  const explorer = page.getByTestId('bangle-file-explorer');

  await explorer.getByLabel('New File').click();
  const nameInput = explorer.getByRole('textbox');
  await expect(nameInput).toBeFocused();
  await expect(nameInput).toHaveValue('untitled-1.md');
  // File rows show names only, including the row being named.
  const nameRowIcon = explorer
    .locator("[data-type='item']", { has: page.getByRole('textbox') })
    .locator("[data-item-section='icon']");
  await expect(nameRowIcon).toHaveCount(1);
  await expect(nameRowIcon).toBeHidden();
  expect(
    await readStoredMarkdown(page, workspaceName, 'untitled-1'),
  ).toBeUndefined();

  await nameInput.fill('Groceries');
  await page.keyboard.press('Enter');

  await expect(
    page.getByLabel('breadcrumb').getByRole('button', { name: 'Groceries.md' }),
  ).toBeVisible();
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, 'Groceries'))
    .toBeDefined();
  expect(
    await readStoredMarkdown(page, workspaceName, 'untitled-1'),
  ).toBeUndefined();

  await page.reload();
  await expect(
    explorer.getByRole('treeitem', { name: /^Groceries\.md$/ }),
  ).toBeVisible();
});

test('Escape cancels the inline new file without creating it', async ({
  page,
}) => {
  const workspaceName = 'inline-new-file-cancel';
  await createBrowserWorkspace(page, { workspaceName });
  const explorer = page.getByTestId('bangle-file-explorer');

  await explorer.getByLabel('New File').click();
  await expect(explorer.getByRole('textbox')).toBeFocused();
  await page.keyboard.press('Escape');

  await expect(explorer.getByRole('textbox')).toHaveCount(0);
  await expect(
    explorer.getByRole('treeitem', { name: /^untitled-1\.md$/ }),
  ).toHaveCount(0);
  expect(
    await readStoredMarkdown(page, workspaceName, 'untitled-1'),
  ).toBeUndefined();
});
