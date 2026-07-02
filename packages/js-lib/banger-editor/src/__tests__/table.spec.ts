// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';
import { setupBase } from '../base';
import { setupCodeBlock } from '../code-block';
import { setupHardBreak } from '../hard-break';
import { setupParagraph } from '../paragraph';
import { setupTable } from '../table';
import { createBangerEditorTestSetup } from '../test-helpers';

const table = setupTable();

const setup = createBangerEditorTestSetup({
  extensions: [
    setupBase(),
    setupParagraph(),
    setupCodeBlock(),
    setupHardBreak(),
    table,
  ],
  builderAliases: {
    doc: { nodeType: 'doc' },
    p: { nodeType: 'paragraph' },
    codeBlock: { nodeType: 'code_block', language: '' },
    table: { nodeType: 'table' },
    row: { nodeType: 'table_row' },
    th: { nodeType: 'table_header' },
    td: { nodeType: 'table_cell' },
  },
});

const doc = setup.nodeBuilder('doc');
const p = setup.nodeBuilder('p');
const tableNode = setup.nodeBuilder('table');
const row = setup.nodeBuilder('row');
const th = setup.nodeBuilder('th');
const td = setup.nodeBuilder('td');

afterEach(() => {
  setup.cleanup();
});

function docWithCursorInCell(cellText: string) {
  return doc(
    tableNode(
      row(th('h1'), th('h2')),
      row(td(`${cellText}<cursor>`), td('b2')),
      row(td('c1'), td('c2')),
    ),
  );
}

describe('insertTable', () => {
  it('inserts a table with a header row and places the cursor inside', () => {
    const editor = setup.createEditor(doc(p('hello<cursor>')));
    const handled = table.command.insertTable()(
      editor.view.state,
      editor.view.dispatch,
    );

    expect(handled).toBe(true);
    const inserted = editor.view.state.doc.child(1);
    expect(inserted.type.name).toBe('table');
    expect(inserted.childCount).toBe(3);
    expect(inserted.child(0).child(0).type.name).toBe('table_header');
    expect(inserted.child(0).childCount).toBe(3);
    expect(inserted.child(1).child(0).type.name).toBe('table_cell');
    expect(editor.selectionParentType()).toBe('table_header');
  });

  it('does not insert a table inside a table', () => {
    const editor = setup.createEditor(docWithCursorInCell('a1'));
    expect(table.command.insertTable()(editor.view.state)).toBe(false);
  });

  it('respects a custom size', () => {
    const editor = setup.createEditor(doc(p('<cursor>')));
    table.command.insertTable({ rows: 2, columns: 4 })(
      editor.view.state,
      editor.view.dispatch,
    );
    const inserted = editor.view.state.doc.child(0);
    expect(inserted.type.name).toBe('table');
    expect(inserted.childCount).toBe(2);
    expect(inserted.child(0).childCount).toBe(4);
  });
});

describe('row and column commands', () => {
  it('addRowBelow adds a body row of matching width', () => {
    const editor = setup.createEditor(docWithCursorInCell('a1'));
    table.command.addRowBelow(editor.view.state, editor.view.dispatch);

    const tableDoc = editor.view.state.doc.child(0);
    expect(tableDoc.childCount).toBe(4);
    expect(tableDoc.child(2).childCount).toBe(2);
    expect(tableDoc.child(2).child(0).type.name).toBe('table_cell');
    expect(tableDoc.child(2).textContent).toBe('');
  });

  it('addRowAbove refuses to add a row above the header', () => {
    const editor = setup.createEditor(
      doc(tableNode(row(th('h<cursor>')), row(td('a')))),
    );
    expect(table.command.addRowAbove(editor.view.state)).toBe(false);
  });

  it('addRowAbove adds a row above a body row', () => {
    const editor = setup.createEditor(docWithCursorInCell('a1'));
    table.command.addRowAbove(editor.view.state, editor.view.dispatch);

    const tableDoc = editor.view.state.doc.child(0);
    expect(tableDoc.childCount).toBe(4);
    expect(tableDoc.child(1).textContent).toBe('');
    expect(tableDoc.child(2).textContent).toBe('a1b2');
  });

  it('deleteRow removes the active row', () => {
    const editor = setup.createEditor(docWithCursorInCell('a1'));
    table.command.deleteRow(editor.view.state, editor.view.dispatch);

    const tableDoc = editor.view.state.doc.child(0);
    expect(tableDoc.childCount).toBe(2);
    expect(tableDoc.child(1).textContent).toBe('c1c2');
  });

  it('addColumnRight keeps header cells in the header row', () => {
    const editor = setup.createEditor(docWithCursorInCell('a1'));
    table.command.addColumnRight(editor.view.state, editor.view.dispatch);

    const tableDoc = editor.view.state.doc.child(0);
    expect(tableDoc.child(0).childCount).toBe(3);
    expect(tableDoc.child(0).child(1).type.name).toBe('table_header');
    expect(tableDoc.child(1).child(1).type.name).toBe('table_cell');
    expect(tableDoc.child(1).child(1).textContent).toBe('');
  });

  it('addColumnLeft inserts before the active column', () => {
    const editor = setup.createEditor(docWithCursorInCell('a1'));
    table.command.addColumnLeft(editor.view.state, editor.view.dispatch);

    const tableDoc = editor.view.state.doc.child(0);
    expect(tableDoc.child(1).childCount).toBe(3);
    expect(tableDoc.child(1).child(0).textContent).toBe('');
    expect(tableDoc.child(1).child(1).textContent).toBe('a1');
  });

  it('deleteColumn removes the active column from every row', () => {
    const editor = setup.createEditor(docWithCursorInCell('a1'));
    table.command.deleteColumn(editor.view.state, editor.view.dispatch);

    const tableDoc = editor.view.state.doc.child(0);
    expect(tableDoc.child(0).childCount).toBe(1);
    expect(tableDoc.child(0).textContent).toBe('h2');
    expect(tableDoc.child(1).textContent).toBe('b2');
  });

  it('deleteTable removes the whole table', () => {
    const editor = setup.createEditor(docWithCursorInCell('a1'));
    table.command.deleteTable(editor.view.state, editor.view.dispatch);
    expect(editor.view.state.doc.firstChild?.type.name).toBe('paragraph');
  });

  it('setColumnAlign updates every cell of the column', () => {
    const editor = setup.createEditor(docWithCursorInCell('a1'));
    table.command.setColumnAlign('center')(
      editor.view.state,
      editor.view.dispatch,
    );

    const tableDoc = editor.view.state.doc.child(0);
    expect(tableDoc.child(0).child(0).attrs.align).toBe('center');
    expect(tableDoc.child(1).child(0).attrs.align).toBe('center');
    expect(tableDoc.child(2).child(0).attrs.align).toBe('center');
    expect(tableDoc.child(0).child(1).attrs.align).toBe(null);
  });
});

