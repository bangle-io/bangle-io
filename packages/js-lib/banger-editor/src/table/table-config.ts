import type { NodeType, Schema } from '../pm';
import { defaultGetParagraphNodeType } from '../pm-utils';

export type TableCellAlign = 'left' | 'center' | 'right';

const ALIGN_VALUES: readonly TableCellAlign[] = ['left', 'center', 'right'];

export type TableConfig = {
  tableGroup?: string;
  defaultRows?: number;
  defaultColumns?: number;
  getParagraphNodeType?: (schema: Schema) => NodeType;
  hardBreakNodeName?: string;
  // keys
  keyGoToNextCell?: string | false;
  keyGoToPrevCell?: string | false;
};

export type RequiredConfig = Required<TableConfig>;

export const DEFAULT_CONFIG: RequiredConfig = {
  tableGroup: 'block',
  defaultRows: 3,
  defaultColumns: 3,
  getParagraphNodeType: defaultGetParagraphNodeType,
  hardBreakNodeName: 'hard_break',
  keyGoToNextCell: 'Tab',
  keyGoToPrevCell: 'Shift-Tab',
};

export function parseAlign(value: unknown): TableCellAlign | null {
  return ALIGN_VALUES.find((align) => align === value) ?? null;
}
