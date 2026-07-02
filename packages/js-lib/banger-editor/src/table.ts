import type { MarkdownSerializerState } from 'prosemirror-markdown';
import {
  type CollectionType,
  collection,
  keybinding,
  PRIORITY,
} from './common';
import {
  addColumnAfter,
  addColumnBefore,
  addRow,
  type Command,
  cellAround,
  chainCommands,
  deleteColumn,
  deleteRow,
  deleteTable,
  type EditorState,
  fixTables,
  goToNextCell,
  isInTable,
  type NodeType,
  nextCell,
  Plugin,
  PluginKey,
  type PMNode,
  type Schema,
  selectedRect,
  selectionCell,
  TableMap,
  TextSelection,
  tableEditing,
  tableNodes,
} from './pm';
import {
  defaultGetParagraphNodeType,
  findParentNodeOfType,
  getNodeType,
  insertEmptyParagraphAboveNode,
  insertEmptyParagraphBelowNode,
  safeInsert,
} from './pm-utils';

export type TableCellAlign = 'left' | 'center' | 'right';

const ALIGN_VALUES: readonly TableCellAlign[] = ['left', 'center', 'right'];

export type TableConfig = {
  tableGroup?: string;
  defaultRows?: number;
  defaultColumns?: number;
  getParagraphNodeType?: (schema: Schema) => NodeType;
  // keys
  keyGoToNextCell?: string | false;
  keyGoToPrevCell?: string | false;
};

type RequiredConfig = Required<TableConfig>;

const DEFAULT_CONFIG: RequiredConfig = {
  tableGroup: 'block',
  defaultRows: 3,
  defaultColumns: 3,
  getParagraphNodeType: defaultGetParagraphNodeType,
  keyGoToNextCell: 'Tab',
  keyGoToPrevCell: 'Shift-Tab',
};

export function setupTable(userConfig?: TableConfig) {
  const config = {
    ...DEFAULT_CONFIG,
    ...userConfig,
  };

  const nodes = tableNodes({
    tableGroup: config.tableGroup,
    // Inline-only cells keep the document representable as Markdown pipe
    // tables; block content inside cells has no faithful pipe-table form.
    cellContent: 'inline*',
    cellAttributes: {
      align: {
        default: null,
        getFromDOM: (dom) => parseAlign(dom.style.textAlign),
        setDOMAttr: (value, attrs) => {
          const align = parseAlign(value);
          if (align) {
            attrs.style = `${attrs.style ?? ''}text-align: ${align};`;
          }
        },
      },
    },
  });

  // Inline-content cells are textblocks, which makes the positions between
  // cells valid gap-cursor spots by prosemirror-gapcursor's default rule.
  // A gap cursor inside a row is never meaningful, so forbid it.
  nodes.table_row = { ...nodes.table_row, allowGapCursor: false };

  const plugin = {
    keybindings: pluginKeybindings(config),
    tableEditing: tableEditing(),
    fixTables: pluginFixTables(),
  };

  const command = {
    insertTable: insertTable(config),
    addRowAbove: addRowAbove(),
    addRowBelow: addRowBelow(),
    deleteRow: deleteTableRow(),
    addColumnLeft: addColumnLeft(),
    addColumnRight: addColumnRight(),
    deleteColumn: deleteTableColumn(),
    deleteTable: deleteWholeTable(),
    goToNextCell: goToNextCellOrExtend(),
    goToPrevCell: goToPrevCell(),
    goToRowBelow: goToRowBelow(),
    setColumnAlign,
  };

  return collection({
    id: 'table',
    nodes,
    plugin,
    command,
    query: {
      isTableActive,
      activeTableCell,
    },
    markdown: markdown(),
  });
}

// PLUGINS
function pluginKeybindings(config: RequiredConfig) {
  return () => {
    return keybinding(
      [
        [config.keyGoToNextCell, goToNextCellOrExtend()],
        [config.keyGoToPrevCell, goToPrevCell()],
        ['Enter', goToRowBelow()],
        // Hard breaks inside cells would split a Markdown pipe row, so they
        // are deliberately blocked in v1.
        ['Shift-Enter', blockInsideCell()],
        ['Mod-Enter', blockInsideCell()],
        [
          'ArrowUp',
          chainCommands(
            moveRowVertical('up', config),
            enterTableVertical('up'),
          ),
        ],
        [
          'ArrowDown',
          chainCommands(
            moveRowVertical('down', config),
            enterTableVertical('down'),
          ),
        ],
        ['ArrowLeft', moveCellHorizontal(-1, config)],
        ['ArrowRight', moveCellHorizontal(1, config)],
        ['Delete', deleteEmptyBlockNextToTable('before')],
        ['Backspace', deleteEmptyBlockNextToTable('after')],
      ],
      'table',
      PRIORITY.high,
    );
  };
}

function pluginFixTables() {
  // Repairs structurally invalid tables (e.g. after a partial paste) so the
  // serializer never sees a non-rectangular table.
  return new Plugin({
    key: new PluginKey('table-fix-tables'),
    appendTransaction: (_transactions, oldState, newState) =>
      fixTables(newState, oldState),
  });
}