describe('keyboard behavior', () => {
  it('Tab moves to the next cell', () => {
    const editor = setup.createEditor(docWithCursorInCell('a1'));
    expect(editor.pressKey('Tab')).toBe(true);
    expect(editor.selectionParentText()).toBe('b2');
  });

  it('Shift-Tab moves to the previous cell', () => {
    const editor = setup.createEditor(docWithCursorInCell('a1'));
    expect(editor.pressKey('Tab', { shiftKey: true })).toBe(true);
    expect(editor.selectionParentText()).toBe('h2');
  });

  it('Tab in the last cell adds a row and moves into it', () => {
    const editor = setup.createEditor(
      doc(tableNode(row(th('h')), row(td('a<cursor>')))),
    );
    expect(editor.pressKey('Tab')).toBe(true);

    const tableDoc = editor.view.state.doc.child(0);
    expect(tableDoc.childCount).toBe(3);
    expect(editor.selectionParentType()).toBe('table_cell');
    expect(editor.selectionParentText()).toBe('');
  });

  it('Shift-Tab in the first cell keeps the selection in place', () => {
    const editor = setup.createEditor(
      doc(tableNode(row(th('h<cursor>')), row(td('a')))),
    );
    const before = editor.view.state.doc;
    expect(editor.pressKey('Tab', { shiftKey: true })).toBe(true);
    expect(editor.view.state.doc.eq(before)).toBe(true);
    expect(editor.selectionParentText()).toBe('h');
  });

  it('Enter moves to the cell below instead of splitting the cell', () => {
    const editor = setup.createEditor(docWithCursorInCell('a1'));
    expect(editor.pressKey('Enter')).toBe(true);
    expect(editor.selectionParentText()).toBe('c1');
    expect(editor.view.state.doc.child(0).childCount).toBe(3);
  });

  it('Enter in the last row does not change the document', () => {
    const editor = setup.createEditor(
      doc(tableNode(row(th('h')), row(td('a<cursor>')))),
    );
    const before = editor.view.state.doc;
    expect(editor.pressKey('Enter')).toBe(true);
    expect(editor.view.state.doc.eq(before)).toBe(true);
  });

  it('Shift-Enter does not insert a hard break inside a cell', () => {
    const editor = setup.createEditor(docWithCursorInCell('a1'));
    expect(editor.pressKey('Enter', { shiftKey: true })).toBe(true);
    const cell = editor.view.state.doc.child(0).child(1).child(0);
    expect(cell.textContent).toBe('a1');
    expect(cell.childCount).toBe(1);
  });

  it('Shift-Enter outside a table still inserts a hard break', () => {
    const editor = setup.createEditor(doc(p('a<cursor>')));
    expect(editor.pressKey('Enter', { shiftKey: true })).toBe(true);
    const para = editor.view.state.doc.child(0);
    expect(para.child(1)?.type.name).toBe('hard_break');
  });
});

describe('queries', () => {
  it('reports the active cell', () => {
    const editor = setup.createEditor(docWithCursorInCell('a1'));
    const active = table.query.activeTableCell(editor.view.state);
    expect(active).toMatchObject({
      rowIndex: 1,
      columnIndex: 0,
      isHeaderRow: false,
      align: null,
    });
    expect(table.query.isTableActive(editor.view.state)).toBe(true);
  });

  it('reports nothing outside a table', () => {
    const editor = setup.createEditor(doc(p('a<cursor>')));
    expect(table.query.activeTableCell(editor.view.state)).toBe(undefined);
    expect(table.query.isTableActive(editor.view.state)).toBe(false);
  });
});
