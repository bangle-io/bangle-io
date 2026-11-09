import { expect, test } from '@playwright/test';
import {
  createBrowserWorkspace,
  createBrowserWorkspaceAndNote,
  getEditorLocator,
  readStoredMarkdown,
} from './common';

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
  const editor = getEditorLocator(page, {});
  await expect(editor).toHaveAttribute('contenteditable', 'true');
  await editor.fill('Remember the apples');
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, 'Groceries'))
    .toContain('Remember the apples');
  await page.reload();
  await expect(editor).toHaveText('Remember the apples');
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

test('clicking away creates a nested note with the typed name', async ({
  page,
}) => {
  const workspaceName = 'inline-new-file-blur';
  await createBrowserWorkspace(page, { workspaceName });
  const explorer = page.getByTestId('bangle-file-explorer');
  await explorer.getByLabel('New File').click();
  await explorer.getByRole('textbox').fill('docs/Shopping');
  await page.getByRole('heading', { name: workspaceName }).click();

  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, 'docs/Shopping'))
    .toBeDefined();
  await expect(explorer.getByRole('textbox')).toHaveCount(0);
  await expect(
    explorer.getByRole('treeitem', { name: /^untitled-1\.md$/ }),
  ).toHaveCount(0);
  await expect(
    page.getByLabel('breadcrumb').getByRole('button', { name: 'Shopping.md' }),
  ).toBeVisible();
});

for (const finish of ['Enter', 'blur'] as const) {
  test(`a blank name cancels on ${finish} and can be retried`, async ({
    page,
  }) => {
    const workspaceName = `inline-blank-${finish.toLowerCase()}`;
    await createBrowserWorkspace(page, { workspaceName });
    const explorer = page.getByTestId('bangle-file-explorer');
    await explorer.getByLabel('New File').click();
    await explorer.getByRole('textbox').fill('   ');
    if (finish === 'Enter') {
      await page.keyboard.press('Enter');
    } else {
      await page.getByRole('heading', { name: workspaceName }).click();
    }
    await expect(explorer.getByRole('textbox')).toHaveCount(0);
    await expect(explorer.getByRole('treeitem')).toHaveCount(0);
    expect(
      await readStoredMarkdown(page, workspaceName, 'untitled-1'),
    ).toBeUndefined();
    await explorer.getByLabel('New File').click();
    await expect(explorer.getByRole('textbox')).toHaveValue('untitled-1.md');
    await page.keyboard.press('Enter');
    await expect
      .poll(() => readStoredMarkdown(page, workspaceName, 'untitled-1'))
      .toBeDefined();
  });
}

test('a duplicate name preserves the existing note and allows another attempt', async ({
  page,
}) => {
  const workspaceName = 'inline-duplicate';
  await createBrowserWorkspaceAndNote(page, {
    workspaceName,
    noteName: 'Existing',
  });
  const editor = getEditorLocator(page, {});
  await expect(editor).toHaveAttribute('contenteditable', 'true');
  await editor.fill('Keep this content');
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, 'Existing'))
    .toContain('Keep this content');
  const explorer = page.getByTestId('bangle-file-explorer');
  await explorer.getByLabel('New File').click();
  await explorer.getByRole('textbox').fill('Existing');
  await page.keyboard.press('Enter');
  await expect(
    page.getByText('File already exists', { exact: true }),
  ).toBeVisible();
  await expect(explorer.getByRole('textbox')).toHaveCount(0);
  await expect(
    explorer.getByRole('treeitem', { name: /^untitled-1\.md$/ }),
  ).toHaveCount(0);
  expect(await readStoredMarkdown(page, workspaceName, 'Existing')).toContain(
    'Keep this content',
  );
  await explorer.getByLabel('New File').click();
  await explorer.getByRole('textbox').fill('Another');
  await page.keyboard.press('Enter');
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, 'Another'))
    .toBeDefined();
  await page.reload();
  expect(await readStoredMarkdown(page, workspaceName, 'Existing')).toContain(
    'Keep this content',
  );
});

test('the mobile sidebar focuses the name and persists the created note', async ({
  page,
}) => {
  const workspaceName = 'inline-mobile';
  await page.setViewportSize({ width: 390, height: 844 });
  await createBrowserWorkspace(page, { workspaceName });
  await page.getByRole('button', { name: 'Toggle Sidebar' }).click();
  const explorer = page.getByTestId('bangle-file-explorer');
  await explorer.getByLabel('New File').click();
  await expect(explorer.getByRole('textbox')).toBeFocused();
  await explorer.getByRole('textbox').fill('Mobile note');
  await page.keyboard.press('Enter');
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, 'Mobile note'))
    .toBeDefined();
  if (await page.getByRole('dialog').isVisible()) {
    await page.keyboard.press('Escape');
  }
  await expect(
    page
      .getByLabel('breadcrumb')
      .getByRole('button', { name: 'Mobile note.md' }),
  ).toBeVisible();
  await page.reload();
  await expect(getEditorLocator(page, {})).toBeVisible();
});
