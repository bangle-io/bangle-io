import {
  addColumnAfter,
  addColumnBefore,
  addRow,
  CellSelection,
  type Command,
  cellAround,
  deleteColumn,
  deleteRow,
  deleteTable,
  type EditorState,
  goToNextCell,
  isInTable,
  nextCell,
  type PMNode,
  selectedRect,
  selectionCell,
  TableMap,
  TextSelection,
} from '../pm';
import {
  findParentNodeOfType,
  getNodeType,
  insertEmptyParagraphAboveNode,
  insertEmptyParagraphBelowNode,
  safeInsert,
} from '../pm-utils';
import {
  parseAlign,
  type RequiredConfig,
  type TableCellAlign,
} from './table-config';

export function insertTable(config: RequiredConfig) {
  return ({
    rows = config.defaultRows,
    columns = config.defaultColumns,
  }: {
    rows?: number;
    columns?: number;
  } = {}): Command =>
    (state, dispatch) => {
      if (isInTable(state)) {
        return false;
      }

      const { table, table_row, table_cell, table_header } = state.schema.nodes;
      if (!table || !table_row || !table_cell || !table_header) {
        return false;
      }

      const rowCount = Math.max(1, rows);
      const columnCount = Math.max(1, columns);

      const rowNodes = Array.from({ length: rowCount }, (_, rowIndex) => {
        const cellType = rowIndex === 0 ? table_header : table_cell;
        const cells = Array.from(
          { length: columnCount },
          () => cellType.createAndFill() ?? cellType.create(),
        );
        return table_row.create(null, cells);
      });

      const tableNode = table.create(null, rowNodes);
      if (dispatch) {
        const tr = safeInsert(tableNode)(state.tr);
        const insertedPos = findTablePos(tr.doc, tableNode);
        if (insertedPos != null) {
          // +3 walks into table -> first row -> first cell content.
          tr.setSelection(TextSelection.create(tr.doc, insertedPos + 3));
        }
        dispatch(tr.scrollIntoView());
      }

      return true;
    };
}

function findTablePos(doc: PMNode, tableNode: PMNode): number | null {
  let found: number | null = null;
  doc.descendants((node, pos) => {
    if (found == null && node === tableNode) {
      found = pos;
    }
    return found == null;
  });
  return found;
}

export function addRowAbove(): Command {
  return (state, dispatch) => {
    if (!isInTable(state)) {
      return false;
    }
    const rect = selectedRect(state);
    // Inserting above the header row would break the header-first shape
    // that pipe-table Markdown requires.
    if (rect.top === 0) {
      return false;
    }
    if (dispatch) {
      dispatch(addRow(state.tr, rect, rect.top));
    }
    return true;
  };
}

export function addRowBelow(): Command {
  return (state, dispatch) => {
    if (!isInTable(state)) {
      return false;
    }
    if (dispatch) {
      const rect = selectedRect(state);
      dispatch(addRow(state.tr, rect, rect.bottom));
    }
    return true;
  };
}

export function deleteTableRow(): Command {
  return deleteRow;
}

export function addColumnLeft(): Command {
  return addColumnBefore;
}

export function addColumnRight(): Command {
  return addColumnAfter;
}

export function deleteTableColumn(): Command {
  return deleteColumn;
}

export function deleteWholeTable(): Command {
  return deleteTable;
}

export function goToNextCellOrExtend(): Command {
  return (state, dispatch) => {
    if (!isInTable(state)) {
      return false;
    }
    if (goToNextCell(1)(state, dispatch)) {
      return true;
    }
    // In the last cell: grow the table by one row and move into it.
    if (!dispatch) {
      return true;
    }
    const rect = selectedRect(state);
    const tr = addRow(state.tr, rect, rect.bottom);
    const table = tr.doc.nodeAt(rect.tableStart - 1);
    if (!table) {
      return false;
    }
    const map = TableMap.get(table);
    const cellPos = rect.tableStart + map.positionAt(rect.bottom, 0, table);
    dispatch(
      tr
        .setSelection(TextSelection.create(tr.doc, cellPos + 1))
        .scrollIntoView(),
    );
    return true;
  };
}

