import type { MarkdownSerializerState } from 'prosemirror-markdown';
import { type CollectionType, collection, keybinding } from './common';
import {
  type Command,
  type EditorState,
  Fragment,
  type NodeSpec,
  type NodeType,
  type PMNode,
  TextSelection,
} from './pm';
import { findParentNodeOfType, getNodeType, safeInsert } from './pm-utils';

export type TableConfig = {
  tableGroup?: string;
  cellContent?: string;
};

type RequiredConfig = Required<TableConfig>;

const DEFAULT_CONFIG: RequiredConfig = {
  tableGroup: 'block',
  cellContent: 'inline*',
};

export function setupTable(userConfig?: TableConfig) {
  const config: RequiredConfig = {
    ...DEFAULT_CONFIG,
    ...userConfig,
  };

  const nodes: Record<string, NodeSpec> = {
    table: {
      content: 'table_row+',
      group: config.tableGroup,
      parseDOM: [{ tag: 'table' }],
      toDOM: () => ['table', ['tbody', 0]],
    },
    table_row: {
      content: '(table_cell|table_header)+',
      parseDOM: [{ tag: 'tr' }],
      toDOM: () => ['tr', 0],
    },
    table_header: {
      content: config.cellContent,
      parseDOM: [{ tag: 'th' }],
      toDOM: () => ['th', 0],
    },
    table_cell: {
      content: config.cellContent,
      parseDOM: [{ tag: 'td' }],
      toDOM: () => ['td', 0],
    },
  };

  return collection({
    id: 'table',
    nodes,
    plugin: {
      keybindings: tableKeybindings(),
    },
    command: {
      insertTable: insertTable(),
      addRowAfter: addRowAfter(),
      deleteRow: deleteRow(),
      addColumnAfter: addColumnAfter(),
      deleteColumn: deleteColumn(),
    },
    query: {
      isTableActive: isTableActive(),
    },
    markdown: markdown(),
  });
}

function tableKeybindings() {
  return keybinding(
    [
      ['Enter', insertNewLineInCell],
      ['Backspace', preventDeleteInEmptyCell],
      ['Delete', preventDeleteInEmptyCell],
    ],
    'table',
    1000,
  );
}

function markdown(): CollectionType['markdown'] {
  return {
    nodes: {
      table: {
        toMarkdown(state, node) {
          writeTableToMarkdown(state, node);
          state.closeBlock(node);
        },
        parseMarkdown: {
          table: { block: 'table' },
          thead: { ignore: true },
          tbody: { ignore: true },
        },
      },
      table_row: {
        toMarkdown() {},
        parseMarkdown: {
          tr: { block: 'table_row' },
        },
      },
      table_header: {
        toMarkdown() {},
        parseMarkdown: {
          th: { block: 'table_header' },
        },
      },
      table_cell: {
        toMarkdown() {},
        parseMarkdown: {
          td: { block: 'table_cell' },
        },
      },
    },
  };
}

function writeTableToMarkdown(
  state: MarkdownSerializerState,
  tableNode: PMNode,
) {
  const rows: string[][] = [];

  tableNode.forEach((rowNode) => {
    const rowCells: string[] = [];

    rowNode.forEach((cellNode) => {
      rowCells.push(stringifyTableCell(state, cellNode));
    });

    rows.push(rowCells);
  });

  if (rows.length === 0) {
    return;
  }

  const columnCount = Math.max(...rows.map((row) => row.length), 0);
  if (columnCount === 0) {
    return;
  }

  const normalizedRows = rows.map((row) =>
    row.length === columnCount
      ? row
      : [...row, ...Array(columnCount - row.length).fill('')],
  );

  const header = normalizedRows[0] || [];
  state.write(`| ${header.join(' | ')} |`);
  state.ensureNewLine();
  state.write(`| ${Array(columnCount).fill('-----').join(' | ')} |`);
  state.ensureNewLine();

  for (let i = 1; i < normalizedRows.length; i++) {
    const row = normalizedRows[i] || [];
    state.write(`| ${row.join(' | ')} |`);
    state.ensureNewLine();
  }
}

function stringifyTableCell(
  state: MarkdownSerializerState,
  cellNode: PMNode,
): string {
  return renderInlineToString(state, cellNode)
    .replace(/\n+/g, '<br>')
    .replace(/\|/g, '\\|')
    .trim();
}

