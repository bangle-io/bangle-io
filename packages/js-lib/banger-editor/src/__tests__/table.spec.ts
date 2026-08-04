// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { setupBase } from '../base';
import { setupCodeBlock } from '../code-block';
import { setupHardBreak } from '../hard-break';
import { setupParagraph } from '../paragraph';
import { CellSelection, NodeSelection } from '../pm';
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

  it('Enter inserts a line break inside the cell', () => {
    const editor = setup.createEditor(docWithCursorInCell('a1'));
    expect(editor.pressKey('Enter')).toBe(true);
    const cell = editor.view.state.doc.child(0).child(1).child(0);
    expect(cell.childCount).toBe(2);
    expect(cell.child(1).type.name).toBe('hard_break');
    // The cell must not have been split into a new sibling cell.
    expect(editor.view.state.doc.child(0).child(1).childCount).toBe(2);
  });

  it('Shift-Enter inserts a line break inside the cell', () => {
    const editor = setup.createEditor(docWithCursorInCell('a1'));
    expect(editor.pressKey('Enter', { shiftKey: true })).toBe(true);
    const cell = editor.view.state.doc.child(0).child(1).child(0);
    expect(cell.child(1).type.name).toBe('hard_break');
  });

  it('Mod-Enter exits below the table', () => {
    const editor = setup.createEditor(
      doc(tableNode(row(th('h')), row(td('a<cursor>')))),
    );
    expect(editor.pressKey('Enter', { ctrlKey: true })).toBe(true);
    expect(editor.view.state.doc.child(1).type.name).toBe('paragraph');
    expect(editor.selectionParentType()).toBe('paragraph');
  });

  it('Shift-Enter outside a table still inserts a hard break', () => {
    const editor = setup.createEditor(doc(p('a<cursor>')));
    expect(editor.pressKey('Enter', { shiftKey: true })).toBe(true);
    const para = editor.view.state.doc.child(0);
    expect(para.child(1)?.type.name).toBe('hard_break');
  });
});

