import { expect, test } from '@playwright/test';
import {
  getEditorLocator,
  readSeededBrowserNote,
  seedBrowserWorkspaceAndNote,
  waitForEditorFocus,
  waitForSeededBrowserNote,
} from './common';

test('creates, edits, persists, and reloads a slash-inserted table', async ({
  page,
}) => {
  const note = await seedBrowserWorkspaceAndNote(page, {
    noteName: 'Home',
    workspaceName: 'table-slash-insert',
  });
  const editor = getEditorLocator(page, {});

  await editor.click();
  await waitForEditorFocus(page, {});
  await page.keyboard.insertText('/');
  const slashMenu = page.getByTestId('slash-command-menu');
  await expect(slashMenu).toBeVisible();
  await slashMenu
    .getByRole('option', {
      exact: true,
      name: 'Table Insert a simple table',
    })
    .click();

  const table = editor.getByRole('table');
  const activeCell = editor.locator('.prosemirror-active-table-cell');
  await expect(table).toBeVisible();
  await expect(table.getByRole('row')).toHaveCount(3);
  await expect(activeCell).toHaveCount(1);
  await expect(activeCell).toHaveCSS('outline-style', 'solid');
  await expect(activeCell).toHaveCSS('outline-width', '2px');

  await page.keyboard.insertText('Name');
  await page.keyboard.press('Tab');
  await page.keyboard.insertText('Status');
  await page.keyboard.press('Tab');
  await page.keyboard.insertText('Type');
  await page.keyboard.press('Tab');
  await page.keyboard.insertText('Alpha');
  await page.keyboard.press('Enter');
  await page.keyboard.insertText('Ready');
  for (const value of ['Done', 'First', 'Beta', 'Queued', 'Second']) {
    await page.keyboard.press('Tab');
    await page.keyboard.insertText(value);
  }
  // Tab from the final cell creates a new row and moves into its first cell.
  await page.keyboard.press('Tab');
  await page.keyboard.insertText('New');
  await expect(table.getByRole('row')).toHaveCount(4);

  const expected = [
    '| Name | Status | Type |',
    '| --- | --- | --- |',
    '| Alpha<br>Ready | Done | First |',
    '| Beta | Queued | Second |',
    '| New |  |  |',
  ].join('\n');
  await expect.poll(() => readSeededBrowserNote(page, note)).toBe(expected);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForSeededBrowserNote(page, note);
  await expect(table).toBeVisible();
  await expect(table.getByRole('columnheader', { name: 'Name' })).toBeVisible();
  const reloadedAlphaCell = table
    .getByRole('cell')
    .filter({ hasText: 'Alpha' });
  await expect(reloadedAlphaCell).toHaveText('AlphaReady');
  await expect(reloadedAlphaCell.locator('br')).toHaveCount(1);
});