function renderInlineToString(
  state: MarkdownSerializerState,
  node: PMNode,
): string {
  const stateWithOutput = state as MarkdownSerializerState & { out: string };
  const previousOutput = stateWithOutput.out;
  stateWithOutput.out = '';
  state.renderInline(node);
  const rendered = stateWithOutput.out;
  stateWithOutput.out = previousOutput;
  return rendered;
}

function insertTable() {
  return (rows = 3, columns = 3): Command =>
    (state, dispatch) => {
      const tableType = getNodeType(state.schema, 'table');
      const rowType = getNodeType(state.schema, 'table_row');
      const headerType = getNodeType(state.schema, 'table_header');
      const cellType = getNodeType(state.schema, 'table_cell');

      const safeRows = Math.max(1, rows);
      const safeColumns = Math.max(1, columns);
      const rowNodes = Array.from({ length: safeRows }, (_, rowIndex) => {
        const isHeader = rowIndex === 0;
        const columnType = isHeader ? headerType : cellType;
        const cells = Array.from({ length: safeColumns }, () =>
          createEmptyCell(columnType),
        );
        return rowType.create(null, cells);
      });

      const tableNode = tableType.create(null, rowNodes);
      if (dispatch) {
        const tr = safeInsert(tableNode)(state.tr);
        dispatch(tr.scrollIntoView());
      }

      return true;
    };
}

function addRowAfter(): Command {
  return (state, dispatch) => {
    const resolved = resolveTableSelection(state);
    if (!resolved) {
      return false;
    }

    const rowType = getNodeType(state.schema, 'table_row');
    const cellType = getNodeType(state.schema, 'table_cell');
    const columnCount = Math.max(1, resolved.row.node.childCount);
    const newRow = rowType.create(
      null,
      Array.from({ length: columnCount }, () => createEmptyCell(cellType)),
    );

    if (dispatch) {
      const insertPos = resolved.row.pos + resolved.row.node.nodeSize;
      const tr = state.tr.insert(insertPos, newRow);
      const selectionPos = Math.min(insertPos + 2, tr.doc.content.size);
      dispatch(tr.setSelection(TextSelection.create(tr.doc, selectionPos)));
    }

    return true;
  };
}

function deleteRow(): Command {
  return (state, dispatch) => {
    const resolved = resolveTableSelection(state);
    if (!resolved) {
      return false;
    }

    if (!dispatch) {
      return true;
    }

    if (resolved.table.node.childCount <= 1) {
      const tr = state.tr.delete(
        resolved.table.pos,
        resolved.table.pos + resolved.table.node.nodeSize,
      );
      dispatch(tr.scrollIntoView());
      return true;
    }

    const tr = state.tr.delete(
      resolved.row.pos,
      resolved.row.pos + resolved.row.node.nodeSize,
    );
    dispatch(tr.scrollIntoView());
    return true;
  };
}

function addColumnAfter(): Command {
  return (state, dispatch) => {
    const resolved = resolveTableSelection(state);
    if (!resolved) {
      return false;
    }

    if (!dispatch) {
      return true;
    }

    const headerType = getNodeType(state.schema, 'table_header');
    const cellType = getNodeType(state.schema, 'table_cell');
    const rows = getTableRowsWithPositions(resolved.table);
    const tr = state.tr;

    for (let i = rows.length - 1; i >= 0; i--) {
      const row = rows[i];
      if (!row) {
        continue;
      }

      const targetCol = Math.min(resolved.colIndex, row.node.childCount - 1);
      const targetCell = row.node.child(targetCol);
      const cellStartOffset = getChildOffsetAtIndex(row.node, targetCol);
      if (!targetCell || cellStartOffset == null) {
        continue;
      }

      const insertPos = row.start + cellStartOffset + targetCell.nodeSize;
      const type = row.index === 0 ? headerType : cellType;
      tr.insert(insertPos, createEmptyCell(type));
    }

    dispatch(tr.scrollIntoView());
    return true;
  };
}

