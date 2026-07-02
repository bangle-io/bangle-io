import { collection, commandSlashItem, type SlashCommandItem } from '../common';
import type { SlashCommandLabel } from '../common/slash-command';
import type { Command } from '../pm';
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
import {
  DEFAULT_CONFIG,
  type RequiredConfig,
  type TableConfig,
} from './table-config';
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
    slashCommand: slashCommands(config),
    markdown: tableMarkdown(),
  });
}

function tableCommandSlashItem({
  id,
  labelKey,
  label,
  keywords,
  priority,
  command,
}: {
  id: string;
  labelKey: SlashCommandLabel;
  label: string;
  keywords?: readonly string[];
  priority: number;
  command: Command;
}): SlashCommandItem {
  return commandSlashItem({
    id,
    group: id === 'insert-table' ? 'basic' : 'table',
    labelKey,
    label,
    keywords,
    priority,
    command,
  });
}

function slashCommands(
  config: RequiredConfig,
): Record<string, SlashCommandItem> {
  return {
    'insert-table': tableCommandSlashItem({
      id: 'insert-table',
      labelKey: { name: 'table' },
      label: 'Table',
      keywords: ['table', 'grid'],
      priority: 60,
      command: insertTable(config)(),
    }),
    'add-row-above': tableCommandSlashItem({
      id: 'add-row-above',
      labelKey: { name: 'addRowAbove' },
      label: 'Add row above',
      keywords: ['table', 'row'],
      priority: 90,
      command: addRowAbove(),
    }),
    'add-row-below': tableCommandSlashItem({
      id: 'add-row-below',
      labelKey: { name: 'addRowBelow' },
      label: 'Add row below',
      keywords: ['table', 'row'],
      priority: 80,
      command: addRowBelow(),
    }),
    'add-column-left': tableCommandSlashItem({
      id: 'add-column-left',
      labelKey: { name: 'addColumnLeft' },
      label: 'Add column left',
      keywords: ['table', 'column'],
      priority: 70,
      command: addColumnLeft(),
    }),
    'add-column-right': tableCommandSlashItem({
      id: 'add-column-right',
      labelKey: { name: 'addColumnRight' },
      label: 'Add column right',
      keywords: ['table', 'column'],
      priority: 60,
      command: addColumnRight(),
    }),
    'delete-row': tableCommandSlashItem({
      id: 'delete-row',
      labelKey: { name: 'deleteRow' },
      label: 'Delete row',
      keywords: ['table', 'row', 'remove'],
      priority: 50,
      command: deleteTableRow(),
    }),
    'delete-column': tableCommandSlashItem({
      id: 'delete-column',
      labelKey: { name: 'deleteColumn' },
      label: 'Delete column',
      keywords: ['table', 'column', 'remove'],
      priority: 40,
      command: deleteTableColumn(),
    }),
    'delete-table': tableCommandSlashItem({
      id: 'delete-table',
      labelKey: { name: 'deleteTable' },
      label: 'Delete table',
      keywords: ['table', 'remove'],
      priority: 30,
      command: deleteWholeTable(),
    }),
  };
}
