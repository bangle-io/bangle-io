import { expect, test } from '@playwright/test';
import {
  createBrowserWorkspaceAndNote,
  getEditorLocator,
  readStoredMarkdown,
  waitForEditorFocus,
  writeStoredMarkdown,
} from './common';

test('slash command inserts a table that persists as pipe-table Markdown', async ({
  page,
}) => {
  const workspaceName = 'table-slash-insert';
  await createBrowserWorkspaceAndNote(page, {
    workspaceName,
    noteName: 'Home',
  });

  const editor = getEditorLocator(page, {});
  await editor.click();
  await waitForEditorFocus(page, {});
  await page.keyboard.insertText('/');
  await expect(page.getByText('Table', { exact: true })).toBeVisible();
  await page.getByText('Table', { exact: true }).click();

  await expect(editor.locator('table')).toBeVisible();
  await expect(editor.locator('table tr')).toHaveCount(3);
  await expect(editor.locator('table th')).toHaveCount(3);

  // The cursor lands in the first header cell; Tab walks the cells.
  await page.keyboard.insertText('Name');
  await page.keyboard.press('Tab');
  await page.keyboard.insertText('Status');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.insertText('Alpha');
  await page.keyboard.press('Tab');
  await page.keyboard.insertText('Done');

  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, 'Home'))
    .toBe(
      [
        '| Name | Status |  |',
        '| --- | --- | --- |',
        '| Alpha | Done |  |',
        '|  |  |  |',
      ].join('\n'),
    );

  // The table must survive a reload through the Markdown persistence path.
  await page.reload();
  await expect(editor.locator('table')).toBeVisible();
  await expect(editor.locator('table th').first()).toHaveText('Name');
  await expect(editor.locator('table td').first()).toHaveText('Alpha');
});

test('Tab in the last cell grows the table by one row', async ({ page }) => {
  const workspaceName = 'table-tab-grow';
  await createBrowserWorkspaceAndNote(page, {
    workspaceName,
    noteName: 'Home',
  });

  const editor = getEditorLocator(page, {});
  await editor.click();
  await waitForEditorFocus(page, {});
  await page.keyboard.insertText('/');
  await page.getByText('Table', { exact: true }).click();
  await expect(editor.locator('table')).toBeVisible();

  // 3x3 table -> 8 Tabs reach the last cell, one more adds a row.
  for (let i = 0; i < 9; i++) {
    await page.keyboard.press('Tab');
  }
  await page.keyboard.insertText('new row');

  await expect(editor.locator('table tr')).toHaveCount(4);
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, 'Home'))
    .toContain('| new row |  |  |');
});

test('table menu adds and removes rows and columns', async ({ page }) => {
  const workspaceName = 'table-menu-controls';
  await createBrowserWorkspaceAndNote(page, {
    workspaceName,
    noteName: 'Home',
  });

  const editor = getEditorLocator(page, {});
  await editor.click();
  await waitForEditorFocus(page, {});
  await page.keyboard.insertText('/');
  await page.getByText('Table', { exact: true }).click();
  await expect(editor.locator('table')).toBeVisible();
  // Put marker text in the last header cell; the operations below add and
  // remove the first column and a body row, so this cell must survive.
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.insertText('keep');
  // Move into the first body cell so row operations target a body row.
  await page.keyboard.press('Tab');

  const openTableMenu = async () => {
    const trigger = page.getByRole('button', { name: 'Table options' });
    await expect(trigger).toBeVisible();
    await trigger.click();
  };

  await openTableMenu();
  await page.getByRole('menuitem', { name: 'Add row below' }).click();
  await expect(editor.locator('table tr')).toHaveCount(4);

  await openTableMenu();
  await page.getByRole('menuitem', { name: 'Add column right' }).click();
  await expect(editor.locator('table th')).toHaveCount(4);

  await openTableMenu();
  await page.getByRole('menuitem', { name: 'Delete column' }).click();
  await expect(editor.locator('table th')).toHaveCount(3);

  await openTableMenu();
  await page.getByRole('menuitem', { name: 'Delete row' }).click();
  await expect(editor.locator('table tr')).toHaveCount(3);

  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, 'Home'))
    .toBe(
      [
        '|  |  | keep |',
        '| --- | --- | --- |',
        '|  |  |  |',
        '|  |  |  |',
      ].join('\n'),
    );

  // Adding a row above the header is not representable in pipe tables.
  await editor.locator('table th', { hasText: 'keep' }).click();
  await openTableMenu();
  await expect(
    page.getByRole('menuitem', { name: 'Add row above' }),
  ).toBeDisabled();
  await page.keyboard.press('Escape');

  await openTableMenu();
  await page.getByRole('menuitem', { name: 'Delete table' }).click();
  await expect(editor.locator('table')).toHaveCount(0);
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, 'Home'))
    .toBe('');
});