test('table options preserve rich Markdown and accessible editor behavior', async ({
  page,
}) => {
  const source = [
    '# Inventory',
    '',
    '| Item | Count | Note |',
    '| :--- | ---: | --- |',
    '| Bolt `a \\| b` | 2 | [docs](https://example.com) |',
    '| Nut | 9 | **important** |',
  ].join('\n');
  const note = await seedBrowserWorkspaceAndNote(page, {
    initialMarkdown: source,
    noteName: 'Home',
    workspaceName: 'table-rich-options',
  });
  const editor = getEditorLocator(page, {});
  const table = editor.getByRole('table');
  const tableTrigger = page.getByRole('button', { name: 'Table options' });

  await expect(table).toBeVisible();
  await expect(table.getByRole('columnheader', { name: 'Item' })).toBeVisible();
  await expect(table.locator('code')).toHaveText('a | b');
  await expect(table.getByRole('link', { name: 'docs' })).toBeVisible();
  await expect(table.locator('strong')).toHaveText('important');

  await table.getByRole('cell', { name: /^Nut$/ }).click();
  await waitForEditorFocus(page, {});
  await expect(tableTrigger).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(tableTrigger).toHaveCount(0);
  await page.keyboard.press('End');
  await expect(tableTrigger).toHaveCount(0);
  await page.keyboard.insertText('meg');
  await expect(tableTrigger).toBeVisible();

  const openMenuWithKeyboard = async () => {
    await tableTrigger.focus();
    await expect(tableTrigger).toBeFocused();
    await page.keyboard.press('Enter');
    const menu = page.getByRole('menu');
    await expect(menu).toBeVisible();
    return menu;
  };

  await table.getByRole('columnheader', { name: 'Item' }).click();
  await waitForEditorFocus(page, {});
  let menu = await openMenuWithKeyboard();
  await expect(
    menu.getByRole('menuitem', { name: 'Add row above' }),
  ).toBeDisabled();
  await page.keyboard.press('Escape');
  await waitForEditorFocus(page, {});

  await table.getByRole('cell', { name: /^Nutmeg$/ }).click();
  await expect(editor.locator('.prosemirror-active-table-cell')).toHaveText(
    'Nutmeg',
  );
  menu = await openMenuWithKeyboard();
  await menu.getByRole('menuitem', { name: 'Add row below' }).press('Enter');
  await expect(table.getByRole('row')).toHaveCount(4);
  await waitForEditorFocus(page, {});

  await table.getByRole('row').last().getByRole('cell').first().click();
  await expect(editor.locator('.prosemirror-active-table-cell')).toHaveText('');
  menu = await openMenuWithKeyboard();
  await menu.getByRole('menuitem', { name: 'Delete row' }).press('Enter');
  await expect(table.getByRole('row')).toHaveCount(3);
  await waitForEditorFocus(page, {});

  await table.getByRole('cell', { name: '2' }).click();
  menu = await openMenuWithKeyboard();
  const center = menu.getByRole('menuitemradio', { name: 'Center' });
  await center.focus();
  await page.keyboard.press('Space');
  await expect(center).toHaveAttribute('aria-checked', 'true');
  await page.keyboard.press('Escape');
  await waitForEditorFocus(page, {});

  const expected = [
    '# Inventory',
    '',
    '| Item | Count | Note |',
    '| :--- | :---: | --- |',
    '| Bolt `a \\| b` | 2 | [docs](https://example.com) |',
    '| Nutmeg | 9 | **important** |',
  ].join('\n');
  await expect.poll(() => readSeededBrowserNote(page, note)).toBe(expected);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForSeededBrowserNote(page, note);
  await expect(table).toBeVisible();
  await expect(table.locator('code')).toHaveText('a | b');
  await expect(table.getByRole('link', { name: 'docs' })).toBeVisible();
  await expect(table.locator('strong')).toHaveText('important');
  await expect(table.getByRole('columnheader').nth(1)).toHaveCSS(
    'text-align',
    'center',
  );
  await expect(table.getByRole('cell').nth(1)).toHaveCSS(
    'text-align',
    'center',
  );
});

test('wrapped table cells use browser geometry for vertical navigation', async ({
  page,
}) => {
  await page.setViewportSize({ height: 800, width: 420 });
  const longCell =
    'This deliberately long cell wraps across several visual lines in the narrow editor.';
  await seedBrowserWorkspaceAndNote(page, {
    initialMarkdown: [
      '| Description | Next |',
      '| --- | --- |',
      `| ${longCell} | side |`,
      '| below | next |',
    ].join('\n'),
    noteName: 'Home',
    workspaceName: 'table-wrapped-vertical',
  });
  const editor = getEditorLocator(page, {});
  const wrappedCell = editor.getByRole('cell', { name: longCell });
  const geometry = await wrappedCell.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      height: element.getBoundingClientRect().height,
      lineHeight: Number.parseFloat(style.lineHeight),
    };
  });
  expect(geometry.height).toBeGreaterThan(geometry.lineHeight * 2);

  const box = await wrappedCell.boundingBox();
  if (!box) {
    throw new Error('Expected the wrapped table cell to be visible');
  }
  const selectedCellText = () =>
    page.evaluate(() => {
      const anchor = window.getSelection()?.anchorNode;
      const anchorElement =
        anchor instanceof Element ? anchor : anchor?.parentElement;
      return anchorElement?.closest('td, th')?.textContent ?? null;
    });

  await wrappedCell.click({
    position: { x: Math.min(24, box.width - 4), y: geometry.lineHeight / 2 },
  });
  await waitForEditorFocus(page, {});
  await page.keyboard.press('ArrowDown');
  await expect.poll(selectedCellText).toBe(longCell);

  await wrappedCell.click({
    position: { x: Math.min(24, box.width - 4), y: box.height - 6 },
  });
  await page.keyboard.press('ArrowDown');
  await expect.poll(selectedCellText).toBe('below');
});

