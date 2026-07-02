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

  // Escape hides the menu for this table until the document changes again.
  await expect(
    page.getByRole('button', { name: 'Table options' }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Table options' })).toHaveCount(
    0,
  );

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

test('table menu alignment persists as Markdown column alignment', async ({
  page,
}) => {
  const workspaceName = 'table-menu-alignment';
  await createBrowserWorkspaceAndNote(page, {
    workspaceName,
    noteName: 'Home',
  });

  const source = [
    '| Item | Count | Note |',
    '| --- | --- | --- |',
    '| Bolt | 2 | stocked |',
  ].join('\n');
  await writeStoredMarkdown(page, workspaceName, 'Home', source);
  await page.reload();

  const editor = getEditorLocator(page, {});
  await expect(editor.locator('table')).toBeVisible();

  await editor.locator('table td', { hasText: '2' }).click();
  await waitForEditorFocus(page, {});

  const trigger = page.getByRole('button', { name: 'Table options' });
  await expect(trigger).toBeVisible();
  await trigger.click();
  await page.getByRole('menuitemradio', { name: 'Center' }).click();

  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, 'Home'))
    .toBe(
      [
        '| Item | Count | Note |',
        '| --- | :---: | --- |',
        '| Bolt | 2 | stocked |',
      ].join('\n'),
    );

  await page.reload();
  await expect(editor.locator('table')).toBeVisible();
  await expect(editor.locator('table th').nth(1)).toHaveCSS(
    'text-align',
    'center',
  );
  await expect(editor.locator('table td').nth(1)).toHaveCSS(
    'text-align',
    'center',
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

test('table hugs its content width and empty neighbors delete into the table', async ({
  page,
}) => {
  const workspaceName = 'table-width-delete';
  await createBrowserWorkspaceAndNote(page, {
    workspaceName,
    noteName: 'Home',
  });

  const source = ['| a | b |', '| --- | --- |', '| c | d |'].join('\n');
  await writeStoredMarkdown(page, workspaceName, 'Home', source);
  await page.reload();

  const editor = getEditorLocator(page, {});
  await expect(editor.locator('table')).toBeVisible();

  // The editor is a column flexbox; the table must not stretch to the full
  // row width (which dumped all the slack into the widest column).
  const tableBox = await editor.locator('table').boundingBox();
  const editorBox = await editor.boundingBox();
  if (!tableBox || !editorBox) {
    throw new Error('Expected table and editor bounding boxes');
  }
  expect(tableBox.width).toBeLessThan(editorBox.width * 0.6);

  // ArrowUp inserts an empty paragraph above; forward-delete removes it
  // again instead of leaving the caret stuck at the table boundary.
  await editor.locator('table th').first().click();
  await waitForEditorFocus(page, {});
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Delete');
  await page.keyboard.insertText('in table');

  await expect(editor.locator('table th').first()).toHaveText('in tablea');
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, 'Home'))
    .toBe(['| in tablea | b |', '| --- | --- |', '| c | d |'].join('\n'));
});

test('Enter inserts a line break inside a cell that persists as <br>', async ({
  page,
}) => {
  const workspaceName = 'table-cell-linebreak';
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

  await page.keyboard.insertText('first');
  await page.keyboard.press('Enter');
  await page.keyboard.insertText('second');

  // The cell renders two lines and must not have been split into a new cell.
  await expect(editor.locator('table th').first().locator('br')).toHaveCount(1);
  await expect(editor.locator('table th')).toHaveCount(3);
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, 'Home'))
    .toContain('| first<br>second |');

  // The line break must survive a reload through the Markdown path.
  await page.reload();
  await expect(editor.locator('table th').first().locator('br')).toHaveCount(1);
  await expect(editor.locator('table th').first()).toHaveText('firstsecond');
});

test('the active cell is highlighted while editing', async ({ page }) => {
  const workspaceName = 'table-active-cell';
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

  const activeCell = editor.locator('.prosemirror-active-table-cell');
  await expect(activeCell).toHaveCount(1);
  await page.keyboard.insertText('here');
  await expect(activeCell).toHaveText('here');

  // The highlight follows the cursor to the next cell.
  await page.keyboard.press('Tab');
  await expect(activeCell).toHaveCount(1);
  await expect(activeCell).toHaveText('');

  // And disappears when the cursor leaves the table.
  await page.keyboard.press('ArrowUp');
  await expect(activeCell).toHaveCount(0);
});

test('deleting a fully selected table removes the whole table', async ({
  page,
}) => {
  const workspaceName = 'table-full-delete';
  await createBrowserWorkspaceAndNote(page, {
    workspaceName,
    noteName: 'Home',
  });

  const source = ['above', '', '| a | b |', '| --- | --- |', '| c | d |'].join(
    '\n',
  );
  await writeStoredMarkdown(page, workspaceName, 'Home', source);
  await page.reload();

  const editor = getEditorLocator(page, {});
  await expect(editor.locator('table')).toBeVisible();

  // Select every cell the way a mouse drag does: anchor in the first cell,
  // extend to the last cell.
  await editor.locator('table th').first().click();
  await waitForEditorFocus(page, {});
  await editor
    .locator('table td')
    .last()
    .click({ modifiers: ['Shift'] });
  await page.keyboard.press('Backspace');

  await expect(editor.locator('table')).toHaveCount(0);
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, 'Home'))
    .toBe('above');
});

test('dragging a table by its drag handle moves the whole table', async ({
  page,
}) => {
  const workspaceName = 'table-drag-move';
  await createBrowserWorkspaceAndNote(page, {
    workspaceName,
    noteName: 'Home',
  });

  const source = [
    'hello world',
    '',
    '| sdsda | asdsad |  |',
    '| --- | --- | --- |',
    '| sdsd | sadsad | asdas |',
    '| sdsd | sadasd | sdasd |',
  ].join('\n');
  await writeStoredMarkdown(page, workspaceName, 'Home', source);
  await page.reload();

  const editor = getEditorLocator(page, {});
  await expect(editor.locator('table')).toBeVisible();

  // Hovering the table reveals the block drag handle next to it.
  await editor.locator('table th').first().hover();
  const handle = page.locator('[data-drag-handle]');
  await expect(handle).toBeVisible();

  // Drop onto the start of the paragraph above: the table must move there
  // wholesale, without leaving an empty table skeleton at its old position.
  // Manual mouse events: dragTo() re-hovers the source, which repositions
  // the floating handle mid-gesture.
  const handleBox = await handle.boundingBox();
  const targetBox = await editor
    .locator('p', { hasText: 'hello world' })
    .boundingBox();
  if (!handleBox || !targetBox) {
    throw new Error('Expected drag handle and drop target bounding boxes');
  }
  await page.mouse.move(
    handleBox.x + handleBox.width / 2,
    handleBox.y + handleBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(targetBox.x + 5, targetBox.y + 3, { steps: 15 });
  await page.mouse.move(targetBox.x + 5, targetBox.y + 3);
  await page.mouse.up();

  await expect(editor.locator('table')).toHaveCount(1);
  await expect(editor.locator('table td', { hasText: 'sadsad' })).toBeVisible();
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, 'Home'))
    .toBe(
      [
        '| sdsda | asdsad |  |',
        '| --- | --- | --- |',
        '| sdsd | sadsad | asdas |',
        '| sdsd | sadasd | sdasd |',
        '',
        'hello world',
      ].join('\n'),
    );
});