test('existing Markdown pipe tables load, edit, and round trip faithfully', async ({
  page,
}) => {
  const workspaceName = 'table-existing-markdown';
  await createBrowserWorkspaceAndNote(page, {
    workspaceName,
    noteName: 'Home',
  });

  const source = [
    '# Inventory',
    '',
    '| Item | Count | Note |',
    '| :--- | ---: | --- |',
    '| Bolt `a \\| b` | 2 | [docs](https://example.com) |',
    '| Nut | 9 | **important** |',
  ].join('\n');
  await writeStoredMarkdown(page, workspaceName, 'Home', source);
  await page.reload();

  const editor = getEditorLocator(page, {});
  await expect(editor.locator('table')).toBeVisible();
  await expect(editor.locator('table th').first()).toHaveText('Item');
  await expect(editor.locator('table code').first()).toHaveText('a | b');
  await expect(editor.locator('table a', { hasText: 'docs' })).toBeVisible();

  // Edit one cell and confirm nothing else in the table gets rewritten.
  await editor.locator('table td', { hasText: 'Nut' }).click();
  await waitForEditorFocus(page, {});
  await page.keyboard.press('End');
  await page.keyboard.insertText('meg');

  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, 'Home'))
    .toBe(
      [
        '# Inventory',
        '',
        '| Item | Count | Note |',
        '| :--- | ---: | --- |',
        '| Bolt `a \\| b` | 2 | [docs](https://example.com) |',
        '| Nutmeg | 9 | **important** |',
      ].join('\n'),
    );
});

test('arrow keys navigate cell edges and exit the table at its boundaries', async ({
  page,
}) => {
  const workspaceName = 'table-arrow-nav';
  await createBrowserWorkspaceAndNote(page, {
    workspaceName,
    noteName: 'Home',
  });

  // Table as the only node in the note, so both exits must create paragraphs.
  await writeStoredMarkdown(
    page,
    workspaceName,
    'Home',
    ['| a | b |', '| --- | --- |', '| c1 | d1 |'].join('\n'),
  );
  await page.reload();
  const editor = getEditorLocator(page, {});
  await expect(editor.locator('table')).toBeVisible();

  // One initial click; everything after navigates by keyboard so the test
  // exercises the caret behavior users actually rely on.
  await editor.locator('table td', { hasText: 'c1' }).click();
  await waitForEditorFocus(page, {});

  // ArrowRight at the end of a cell hops to the start of the next cell.
  await page.keyboard.press('End');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.insertText('X');
  await expect(editor.locator('table td').nth(1)).toHaveText('Xd1');

  // ArrowLeft at the start of a cell hops back, wrapping to the header row.
  await page.keyboard.press('Home');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('Home');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.insertText('Y');
  await expect(editor.locator('table th').nth(1)).toHaveText('bY');

  // ArrowUp on the header row exits above; with nothing there a paragraph is
  // inserted.
  await page.keyboard.press('ArrowUp');
  await page.keyboard.insertText('above');
  await expect(editor.locator('p', { hasText: 'above' })).toBeVisible();

  // ArrowDown re-enters the table, walks the rows, and exits below the last
  // row into a fresh paragraph.
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.insertText('below');

  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, 'Home'))
    .toBe(
      [
        'above',
        '',
        '| a | bY |',
        '| --- | --- |',
        '| c1 | Xd1 |',
        '',
        'below',
      ].join('\n'),
    );
});