describe('arrow-key boundary behavior', () => {
  it('lets the browser keep vertical motion within a wrapped cell before moving rows', () => {
    const editor = setup.createEditor(
      doc(tableNode(row(th('wrapped<cursor>')), row(td('next')))),
    );
    const endOfTextblock = vi
      .spyOn(editor.view, 'endOfTextblock')
      .mockReturnValue(false);

    expect(editor.runKeyDownHandlers('ArrowDown')).toBe(false);
    expect(endOfTextblock).toHaveBeenCalledExactlyOnceWith('down');
    expect(editor.selectionParentText()).toBe('wrapped');

    endOfTextblock.mockReturnValue(true);
    expect(editor.pressKey('ArrowDown')).toBe(true);
    expect(editor.selectionParentText()).toBe('next');
  });

  it('lets the browser keep ArrowUp motion within a wrapped cell before leaving the table', () => {
    const editor = setup.createEditor(
      doc(p('before'), tableNode(row(th('wrapped<cursor>')), row(td('next')))),
    );
    const endOfTextblock = vi
      .spyOn(editor.view, 'endOfTextblock')
      .mockReturnValue(false);

    expect(editor.runKeyDownHandlers('ArrowUp')).toBe(false);
    expect(endOfTextblock).toHaveBeenCalledExactlyOnceWith('up');
    expect(editor.selectionParentText()).toBe('wrapped');

    endOfTextblock.mockReturnValue(true);
    expect(editor.pressKey('ArrowUp')).toBe(true);
    expect(editor.selectionParentType()).toBe('paragraph');
    expect(editor.selectionParentText()).toBe('before');
  });

  it('ArrowUp on the first row moves into the textblock above', () => {
    const editor = setup.createEditor(
      doc(p('before'), tableNode(row(th('h<cursor>')), row(td('a')))),
    );
    expect(editor.pressKey('ArrowUp')).toBe(true);
    expect(editor.selectionParentType()).toBe('paragraph');
    expect(editor.selectionParentText()).toBe('before');
  });

  it('ArrowUp on the first row inserts a paragraph when nothing is above', () => {
    const editor = setup.createEditor(
      doc(tableNode(row(th('h<cursor>')), row(td('a')))),
    );
    expect(editor.pressKey('ArrowUp')).toBe(true);
    expect(editor.view.state.doc.child(0).type.name).toBe('paragraph');
    expect(editor.selectionParentType()).toBe('paragraph');
    expect(editor.view.state.doc.child(1).type.name).toBe('table');
  });

  it('ArrowUp on a body row stays inside the table', () => {
    const editor = setup.createEditor(
      doc(tableNode(row(th('h')), row(td('a<cursor>')))),
    );
    editor.pressKey('ArrowUp');
    expect(editor.view.state.doc.childCount).toBe(1);
    expect(editor.view.state.doc.child(0).type.name).toBe('table');
  });

  it('ArrowDown on the last row moves into the textblock below', () => {
    const editor = setup.createEditor(
      doc(tableNode(row(th('h')), row(td('a<cursor>'))), p('after')),
    );
    expect(editor.pressKey('ArrowDown')).toBe(true);
    expect(editor.selectionParentText()).toBe('after');
  });

  it('ArrowDown on the last row inserts a paragraph when nothing is below', () => {
    const editor = setup.createEditor(
      doc(tableNode(row(th('h')), row(td('a<cursor>')))),
    );
    expect(editor.pressKey('ArrowDown')).toBe(true);
    expect(editor.view.state.doc.child(1).type.name).toBe('paragraph');
    expect(editor.selectionParentType()).toBe('paragraph');
  });

  it('ArrowRight at the end of a cell moves to the start of the next cell', () => {
    const editor = setup.createEditor(
      doc(tableNode(row(th('h1'), th('h2')), row(td('a1<cursor>'), td('b1')))),
    );
    expect(editor.pressKey('ArrowRight')).toBe(true);
    expect(editor.selectionParentText()).toBe('b1');
    expect(editor.selectionParentOffset()).toBe(0);
  });

  it('ArrowLeft at the start of a cell wraps to the end of the previous row', () => {
    const editor = setup.createEditor(
      doc(tableNode(row(th('h1'), th('h2')), row(td('<cursor>a1'), td('b1')))),
    );
    expect(editor.pressKey('ArrowLeft')).toBe(true);
    expect(editor.selectionParentText()).toBe('h2');
    expect(editor.selectionParentOffset()).toBe(2);
  });

  it('ArrowRight in the last cell exits below the table', () => {
    const editor = setup.createEditor(
      doc(tableNode(row(th('h')), row(td('a<cursor>'))), p('after')),
    );
    expect(editor.pressKey('ArrowRight')).toBe(true);
    expect(editor.selectionParentText()).toBe('after');
  });

  it('ArrowLeft in the first cell exits above the table', () => {
    const editor = setup.createEditor(
      doc(tableNode(row(th('<cursor>h')), row(td('a')))),
    );
    expect(editor.pressKey('ArrowLeft')).toBe(true);
    expect(editor.view.state.doc.child(0).type.name).toBe('paragraph');
    expect(editor.selectionParentType()).toBe('paragraph');
  });

  it('ArrowDown in a paragraph above a table enters the first cell', () => {
    const editor = setup.createEditor(
      doc(p('above<cursor>'), tableNode(row(th('h')), row(td('a')))),
    );
    expect(editor.pressKey('ArrowDown')).toBe(true);
    expect(editor.selectionParentType()).toBe('table_header');
    expect(editor.selectionParentOffset()).toBe(0);
  });

  it('ArrowUp in a paragraph below a table enters the last cell', () => {
    const editor = setup.createEditor(
      doc(tableNode(row(th('h')), row(td('a'), td('b'))), p('<cursor>below')),
    );
    expect(editor.pressKey('ArrowUp')).toBe(true);
    expect(editor.selectionParentType()).toBe('table_cell');
    expect(editor.selectionParentText()).toBe('b');
    expect(editor.selectionParentOffset()).toBe(1);
  });

  it('ArrowDown moves to the cell below within the table', () => {
    const editor = setup.createEditor(
      doc(tableNode(row(th('h1'), th('h2')), row(td('a1'), td('a<cursor>2')))),
    );
    // Cursor in header h2 -> down goes to a2 (same column).
    editor.setSelection(editor.view.state.doc.resolve(8).pos);
    expect(editor.pressKey('ArrowDown')).toBe(true);
    expect(editor.selectionParentText()).toBe('a2');
  });

  it('ArrowRight mid-cell falls through to default text motion', () => {
    const editor = setup.createEditor(
      doc(tableNode(row(th('h')), row(td('a<cursor>b')))),
    );
    const handled = editor.runKeyDownHandlers('ArrowRight');
    expect(handled).toBe(false);
  });
});