export function goToPrevCell(): Command {
  return (state, dispatch) => {
    if (!isInTable(state)) {
      return false;
    }
    if (goToNextCell(-1)(state, dispatch)) {
      return true;
    }
    // Swallow in the first cell so focus stays inside the editor.
    return true;
  };
}

export function goToRowBelow(): Command {
  return (state, dispatch) => {
    if (!isInTable(state) || !state.selection.empty) {
      return false;
    }
    const $cell = selectionCell(state);
    const $next = nextCell($cell, 'vert', 1);
    if (!$next) {
      // Last row: swallow Enter so the cell cannot be split into a new cell.
      return true;
    }
    if (dispatch) {
      dispatch(
        state.tr
          .setSelection(TextSelection.create(state.doc, $next.pos + 1))
          .scrollIntoView(),
      );
    }
    return true;
  };
}

/** Enter/Shift-Enter inside a cell insert a line break (persisted as <br>). */
export function insertLineBreakInCell(config: RequiredConfig): Command {
  return (state, dispatch) => {
    if (!isInTable(state)) {
      return false;
    }
    const breakType = state.schema.nodes[config.hardBreakNodeName];
    if (!breakType) {
      // Without a hard-break node the cell cannot hold a line break; swallow
      // the key so Enter cannot split the cell into a new sibling cell.
      return true;
    }
    dispatch?.(
      state.tr.replaceSelectionWith(breakType.create()).scrollIntoView(),
    );
    return true;
  };
}

/** Mod-Enter leaves the table downward, like exiting a code block. */
export function exitTableBelow(config: RequiredConfig): Command {
  return (state, dispatch) => {
    if (!isInTable(state)) {
      return false;
    }
    return exitTable('down', config)(state, dispatch);
  };
}

/**
 * Backspace/Delete on a cell selection that covers the whole table deletes
 * the table itself instead of just emptying every cell.
 */
export function deleteTableOnFullCellSelection(): Command {
  return (state, dispatch) => {
    if (!(state.selection instanceof CellSelection)) {
      return false;
    }
    const rect = selectedRect(state);
    const coversTable =
      rect.top === 0 &&
      rect.left === 0 &&
      rect.bottom === rect.map.height &&
      rect.right === rect.map.width;
    if (!coversTable) {
      return false;
    }
    return deleteTable(state, dispatch);
  };
}

/**
 * ArrowUp/ArrowDown inside a table moves to the cell above/below in the
 * same column, and leaves the table from the first/last row — moving into
 * the adjacent textblock or inserting an empty paragraph when the table
 * sits at the edge of its parent (mirroring the code-block behavior).
 *
 * prosemirror-tables' own vertical arrow handling only applies when the
 * caret sits at a cell's trailing edge; from any other position the
 * browser's native caret motion fights the isolating cell boundaries and
 * the cursor gets stuck, so the whole vertical move is owned here.
 */
export function moveRowVertical(
  direction: 'up' | 'down',
  config: RequiredConfig,
): Command {
  return (state, dispatch, view) => {
    if (!state.selection.empty || !isInTable(state)) {
      return false;
    }
    // Stay inside the cell while the cursor can still move between wrapped
    // visual lines.
    if (view && !endOfTextblockSafe(view, direction)) {
      return false;
    }

    const $cell = selectionCell(state);
    const $next = nextCell($cell, 'vert', direction === 'up' ? -1 : 1);
    if ($next) {
      const cell = $next.nodeAfter;
      if (!cell) {
        return false;
      }
      const pos =
        direction === 'down' ? $next.pos + 1 : $next.pos + cell.nodeSize - 1;
      dispatch?.(state.tr.setSelection(TextSelection.create(state.doc, pos)));
      return true;
    }

    return exitTable(direction, config)(state, dispatch);
  };
}

/**
 * ArrowDown at the bottom of a textblock directly above a table enters the
 * table's first cell; ArrowUp above a table below does the reverse. Native
 * caret motion cannot cross the table's isolating boundary, so without this
 * the cursor gets stuck next to the table.
 */