function deleteColumn(): Command {
  return (state, dispatch) => {
    const resolved = resolveTableSelection(state);
    if (!resolved) {
      return false;
    }

    if (!dispatch) {
      return true;
    }

    const rows = getTableRowsWithPositions(resolved.table);
    const maxColumns = Math.max(...rows.map((row) => row.node.childCount), 0);

    if (maxColumns <= 1) {
      const tr = state.tr.delete(
        resolved.table.pos,
        resolved.table.pos + resolved.table.node.nodeSize,
      );
      dispatch(tr.scrollIntoView());
      return true;
    }

    const deleteRanges: Array<{ from: number; to: number }> = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row || resolved.colIndex >= row.node.childCount) {
        continue;
      }

      const cellOffset = getChildOffsetAtIndex(row.node, resolved.colIndex);
      const cell = row.node.child(resolved.colIndex);
      if (cellOffset == null || !cell) {
        continue;
      }

      const from = row.start + cellOffset;
      const to = from + cell.nodeSize;
      deleteRanges.push({ from, to });
    }

    if (deleteRanges.length === 0) {
      return false;
    }

    const tr = state.tr;
    deleteRanges
      .sort((a, b) => b.from - a.from)
      .forEach(({ from, to }) => {
        tr.delete(from, to);
      });

    dispatch(tr.scrollIntoView());
    return true;
  };
}

function isTableActive() {
  return (state: EditorState) => {
    const tableType = getNodeType(state.schema, 'table');
    return Boolean(findParentNodeOfType(tableType)(state.selection));
  };
}

function resolveTableSelection(state: EditorState):
  | {
      table: NonNullable<ReturnType<ReturnType<typeof findParentNodeOfType>>>;
      row: NonNullable<ReturnType<ReturnType<typeof findParentNodeOfType>>>;
      cell: NonNullable<ReturnType<ReturnType<typeof findParentNodeOfType>>>;
      rowIndex: number;
      colIndex: number;
    }
  | undefined {
  const tableType = getNodeType(state.schema, 'table');
  const rowType = getNodeType(state.schema, 'table_row');
  const headerType = getNodeType(state.schema, 'table_header');
  const cellType = getNodeType(state.schema, 'table_cell');

  const table = findParentNodeOfType(tableType)(state.selection);
  const row = findParentNodeOfType(rowType)(state.selection);
  const cell = findParentNodeOfType([headerType, cellType])(state.selection);

  if (!table || !row || !cell) {
    return;
  }

  const rowIndex = getChildIndexAtPos(table, row.pos);
  const colIndex = getChildIndexAtPos(row, cell.pos);

  if (rowIndex < 0 || colIndex < 0) {
    return;
  }

  return { table, row, cell, rowIndex, colIndex };
}

function getChildIndexAtPos(
  parent: { node: PMNode; start: number },
  childPos: number,
): number {
  let index = -1;
  parent.node.forEach((child, offset, i) => {
    const start = parent.start + offset;
    const end = start + child.nodeSize;
    if (childPos >= start && childPos < end) {
      index = i;
    }
  });
  return index;
}

function getChildOffsetAtIndex(
  node: PMNode,
  index: number,
): number | undefined {
  let found: number | undefined;
  node.forEach((_child, offset, i) => {
    if (i === index) {
      found = offset;
    }
  });
  return found;
}

function getTableRowsWithPositions(table: { node: PMNode; start: number }) {
  const rows: Array<{ node: PMNode; start: number; index: number }> = [];
  table.node.forEach((rowNode, offset, index) => {
    rows.push({
      node: rowNode,
      start: table.start + offset,
      index,
    });
  });
  return rows;
}

function createEmptyCell(type: NodeType): PMNode {
  return type.createAndFill() ?? type.create(null, Fragment.empty);
}

const insertNewLineInCell: Command = (state, dispatch) => {
  if (isSlashSuggestionActive(state) || !state.selection.empty) {
    return false;
  }

  const headerType = getNodeType(state.schema, 'table_header');
  const cellType = getNodeType(state.schema, 'table_cell');
  const hardBreakType = state.schema.nodes.hard_break;
  const cell = findParentNodeOfType([headerType, cellType])(state.selection);

  if (!cell || !hardBreakType) {
    return false;
  }

  if (dispatch) {
    dispatch(
      state.tr.replaceSelectionWith(hardBreakType.create()).scrollIntoView(),
    );
  }
  return true;
};

const preventDeleteInEmptyCell: Command = (state) => {
  if (isSlashSuggestionActive(state)) {
    return false;
  }

  if (!state.selection.empty) {
    return false;
  }

  const headerType = getNodeType(state.schema, 'table_header');
  const cellType = getNodeType(state.schema, 'table_cell');
  const cell = findParentNodeOfType([headerType, cellType])(state.selection);

  if (!cell) {
    return false;
  }

  return cell.node.content.size === 0;
};

function isSlashSuggestionActive(state: EditorState): boolean {
  const marks = state.selection.$from.marks();
  return marks.some((mark) => mark.type.name === 'slash_command');
}