describe('active table cell decoration', () => {
  it('follows a text cursor and clears for cell selections and content outside the table', () => {
    const editor = setup.createEditor(
      doc(
        tableNode(row(th('h1'), th('h2')), row(td('a1<cursor>'), td('b1'))),
        p('outside'),
      ),
    );
    const activeCells = () =>
      editor.view.dom.querySelectorAll('.prosemirror-active-table-cell');

    expect(activeCells()).toHaveLength(1);
    expect(activeCells()[0]?.textContent).toBe('a1');

    const cellPositions: number[] = [];
    editor.view.state.doc.descendants((node, pos) => {
      if (
        node.type.name === 'table_header' ||
        node.type.name === 'table_cell'
      ) {
        cellPositions.push(pos);
      }
      return true;
    });
    const firstCell = cellPositions[0];
    const lastCell = cellPositions.at(-1);
    if (firstCell == null || lastCell == null) {
      throw new Error('Expected table cells');
    }
    const nextCell = cellPositions[3];
    if (nextCell == null) {
      throw new Error('Expected another body cell');
    }
    editor.setSelection(nextCell + 1);
    expect(activeCells()).toHaveLength(1);
    expect(activeCells()[0]?.textContent).toBe('b1');

    editor.view.dispatch(
      editor.view.state.tr.setSelection(
        new CellSelection(
          editor.view.state.doc.resolve(firstCell),
          editor.view.state.doc.resolve(lastCell),
        ),
      ),
    );
    expect(activeCells()).toHaveLength(0);

    let outsidePos: number | undefined;
    editor.view.state.doc.descendants((node, pos) => {
      if (node.type.name === 'paragraph' && node.textContent === 'outside') {
        outsidePos = pos + 1;
        return false;
      }
      return true;
    });
    if (outsidePos == null) {
      throw new Error('Expected paragraph outside the table');
    }
    editor.setSelection(outsidePos);
    expect(activeCells()).toHaveLength(0);
  });
});

describe('moving a whole table (drag handle path)', () => {
  // The drag handle node-selects the table, then the drop deletes the
  // source selection. tableEditing must not rewrite that NodeSelection into
  // a CellSelection, or the deletion only empties the cells and leaves a
  // hollow table skeleton behind.
  function selectTableNode(editor: ReturnType<typeof setup.createEditor>) {
    const view = editor.view;
    let tablePos = -1;
    view.state.doc.forEach((node, offset) => {
      if (node.type.name === 'table' && tablePos < 0) {
        tablePos = offset;
      }
    });
    view.dispatch(
      view.state.tr.setSelection(
        NodeSelection.create(view.state.doc, tablePos),
      ),
    );
    return view;
  }

  it('a table NodeSelection survives dispatch instead of becoming a CellSelection', () => {
    const editor = setup.createEditor(
      doc(
        p('hello world'),
        tableNode(row(th('a'), th('b')), row(td('c'), td('d'))),
      ),
    );
    const view = selectTableNode(editor);

    const selection = view.state.selection;
    expect(selection instanceof NodeSelection).toBe(true);
    expect(selection instanceof NodeSelection && selection.node.type.name).toBe(
      'table',
    );
  });

  it('deleting the selected table removes it entirely, not just its cells', () => {
    const editor = setup.createEditor(
      doc(
        p('hello world'),
        tableNode(row(th('a'), th('b')), row(td('c'), td('d'))),
      ),
    );
    const view = selectTableNode(editor);

    // This is exactly what prosemirror-view's drop handler does for the
    // moved source.
    view.dispatch(view.state.tr.deleteSelection());

    expect(view.state.doc.childCount).toBe(1);
    expect(view.state.doc.child(0).type.name).toBe('paragraph');
    let tables = 0;
    view.state.doc.descendants((node) => {
      if (node.type.name === 'table') {
        tables++;
      }
      return true;
    });
    expect(tables).toBe(0);
  });

  it('the node-selected table slice carries the whole table for the drop', () => {
    const editor = setup.createEditor(
      doc(tableNode(row(th('a'), th('b')), row(td('c'), td('d')))),
    );
    const view = selectTableNode(editor);

    const slice = view.state.selection.content();
    expect(slice.content.childCount).toBe(1);
    expect(slice.content.child(0).type.name).toBe('table');
    expect(slice.content.child(0).textContent).toBe('abcd');
  });
});

