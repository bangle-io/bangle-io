import { Logger } from '@bangle.io/logger';
import {
  EditorState,
  markdownLoader,
  resolve,
  Schema,
  TextSelection,
} from '@bangle.io/prosemirror-plugins';
import { describe, expect, it } from 'vitest';
import { setupExtensions } from '../../extensions';
import { isTableActionAvailable, TABLE_ACTIONS } from '../table-actions';

function setup() {
  const extensions = setupExtensions(new Logger('test', 'error'));
  const resolved = resolve(extensions, false, true);
  const schema = new Schema({
    marks: resolved.marks,
    nodes: resolved.nodes,
    topNode: 'doc',
  });
  const markdown = markdownLoader([...Object.values(extensions)], schema);
  const doc = markdown.parser.parse(
    ['| heading | other |', '| --- | --- |', '| cell | value |'].join('\n'),
  );
  const cellPositions: number[] = [];
  doc.descendants((node, pos) => {
    if (node.type.name === 'table_header' || node.type.name === 'table_cell') {
      cellPositions.push(pos);
    }
    return true;
  });
  const headerCell = cellPositions[0];
  const bodyCell = cellPositions[2];
  if (headerCell == null || bodyCell == null) {
    throw new Error('Expected table cells');
  }

  return {
    bodyState: EditorState.create({
      doc,
      schema,
      selection: TextSelection.create(doc, bodyCell + 1),
    }),
    extensions,
    headerState: EditorState.create({
      doc,
      schema,
      selection: TextSelection.create(doc, headerCell + 1),
    }),
  };
}

describe('TABLE_ACTIONS', () => {
  it('maps every shared action to its table command and uses command availability', () => {
    const { bodyState, extensions, headerState } = setup();

    expect(
      TABLE_ACTIONS.map(({ destructive = false, id, section }) => ({
        destructive,
        id,
        section,
      })),
    ).toEqual([
      { destructive: false, id: 'add-row-above', section: 'insert' },
      { destructive: false, id: 'add-row-below', section: 'insert' },
      { destructive: false, id: 'add-column-left', section: 'insert' },
      { destructive: false, id: 'add-column-right', section: 'insert' },
      { destructive: false, id: 'delete-row', section: 'delete' },
      { destructive: false, id: 'delete-column', section: 'delete' },
      { destructive: true, id: 'delete-table', section: 'delete' },
    ]);
    expect(TABLE_ACTIONS.map((action) => action.command(extensions))).toEqual([
      extensions.table.command.addRowAbove,
      extensions.table.command.addRowBelow,
      extensions.table.command.addColumnLeft,
      extensions.table.command.addColumnRight,
      extensions.table.command.deleteRow,
      extensions.table.command.deleteColumn,
      extensions.table.command.deleteTable,
    ]);

    expect(
      TABLE_ACTIONS.map((action) =>
        isTableActionAvailable(action, extensions, headerState),
      ),
    ).toEqual([false, true, true, true, true, true, true]);
    expect(
      TABLE_ACTIONS.map((action) =>
        isTableActionAvailable(action, extensions, bodyState),
      ),
    ).toEqual([true, true, true, true, true, true, true]);
  });
});