// COMMANDS
function insertTable(config: RequiredConfig) {
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

function addRowAbove(): Command {
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

function addRowBelow(): Command {
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

function deleteTableRow(): Command {
  return deleteRow;
}

function addColumnLeft(): Command {
  return addColumnBefore;
}

function addColumnRight(): Command {
  return addColumnAfter;
}

function deleteTableColumn(): Command {
  return deleteColumn;
}

function deleteWholeTable(): Command {
  return deleteTable;
}

function goToNextCellOrExtend(): Command {
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

function goToPrevCell(): Command {
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

function goToRowBelow(): Command {
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

function blockInsideCell(): Command {
  return (state) => isInTable(state);
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
function moveRowVertical(
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
function enterTableVertical(direction: 'up' | 'down'): Command {
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
function deleteEmptyBlockNextToTable(side: 'before' | 'after'): Command {
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
function moveCellHorizontal(dir: -1 | 1, config: RequiredConfig): Command {
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

function setColumnAlign(align: TableCellAlign | null): Command {
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
function isTableActive(state: EditorState): boolean {
  return isInTable(state);
}

export type ActiveTableCell = {
  tableStart: number;
  rowIndex: number;
  columnIndex: number;
  isHeaderRow: boolean;
  align: TableCellAlign | null;
};

function activeTableCell(state: EditorState): ActiveTableCell | undefined {
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

// MARKDOWN
function markdown(): CollectionType['markdown'] {
  return {
    nodes: {
      table: {
        toMarkdown: tableToMarkdown,
        parseMarkdown: {
          table: { block: 'table' },
          thead: { ignore: true },
          tbody: { ignore: true },
        },
      },
      table_row: {
        // Rows are serialized by the table node above.
        toMarkdown: () => {},
        parseMarkdown: {
          tr: { block: 'table_row' },
        },
      },
      table_header: {
        toMarkdown: () => {},
        parseMarkdown: {
          th: {
            block: 'table_header',
            getAttrs: (tok) => ({
              align: alignFromToken(tok.attrGet('style')),
            }),
          },
        },
      },
      table_cell: {
        toMarkdown: () => {},
        parseMarkdown: {
          td: {
            block: 'table_cell',
            getAttrs: (tok) => ({
              align: alignFromToken(tok.attrGet('style')),
            }),
          },
        },
      },
    },
    tokenizerPlugins: [
      (md) => {
        md.enable('table');
      },
    ],
  };
}

function parseAlign(value: unknown): TableCellAlign | null {
  return ALIGN_VALUES.find((align) => align === value) ?? null;
}

function alignFromToken(style: string | null): TableCellAlign | null {
  const match = style?.match(/text-align:\s*(left|center|right)/);
  return parseAlign(match?.[1]);
}

function tableToMarkdown(state: MarkdownSerializerState, node: PMNode) {
  // Flush pending block separation now, so the captured cell output below
  // cannot swallow the "\n\n" that belongs between the previous block and
  // this table.
  state.write();

  const rows: string[][] = [];
  const aligns: (TableCellAlign | null)[] = [];

  node.forEach((row, _offset, rowIndex) => {
    const cells: string[] = [];
    row.forEach((cell) => {
      if (rowIndex === 0) {
        aligns.push(parseAlign(cell.attrs.align));
      }
      cells.push(serializeCellInline(state, cell));
    });
    rows.push(cells);
  });

  const columnCount = Math.max(...rows.map((row) => row.length), 1);
  const pad = (row: string[]): string[] =>
    row.length >= columnCount
      ? row
      : [...row, ...Array.from({ length: columnCount - row.length }, () => '')];

  const toLine = (cells: string[]) => `| ${cells.join(' | ')} |`;

  // The first row always serializes as the header because pipe tables
  // require one; if header cells were deleted the first body row is
  // promoted on the next parse.
  const lines = [
    toLine(pad(rows[0] ?? [])),
    toLine(
      Array.from({ length: columnCount }, (_, column) =>
        delimiterForAlign(aligns[column] ?? null),
      ),
    ),
    ...rows.slice(1).map((row) => toLine(pad(row))),
  ];

  lines.forEach((line, index) => {
    state.write(line);
    // The last line must not end with a newline; closeBlock owns the
    // separation from the next block, like every other block serializer.
    if (index < lines.length - 1) {
      state.ensureNewLine();
    }
  });

  state.closeBlock(node);
}

function delimiterForAlign(align: TableCellAlign | null): string {
  switch (align) {
    case 'left':
      return ':---';
    case 'center':
      return ':---:';
    case 'right':
      return '---:';
    default:
      return '---';
  }
}

// MarkdownSerializerState keeps its output buffer in fields that are not part
// of the public typings. Capturing them is the only way to reuse the shared
// inline mark/node serializers for cell content instead of a lossy
// `textContent` dump.
type SerializerInternals = {
  out: string;
  delim: string;
  closed: PMNode | null;
  atBlockStart: boolean;
};

function serializeCellInline(
  state: MarkdownSerializerState,
  cell: PMNode,
): string {
  const internals = state as MarkdownSerializerState & SerializerInternals;
  const previous = {
    out: internals.out,
    delim: internals.delim,
    closed: internals.closed,
    atBlockStart: internals.atBlockStart,
  };
  internals.out = '';
  internals.delim = '';
  internals.closed = null;

  let raw: string;
  try {
    state.renderInline(cell);
    raw = internals.out;
  } finally {
    internals.out = previous.out;
    internals.delim = previous.delim;
    internals.closed = previous.closed;
    internals.atBlockStart = previous.atBlockStart;
  }

  return (
    raw
      // Hard breaks and raw newlines would terminate the pipe row, so they
      // deliberately flatten to spaces.
      .replace(/\\\n/g, ' ')
      .replace(/\n+/g, ' ')
      // GFM expects pipes escaped everywhere in a cell, including inside
      // inline code spans.
      .replace(/\|/g, '\\|')
      .trim()
  );
}