describe('deleting a fully selected table', () => {
  it('Backspace on a whole-table cell selection deletes the table', () => {
    const editor = setup.createEditor(
      doc(p('keep'), tableNode(row(th('h<cursor>')), row(td('a')))),
    );
    // Select every cell the way a mouse drag across the table does.
    const view = editor.view;
    const cmd = table.command;
    // Build the full CellSelection via shift-click semantics: anchor first
    // cell, head last cell.
    const docNode = view.state.doc;
    let firstCell = -1;
    let lastCell = -1;
    docNode.descendants((node, pos) => {
      if (
        node.type.name === 'table_header' ||
        node.type.name === 'table_cell'
      ) {
        if (firstCell < 0) {
          firstCell = pos;
        }
        lastCell = pos;
      }
      return true;
    });
    view.dispatch(
      view.state.tr.setSelection(
        new CellSelection(
          view.state.doc.resolve(firstCell),
          view.state.doc.resolve(lastCell),
        ),
      ),
    );
    expect(editor.pressKey('Backspace')).toBe(true);
    expect(view.state.doc.childCount).toBe(1);
    expect(view.state.doc.child(0).textContent).toBe('keep');
    expect(cmd.deleteTable(view.state)).toBe(false);
  });

  it('Backspace on a partial cell selection only clears those cells', () => {
    const editor = setup.createEditor(
      doc(tableNode(row(th('h1'), th('h2')), row(td('a1'), td('a2')))),
    );
    const view = editor.view;
    let firstCell = -1;
    let secondCell = -1;
    view.state.doc.descendants((node, pos) => {
      if (node.type.name === 'table_header') {
        if (firstCell < 0) {
          firstCell = pos;
        } else if (secondCell < 0) {
          secondCell = pos;
        }
      }
      return true;
    });
    view.dispatch(
      view.state.tr.setSelection(
        new CellSelection(
          view.state.doc.resolve(firstCell),
          view.state.doc.resolve(secondCell),
        ),
      ),
    );
    editor.pressKey('Backspace');
    const tableDoc = view.state.doc.child(0);
    expect(view.state.doc.childCount).toBe(1);
    expect(tableDoc.child(0).textContent).toBe('');
    expect(tableDoc.child(1).textContent).toBe('a1a2');
  });
});

describe('deleting empty blocks around tables', () => {
  it('forward-delete removes an empty paragraph directly before a table', () => {
    const editor = setup.createEditor(
      doc(p('<cursor>'), tableNode(row(th('h')), row(td('a')))),
    );
    expect(editor.pressKey('Delete')).toBe(true);
    expect(editor.view.state.doc.childCount).toBe(1);
    expect(editor.view.state.doc.child(0).type.name).toBe('table');
    expect(editor.selectionParentType()).toBe('table_header');
  });

  it('Backspace removes an empty paragraph directly after a table', () => {
    const editor = setup.createEditor(
      doc(tableNode(row(th('h')), row(td('a'))), p('<cursor>')),
    );
    expect(editor.pressKey('Backspace')).toBe(true);
    expect(editor.view.state.doc.childCount).toBe(1);
    expect(editor.selectionParentType()).toBe('table_cell');
    expect(editor.selectionParentText()).toBe('a');
  });

  it('forward-delete leaves a non-empty paragraph before a table alone', () => {
    const editor = setup.createEditor(
      doc(p('text<cursor>'), tableNode(row(th('h')), row(td('a')))),
    );
    editor.pressKey('Delete');
    expect(editor.view.state.doc.childCount).toBe(2);
    expect(editor.view.state.doc.child(0).textContent).toBe('text');
  });

  it('Backspace inside an empty cell does not delete anything', () => {
    const editor = setup.createEditor(
      doc(tableNode(row(th('h')), row(td('<cursor>'), td('b')))),
    );
    editor.pressKey('Backspace');
    const tableDoc = editor.view.state.doc.child(0);
    expect(tableDoc.child(1).childCount).toBe(2);
    expect(tableDoc.textContent).toBe('hb');
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
