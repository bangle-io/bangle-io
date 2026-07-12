import { expect, test } from '@playwright/test';
import {
  createBrowserWorkspaceAndNote,
  getEditorLocator,
  readStoredMarkdown,
  waitForEditorFocus,
  writeStoredMarkdown,
} from './common';

const EMPTY_DOC_HINT = "Write something, or press '/' for commands…";
const EMPTY_BLOCK_HINT = "Press '/' for commands";

test('editor guides the user to the slash menu with placeholders', async ({
  page,
}) => {
  await createBrowserWorkspaceAndNote(page, {
    workspaceName: 'placeholder-hints',
    noteName: 'Home',
  });

  const editor = getEditorLocator(page, {});
  await expect(editor.locator('[data-placeholder]')).toHaveAttribute(
    'data-placeholder',
    EMPTY_DOC_HINT,
  );

  await editor.click();
  await waitForEditorFocus(page, {});
  await page.keyboard.insertText('First line');
  await expect(editor.locator('[data-placeholder]')).toHaveCount(0);

  await page.keyboard.press('Enter');
  await expect(editor.locator('[data-placeholder]')).toHaveAttribute(
    'data-placeholder',
    EMPTY_BLOCK_HINT,
  );
});

test('plus button inserts a block below and opens the slash menu', async ({
  page,
}) => {
  const workspaceName = 'block-handle-add-below';
  await createBrowserWorkspaceAndNote(page, {
    workspaceName,
    noteName: 'Home',
  });

  const editor = getEditorLocator(page, {});
  await editor.click();
  await waitForEditorFocus(page, {});
  await page.keyboard.insertText('First line');

  await editor.locator('p', { hasText: 'First line' }).hover();
  const addButton = page.getByRole('button', { name: 'Add block' });
  await expect(addButton).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Drag to move' }),
  ).toBeVisible();
  // Wide gutter on desktop keeps the + and grip side by side.
  await expect(page.locator('[data-block-handle]')).toHaveAttribute(
    'data-orientation',
    'horizontal',
  );

  await addButton.click();
  await expect(page.getByTestId('slash-command-menu')).toBeVisible();
  await page.getByText('Heading 1').click();
  await page.keyboard.insertText('Below');

  await expect(
    editor.getByRole('heading', { name: 'Below', level: 1 }),
  ).toBeVisible();
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, 'Home'))
    .toBe('First line\n\n# Below');
});

test('alt-clicking the plus button inserts the block above', async ({
  page,
}) => {
  const workspaceName = 'block-handle-add-above';
  await createBrowserWorkspaceAndNote(page, {
    workspaceName,
    noteName: 'Home',
  });

  const editor = getEditorLocator(page, {});
  await editor.click();
  await waitForEditorFocus(page, {});
  await page.keyboard.insertText('First line');

  await editor.locator('p', { hasText: 'First line' }).hover();
  const addButton = page.getByRole('button', { name: 'Add block' });
  await expect(addButton).toBeVisible();

  await addButton.click({ modifiers: ['Alt'] });
  await expect(page.getByTestId('slash-command-menu')).toBeVisible();
  await page.getByText('Text', { exact: true }).click();
  await page.keyboard.insertText('Above');

  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, 'Home'))
    .toBe('Above\n\nFirst line');
});

test('plus button on a table inserts around it without splitting the table', async ({
  page,
}) => {
  const workspaceName = 'block-handle-table';
  await createBrowserWorkspaceAndNote(page, {
    workspaceName,
    noteName: 'Home',
  });
  await writeStoredMarkdown(
    page,
    workspaceName,
    'Home',
    '| a | b |\n| --- | --- |\n| 1 | 2 |',
  );
  await page.reload({ waitUntil: 'networkidle' });

  const editor = getEditorLocator(page, {});
  await expect(editor.locator('table')).toBeVisible();

  await editor.locator('td', { hasText: '1' }).hover();
  const addButton = page.getByRole('button', { name: 'Add block' });
  await expect(addButton).toBeVisible();
  await addButton.click();

  const menu = page.getByTestId('slash-command-menu');
  await expect(menu).toBeVisible();
  await menu.getByText('Text', { exact: true }).click();
  await page.keyboard.insertText('after table');

  // The table must stay one table; the new paragraph lands after it.
  await expect(editor.locator('table')).toHaveCount(1);
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, 'Home'))
    .toMatch(/^\| a \| b \|[\s\S]*\| 1 \| 2 \|\n\nafter table$/);

  // Alt-click inserts before the table, still without splitting it.
  await editor.locator('td', { hasText: '1' }).hover();
  await expect(addButton).toBeVisible();
  await addButton.click({ modifiers: ['Alt'] });
  await expect(menu).toBeVisible();
  await menu.getByText('Text', { exact: true }).click();
  await page.keyboard.insertText('before table');

  await expect(editor.locator('table')).toHaveCount(1);
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, 'Home'))
    .toMatch(/^before table\n\n\| a \| b \|[\s\S]*\n\nafter table$/);
});

test('block handle stacks vertically when the gutter is narrow', async ({
  page,
}) => {
  await page.setViewportSize({ width: 600, height: 800 });
  await createBrowserWorkspaceAndNote(page, {
    workspaceName: 'block-handle-vertical',
    noteName: 'Home',
  });

  const editor = getEditorLocator(page, {});
  await editor.click();
  await waitForEditorFocus(page, {});
  await page.keyboard.insertText('First line');

  await editor.locator('p', { hasText: 'First line' }).hover();
  await expect(page.getByRole('button', { name: 'Add block' })).toBeVisible();
  await expect(page.locator('[data-block-handle]')).toHaveAttribute(
    'data-orientation',
    'vertical',
  );
});
