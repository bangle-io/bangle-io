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
  deleteColumn,
  deleteRow,
  deleteTable,
  type EditorState,
  fixTables,
  goToNextCell,
  isInTable,
  nextCell,
  Plugin,
  PluginKey,
  type PMNode,
  selectedRect,
  selectionCell,
  TableMap,
  TextSelection,
  tableEditing,
  tableNodes,
} from './pm';
import { safeInsert } from './pm-utils';

export type TableCellAlign = 'left' | 'center' | 'right';

const ALIGN_VALUES: readonly TableCellAlign[] = ['left', 'center', 'right'];

export type TableConfig = {
  tableGroup?: string;
  defaultRows?: number;
  defaultColumns?: number;
  // keys
  keyGoToNextCell?: string | false;
  keyGoToPrevCell?: string | false;
};

type RequiredConfig = Required<TableConfig>;

const DEFAULT_CONFIG: RequiredConfig = {
  tableGroup: 'block',
  defaultRows: 3,
  defaultColumns: 3,
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
