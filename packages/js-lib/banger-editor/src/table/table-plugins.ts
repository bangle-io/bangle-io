import { keybinding, PRIORITY } from '../common';
import {
  cellAround,
  chainCommands,
  Decoration,
  DecorationSet,
  fixTables,
  isInTable,
  Plugin,
  PluginKey,
  tableEditing,
} from '../pm';
import {
  deleteEmptyBlockNextToTable,
  deleteTableOnFullCellSelection,
  enterTableVertical,
  exitTableBelow,
  goToNextCellOrExtend,
  goToPrevCell,
  insertLineBreakInCell,
  moveCellHorizontal,
  moveRowVertical,
} from './table-commands';
import type { RequiredConfig } from './table-config';

export function createTablePlugins(config: RequiredConfig) {
  return {
    keybindings: pluginKeybindings(config),
    // Without allowTableNodeSelection, tableEditing's selection normalizer
    // rewrites a table NodeSelection into a CellSelection over every cell.
    // Drag-and-drop then "moves" only the cell contents: the drop inserts a
    // full copy, but deleting the source CellSelection empties the cells and
    // leaves a hollow table skeleton behind.
    tableEditing: tableEditing({ allowTableNodeSelection: true }),
    fixTables: pluginFixTables(),
    activeCell: pluginActiveCell(),
  };
}

function pluginKeybindings(config: RequiredConfig) {
  return () => {
    return keybinding(
      [
        [config.keyGoToNextCell, goToNextCellOrExtend()],
        [config.keyGoToPrevCell, goToPrevCell()],
        // Line breaks inside cells persist as <br>, the GFM convention for
        // multi-line pipe-table cells.
        ['Enter', insertLineBreakInCell(config)],
        ['Shift-Enter', insertLineBreakInCell(config)],
        ['Mod-Enter', exitTableBelow(config)],
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
        [
          'Delete',
          chainCommands(
            deleteTableOnFullCellSelection(),
            deleteEmptyBlockNextToTable('before'),
          ),
        ],
        [
          'Backspace',
          chainCommands(
            deleteTableOnFullCellSelection(),
            deleteEmptyBlockNextToTable('after'),
          ),
        ],
      ],
      'table',
      PRIORITY.high,
    );
  };
}

function pluginActiveCell() {
  const key = new PluginKey('table-active-cell');
  // Highlights the cell the cursor is in, like other Notion-style editors,
  // so the typing target is obvious.
  return new Plugin({
    key,
    props: {
      decorations(state) {
        if (!state.selection.empty || !isInTable(state)) {
          return null;
        }
        const $cell = cellAround(state.selection.$from);
        const cell = $cell?.nodeAfter;
        if (!$cell || !cell) {
          return null;
        }
        return DecorationSet.create(state.doc, [
          Decoration.node($cell.pos, $cell.pos + cell.nodeSize, {
            class: 'prosemirror-active-table-cell',
          }),
        ]);
      },
    },
  });
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