test('compact tables hug their content width', async ({ page }) => {
  await page.setViewportSize({ height: 800, width: 1280 });
  await seedBrowserWorkspaceAndNote(page, {
    initialMarkdown: ['| a | b |', '| --- | --- |', '| c | d |'].join('\n'),
    noteName: 'Home',
    workspaceName: 'table-content-width',
  });
  const editor = getEditorLocator(page, {});
  const table = editor.getByRole('table');
  const [editorBox, tableBox] = await Promise.all([
    editor.boundingBox(),
    table.boundingBox(),
  ]);
  if (!editorBox || !tableBox) {
    throw new Error('Expected editor and table bounding boxes');
  }
  const layout = await table.evaluate((element) => {
    const cells = [...element.querySelectorAll('th, td')];
    const headerMinWidth = cells
      .filter((cell) => cell.tagName === 'TH')
      .reduce(
        (total, cell) =>
          total + Number.parseFloat(getComputedStyle(cell).minWidth),
        0,
      );
    return {
      clientWidth: element.clientWidth,
      headerMinWidth,
      scrollWidth: element.scrollWidth,
      hasClippedCell: cells.some(
        (cell) => cell.scrollWidth > cell.clientWidth + 1,
      ),
    };
  });

  expect(tableBox.width).toBeLessThan(editorBox.width * 0.6);
  expect(tableBox.width).toBeGreaterThanOrEqual(layout.headerMinWidth);
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth + 1);
  expect(layout.hasClippedCell).toBe(false);
});

test('Backspace deletes a whole native CellSelection without removing nearby content', async ({
  page,
}) => {
  const note = await seedBrowserWorkspaceAndNote(page, {
    initialMarkdown: [
      'before',
      '',
      '| a | b |',
      '| --- | --- |',
      '| c | d |',
      '',
      'after',
    ].join('\n'),
    noteName: 'Home',
    workspaceName: 'table-cell-selection-delete',
  });
  const editor = getEditorLocator(page, {});
  const table = editor.getByRole('table');
  const firstCell = table.getByRole('columnheader').first();
  const lastCell = table.getByRole('cell').last();
  const selectedCells = table.locator('.selectedCell');

  await expect(async () => {
    await firstCell.click();
    await waitForEditorFocus(page, {});
    await lastCell.click({ modifiers: ['Shift'] });
    await expect(selectedCells).toHaveCount(4);
  }).toPass();
  await expect(editor.locator('.prosemirror-active-table-cell')).toHaveCount(0);
  await page.keyboard.press('Backspace');

  await expect(table).toHaveCount(0);
  await expect(editor.getByText('before', { exact: true })).toBeVisible();
  await expect(editor.getByText('after', { exact: true })).toBeVisible();
  await expect
    .poll(() => readSeededBrowserNote(page, note))
    .toBe('before\n\nafter');
});

test('dragging a table handle moves one complete table without a hollow source', async ({
  page,
}) => {
  const note = await seedBrowserWorkspaceAndNote(page, {
    initialMarkdown: [
      'Before table',
      '',
      '| A | B |',
      '| --- | --- |',
      '| one | two |',
      '',
      'After table',
    ].join('\n'),
    noteName: 'Home',
    workspaceName: 'table-drag-move',
  });
  const editor = getEditorLocator(page, {});
  const table = editor.getByRole('table');
  await table.getByRole('columnheader').first().hover();
  const handle = page.locator('[data-drag-handle]');
  await expect(handle).toBeVisible();

  const [handleBox, targetBox] = await Promise.all([
    handle.boundingBox(),
    editor.getByText('Before table', { exact: true }).boundingBox(),
  ]);
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

  await expect(table).toHaveCount(1);
  await expect(table.getByRole('cell')).toHaveText(['one', 'two']);
  await expect
    .poll(() => readSeededBrowserNote(page, note))
    .toBe(
      [
        '| A | B |',
        '| --- | --- |',
        '| one | two |',
        '',
        'Before table',
        '',
        'After table',
      ].join('\n'),
    );
});