export function enterTableVertical(direction: 'up' | 'down'): Command {
  return (state, dispatch, view) => {
    if (!state.selection.empty || isInTable(state)) {
      return false;
    }
    const { $from } = state.selection;
    if (!$from.parent.isTextblock || $from.depth === 0) {
      return false;
    }
    if (view && !endOfTextblockSafe(view, direction)) {
      return false;
    }

    const tableType = getNodeType(state.schema, 'table');
    const parent = $from.node($from.depth - 1);
    const index = $from.index($from.depth - 1);
    const sibling =
      direction === 'down'
        ? index < parent.childCount - 1
          ? parent.child(index + 1)
          : null
        : index > 0
          ? parent.child(index - 1)
          : null;
    if (!sibling || sibling.type !== tableType) {
      return false;
    }

    const tablePos =
      direction === 'down'
        ? $from.after($from.depth)
        : $from.before($from.depth) - sibling.nodeSize;
    const map = TableMap.get(sibling);
    if (dispatch) {
      let pos: number;
      if (direction === 'down') {
        const firstCell = map.map[0];
        if (firstCell == null) {
          return false;
        }
        pos = tablePos + 1 + firstCell + 1;
      } else {
        const lastCell = map.map[map.map.length - 1];
        const cell = lastCell != null ? sibling.nodeAt(lastCell) : null;
        if (lastCell == null || !cell) {
          return false;
        }
        pos = tablePos + 1 + lastCell + cell.nodeSize - 1;
      }
      dispatch(state.tr.setSelection(TextSelection.create(state.doc, pos)));
    }
    return true;
  };
}

/**
 * Forward-delete in an empty textblock directly before a table (side
 * 'before'), or Backspace in one directly after it (side 'after'), removes
 * the empty block and moves the caret into the nearest cell. The default
 * join commands cannot cross the table's isolating boundary and leave the
 * document unchanged.
 */
export function deleteEmptyBlockNextToTable(side: 'before' | 'after'): Command {
  return (state, dispatch) => {
    if (!state.selection.empty || isInTable(state)) {
      return false;
    }
    const { $from } = state.selection;
    if (
      !$from.parent.isTextblock ||
      $from.parent.content.size > 0 ||
      $from.depth === 0
    ) {
      return false;
    }

    const tableType = getNodeType(state.schema, 'table');
    const parent = $from.node($from.depth - 1);
    const index = $from.index($from.depth - 1);
    const sibling =
      side === 'before'
        ? index < parent.childCount - 1
          ? parent.child(index + 1)
          : null
        : index > 0
          ? parent.child(index - 1)
          : null;
    if (!sibling || sibling.type !== tableType) {
      return false;
    }

    if (dispatch) {
      const start = $from.before($from.depth);
      const end = $from.after($from.depth);
      const tr = state.tr.delete(start, end);
      const map = TableMap.get(sibling);
      if (side === 'before') {
        // The table now starts where the deleted block began.
        const first = map.map[0];
        if (first != null) {
          tr.setSelection(TextSelection.create(tr.doc, start + 1 + first + 1));
        }
      } else {
        const tablePos = start - sibling.nodeSize;
        const last = map.map[map.map.length - 1];
        const cell = last != null ? sibling.nodeAt(last) : null;
        if (last != null && cell) {
          tr.setSelection(
            TextSelection.create(
              tr.doc,
              tablePos + 1 + last + cell.nodeSize - 1,
            ),
          );
        }
      }
      dispatch(tr);
    }
    return true;
  };
}

function endOfTextblockSafe(
  view: NonNullable<Parameters<Command>[2]>,
  direction: 'up' | 'down',
): boolean {
  try {
    return view.endOfTextblock(direction);
  } catch {
    // Environments without layout (jsdom) cannot answer; cells hold a single
    // logical line, so treat the cursor as being at the visual boundary.
    return true;
  }
}

