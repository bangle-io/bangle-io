import { collection } from '../common';
import {
  activeTableCell,
  addColumnLeft,
  addColumnRight,
  addRowAbove,
  addRowBelow,
  deleteTableColumn,
  deleteTableRow,
  deleteWholeTable,
  goToNextCellOrExtend,
  goToPrevCell,
  goToRowBelow,
  insertTable,
  isTableActive,
  setColumnAlign,
} from './table-commands';
import { DEFAULT_CONFIG, type TableConfig } from './table-config';
import { tableMarkdown } from './table-markdown';
import { createTablePlugins } from './table-plugins';
import { createTableNodes } from './table-schema';

export type { ActiveTableCell } from './table-commands';
// Re-exported because they appear by reference in setupTable's inferred
// return type; consumers may also use them directly.
export {
  activeTableCell,
  isTableActive,
  setColumnAlign,
} from './table-commands';
export type { TableCellAlign, TableConfig } from './table-config';

export function setupTable(userConfig?: TableConfig) {
  const config = {
    ...DEFAULT_CONFIG,
    ...userConfig,
  };

  return collection({
    id: 'table',
    nodes: createTableNodes(config),
    plugin: createTablePlugins(config),
    command: {
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
    },
    query: {
      isTableActive,
      activeTableCell,
    },
    markdown: tableMarkdown(),
  });
}
