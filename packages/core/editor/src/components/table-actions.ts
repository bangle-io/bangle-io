import type {
  EditorState,
  Command as PMCommand,
} from '@bangle.io/prosemirror-plugins';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  type LucideIcon,
  Trash2,
} from 'lucide-react';

import type { setupExtensions } from '../extensions';

type EditorExtensions = ReturnType<typeof setupExtensions>;

/**
 * One table operation shared by every surface that offers it (the hover
 * table menu, the in-table slash menu). Keeping label, command, and
 * availability together stops the surfaces from drifting — e.g. "Add row
 * above" is impossible in the header row and must be gated identically
 * everywhere.
 */
export type TableAction = {
  /** Stable kebab-case id; the slash menu uses it as the filter value. */
  id: string;
  /** Extra search aliases for the slash menu filter. */
  keywords: string;
  title: () => string;
  icon: LucideIcon;
  /** Menu placement: structural inserts vs. removals. */
  section: 'insert' | 'delete';
  destructive?: boolean;
  command: (ext: EditorExtensions) => PMCommand;
};

export const TABLE_ACTIONS: TableAction[] = [
  {
    id: 'add-row-above',
    keywords: 'row up insert',
    title: () => t.app.editor.tableMenu.addRowAbove,
    icon: ArrowUp,
    section: 'insert',
    command: (ext) => ext.table.command.addRowAbove,
  },
  {
    id: 'add-row-below',
    keywords: 'row down insert',
    title: () => t.app.editor.tableMenu.addRowBelow,
    icon: ArrowDown,
    section: 'insert',
    command: (ext) => ext.table.command.addRowBelow,
  },
  {
    id: 'add-column-left',
    keywords: 'column insert',
    title: () => t.app.editor.tableMenu.addColumnLeft,
    icon: ArrowLeft,
    section: 'insert',
    command: (ext) => ext.table.command.addColumnLeft,
  },
  {
    id: 'add-column-right',
    keywords: 'column insert',
    title: () => t.app.editor.tableMenu.addColumnRight,
    icon: ArrowRight,
    section: 'insert',
    command: (ext) => ext.table.command.addColumnRight,
  },
  {
    id: 'delete-row',
    keywords: 'row remove',
    title: () => t.app.editor.tableMenu.deleteRow,
    icon: Trash2,
    section: 'delete',
    command: (ext) => ext.table.command.deleteRow,
  },
  {
    id: 'delete-column',
    keywords: 'column remove',
    title: () => t.app.editor.tableMenu.deleteColumn,
    icon: Trash2,
    section: 'delete',
    command: (ext) => ext.table.command.deleteColumn,
  },
  {
    id: 'delete-table',
    keywords: 'table remove',
    title: () => t.app.editor.tableMenu.deleteTable,
    icon: Trash2,
    section: 'delete',
    destructive: true,
    command: (ext) => ext.table.command.deleteTable,
  },
];

/**
 * ProseMirror commands report applicability when called without a dispatch;
 * that dry-run is the single availability policy for table actions.
 */
export function isTableActionAvailable(
  action: TableAction,
  ext: EditorExtensions,
  state: EditorState,
): boolean {
  return action.command(ext)(state);
}