function exitTable(direction: 'up' | 'down', config: RequiredConfig): Command {
  return (state, dispatch) => {
    const tableType = getNodeType(state.schema, 'table');
    const table = findParentNodeOfType(tableType)(state.selection);
    if (!table) {
      return false;
    }

    const $table = state.doc.resolve(table.pos);
    const parent = $table.parent;
    const index = $table.index();

    if (direction === 'up') {
      if (index > 0) {
        const previous = parent.child(index - 1);
        if (previous.isTextblock) {
          dispatch?.(
            state.tr.setSelection(
              TextSelection.create(
                state.doc,
                table.pos - previous.nodeSize + 1 + previous.content.size,
              ),
            ),
          );
          return true;
        }
      }
      return insertEmptyParagraphAboveNode(
        tableType,
        config.getParagraphNodeType,
      )(state, dispatch);
    }

    if (index < parent.childCount - 1) {
      const next = parent.child(index + 1);
      if (next.isTextblock) {
        dispatch?.(
          state.tr.setSelection(
            TextSelection.create(
              state.doc,
              table.pos + table.node.nodeSize + 1,
            ),
          ),
        );
        return true;
      }
    }
    return insertEmptyParagraphBelowNode(
      tableType,
      config.getParagraphNodeType,
    )(state, dispatch);
  };
}

/**
 * ArrowLeft/ArrowRight at the edge of a cell's content hops to the previous
 * or next cell in reading order (wrapping across rows), and leaves the table
 * from the very first or last cell.
 */
export function moveCellHorizontal(
  dir: -1 | 1,
  config: RequiredConfig,
): Command {
  return (state, dispatch) => {
    if (!isInTable(state)) {
      return false;
    }
    const { selection } = state;
    if (!(selection instanceof TextSelection) || !selection.empty) {
      return false;
    }
    const $cursor = selection.$from;
    const atBoundary =
      dir === -1
        ? $cursor.parentOffset === 0
        : $cursor.parentOffset === $cursor.parent.content.size;
    if (!atBoundary) {
      return false;
    }

    const $cell = cellAround($cursor);
    if (!$cell) {
      return false;
    }
    const rect = selectedRect(state);
    const { map, table, tableStart } = rect;
    const current = $cell.pos - tableStart;
    const order = map.map;
    const currentIndex = order.indexOf(current);
    if (currentIndex < 0) {
      return false;
    }

    // map.map lists cell positions in reading order; skip span duplicates.
    let target: number | null = null;
    for (let i = currentIndex + dir; i >= 0 && i < order.length; i += dir) {
      const pos = order[i];
      if (pos != null && pos !== current) {
        target = pos;
        break;
      }
    }

    if (target == null) {
      // First or last cell of the table: move out of it.
      return exitTable(dir === -1 ? 'up' : 'down', config)(state, dispatch);
    }

    const cell = table.nodeAt(target);
    if (!cell) {
      return false;
    }
    const pos =
      dir === 1
        ? tableStart + target + 1
        : tableStart + target + cell.nodeSize - 1;
    dispatch?.(
      state.tr
        .setSelection(TextSelection.create(state.doc, pos))
        .scrollIntoView(),
    );
    return true;
  };
}

export function setColumnAlign(align: TableCellAlign | null): Command {
  return (state, dispatch) => {
    if (!isInTable(state)) {
      return false;
    }
    if (dispatch) {
      const rect = selectedRect(state);
      const tr = state.tr;
      const seen = new Set<number>();
      for (let row = 0; row < rect.map.height; row++) {
        for (let col = rect.left; col < rect.right; col++) {
          const cellPos = rect.map.map[row * rect.map.width + col];
          if (cellPos == null || seen.has(cellPos)) {
            continue;
          }
          seen.add(cellPos);
          const cell = rect.table.nodeAt(cellPos);
          if (cell) {
            tr.setNodeMarkup(rect.tableStart + cellPos, null, {
              ...cell.attrs,
              align,
            });
          }
        }
      }
      dispatch(tr);
    }
    return true;
  };
}

// QUERIES
export function isTableActive(state: EditorState): boolean {
  return isInTable(state);
}

export type ActiveTableCell = {
  tableStart: number;
  rowIndex: number;
  columnIndex: number;
  isHeaderRow: boolean;
  align: TableCellAlign | null;
};

export function activeTableCell(
  state: EditorState,
): ActiveTableCell | undefined {
  if (!isInTable(state)) {
    return undefined;
  }
  const rect = selectedRect(state);
  const $cell = selectionCell(state);
  return {
    tableStart: rect.tableStart,
    rowIndex: rect.top,
    columnIndex: rect.left,
    isHeaderRow: rect.top === 0,
    align: parseAlign($cell.nodeAfter?.attrs.align),
  };
}
