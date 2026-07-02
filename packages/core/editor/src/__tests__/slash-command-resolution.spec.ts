// @vitest-environment jsdom

import {
  builders,
  type CollectionType,
  EditorState,
  EditorView,
  type PMNode,
  resolve,
  resolveSlashCommandGroups,
  runSlashCommandItem,
  Schema,
  type SlashCommandExtensions,
  setupBase,
  setupCodeBlock,
  setupHardBreak,
  setupHeading,
  setupList,
  setupParagraph,
  setupTable,
  TextSelection,
} from '@bangle.io/prosemirror-plugins';
import { afterEach, describe, expect, it } from 'vitest';

import {
  APP_SLASH_COMMAND_GROUPS,
  appSlashCommands,
} from '../slash-app-commands';

type TaggedDoc = PMNode & {
  tag?: {
    cursor?: number;
  };
};

const extensions = {
  base: setupBase(),
  paragraph: setupParagraph(),
  heading: setupHeading(),
  list: setupList(),
  codeBlock: setupCodeBlock(),
  hardBreak: setupHardBreak(),
  table: setupTable(),
} satisfies SlashCommandExtensions;

const appItems = appSlashCommands();
const collectionList: CollectionType[] = Object.values(extensions);
const resolved = resolve(collectionList);
const schema = new Schema({
  nodes: resolved.nodes,
  marks: resolved.marks,
});
const testBuilders = builders(schema, {
  codeBlock: { nodeType: 'code_block', language: '' },
  doc: { nodeType: 'doc' },
  heading: { nodeType: 'heading', level: 1 },
  list: { nodeType: 'list', kind: 'bullet' },
  p: { nodeType: 'paragraph' },
  table: { nodeType: 'table' },
  row: { nodeType: 'table_row' },
  th: { nodeType: 'table_header' },
  td: { nodeType: 'table_cell' },
});

const mountedViews = new Set<EditorView>();

afterEach(() => {
  for (const view of mountedViews) {
    view.destroy();
  }
  mountedViews.clear();
  document.body.replaceChildren();
});

function nodeBuilder(name: string) {
  const builder = testBuilders[name];
  if (typeof builder !== 'function') {
    throw new Error(`Missing test builder: ${name}`);
  }
  return builder;
}

const doc = nodeBuilder('doc');
const codeBlock = nodeBuilder('codeBlock');
const heading = nodeBuilder('heading');
const list = nodeBuilder('list');
const p = nodeBuilder('p');
const table = nodeBuilder('table');
const row = nodeBuilder('row');
const th = nodeBuilder('th');
const td = nodeBuilder('td');

function createEditor(initialDoc: TaggedDoc): EditorView {
  const mount = document.createElement('div');
  document.body.append(mount);
  const state = EditorState.create({
    doc: initialDoc,
    schema,
    selection:
      typeof initialDoc.tag?.cursor === 'number'
        ? TextSelection.create(initialDoc, initialDoc.tag.cursor)
        : undefined,
    plugins: resolved.resolvePlugins({ schema }),
  });
  const view = new EditorView(mount, { state });
  mountedViews.add(view);
  return view;
}

function resolveIds(view: EditorView, query = '', position?: number): string[] {
  return resolveSlashCommandGroups({
    extensions,
    items: appItems,
    view,
    query,
    position,
    groupOrder: APP_SLASH_COMMAND_GROUPS,
  }).flatMap((group) => group.items.map((item) => item.id));
}

function expectIds(view: EditorView, expected: readonly string[]) {
  expect(resolveIds(view)).toEqual(expected);
}

function tableCellContentPositions(document: PMNode): number[] {
  const result: number[] = [];
  document.descendants((node, position) => {
    if (node.type.spec.tableRole === 'cell') {
      result.push(position + 1);
    }
    return true;
  });
  if (!result.length) {
    throw new Error('Expected a table cell');
  }
  return result;
}

function firstTableCellContentPosition(document: PMNode): number {
  const [position] = tableCellContentPositions(document);
  if (typeof position !== 'number') {
    throw new Error('Expected a table cell');
  }
  return position;
}

const topLevelParagraphIds = [
  'heading-1',
  'heading-2',
  'heading-3',
  'code-block',
  'insert-table',
  'bullet-list',
  'numbered-list',
  'todo-list',
  'date-picker',
  'today',
  'yesterday',
  'next-week',
  'next-month',
];

const tableCellIds = [
  'add-row-above',
  'add-row-below',
  'add-column-left',
  'add-column-right',
  'delete-row',
  'delete-column',
  'delete-table',
  'date-picker',
  'today',
  'yesterday',
  'next-week',
  'next-month',
];

const firstRowTableCellIds = tableCellIds.filter(
  (id) => id !== 'add-row-above',
);

describe('slash command item resolution', () => {
  it('shows Markdown block commands from extension contributions outside tables', () => {
    const view = createEditor(doc(p('<cursor>')));

    expectIds(view, topLevelParagraphIds);
  });

  it('resolves Markdown-supported slash commands across major block contexts', () => {
    const cases: Array<{
      name: string;
      document: TaggedDoc;
      expected: readonly string[];
    }> = [
      {
        name: 'paragraph',
        document: doc(p('<cursor>')),
        expected: topLevelParagraphIds,
      },
      {
        name: 'heading',
        document: doc(heading('<cursor>Title')),
        expected: [
          'paragraph',
          'heading-1',
          'heading-2',
          'heading-3',
          'code-block',
          'insert-table',
          'bullet-list',
          'numbered-list',
          'todo-list',
          'date-picker',
          'today',
          'yesterday',
          'next-week',
          'next-month',
        ],
      },
      {
        name: 'code block',
        document: doc(codeBlock('<cursor>const value = true;')),
        expected: [
          'paragraph',
          'heading-1',
          'heading-2',
          'heading-3',
          'code-block',
          'insert-table',
          'bullet-list',
          'numbered-list',
          'todo-list',
          'date-picker',
          'today',
          'yesterday',
          'next-week',
          'next-month',
        ],
      },
      {
        name: 'list item',
        document: doc(list(p('<cursor>'))),
        expected: topLevelParagraphIds,
      },
      {
        name: 'table body cell',
        document: doc(
          table(row(th('Name'), th('Value')), row(td('A<cursor>'), td('B'))),
        ),
        expected: tableCellIds,
      },
      {
        name: 'empty table body cell',
        document: doc(
          table(row(th('Name'), th('Value')), row(td('<cursor>'), td('B'))),
        ),
        expected: tableCellIds,
      },
      {
        name: 'table header cell',
        document: doc(table(row(th('N<cursor>ame'), th('Value')))),
        expected: firstRowTableCellIds,
      },
    ];

    for (const testCase of cases) {
      expectIds(createEditor(testCase.document), testCase.expected);
    }
  });

  it('uses command dry-runs to hide invalid block commands inside table cells', () => {
    const view = createEditor(
      doc(table(row(th('Name'), th('Value')), row(td('A<cursor>'), td('B')))),
    );
    const ids = resolveIds(view);

    expect(ids).not.toEqual(
      expect.arrayContaining([
        'heading-1',
        'code-block',
        'insert-table',
        'bullet-list',
        'numbered-list',
        'todo-list',
      ]),
    );
    expect(ids).toEqual(tableCellIds);
  });

  it('uses the active slash position for table context when selection has moved', () => {
    const document = doc(
      p('outside<cursor>'),
      table(row(th('Name'), th('Value')), row(td(''), td('B'))),
    );
    const view = createEditor(document);
    const ids = resolveIds(view, '', firstTableCellContentPosition(document));

    expect(ids).not.toEqual(
      expect.arrayContaining([
        'heading-1',
        'code-block',
        'insert-table',
        'bullet-list',
        'numbered-list',
        'todo-list',
      ]),
    );
    expect(ids).toEqual(tableCellIds);
  });

  it('filters by label, id, and keywords before grouping', () => {
    const view = createEditor(
      doc(table(row(th('Name'), th('Value')), row(td('A<cursor>'), td('B')))),
    );

    expect(resolveIds(view, 'row')).toEqual([
      'add-row-above',
      'add-row-below',
      'delete-row',
    ]);
  });

  it('matches translated search aliases supplied by the renderer', () => {
    const view = createEditor(doc(p('<cursor>')));

    const ids = resolveSlashCommandGroups({
      extensions,
      items: appItems,
      view,
      query: 'überschrift',
      groupOrder: APP_SLASH_COMMAND_GROUPS,
      searchAliases: (item) =>
        item.id === 'heading-1' ? ['Überschrift 1'] : [],
    }).flatMap((group) => group.items.map((item) => item.id));

    expect(ids).toEqual(['heading-1']);
  });

  it('fails loudly for unknown slash command groups', () => {
    const view = createEditor(doc(p('<cursor>')));
    const invalidExtensions = {
      ...extensions,
      invalid: {
        id: 'invalid',
        slashCommand: {
          invalid: {
            id: 'invalid',
            group: 'unknown',
            labelKey: { name: 'paragraph' },
            label: 'Invalid',
            canRun: () => true,
            run: () => false,
          },
        },
      } satisfies CollectionType,
    };

    expect(() =>
      resolveSlashCommandGroups({
        extensions: invalidExtensions,
        items: appItems,
        view,
        query: '',
        groupOrder: APP_SLASH_COMMAND_GROUPS,
      }),
    ).toThrow('Unknown slash command group: unknown');
  });

  it('runs table-local slash commands against the current selection', () => {
    const view = createEditor(
      doc(table(row(th('Name'), th('Value')), row(td('A<cursor>'), td('B')))),
    );
    const item = resolveSlashCommandGroups({
      extensions,
      items: appItems,
      view,
      query: 'row below',
      groupOrder: APP_SLASH_COMMAND_GROUPS,
    })
      .flatMap((group) => group.items)
      .find((candidate) => candidate.id === 'add-row-below');

    expect(item).toBeDefined();
    expect(
      item &&
        runSlashCommandItem({
          item,
          view,
          query: 'row below',
        }),
    ).toBe(true);
    expect(view.state.doc.child(0).childCount).toBe(3);
  });

  it('resolves table-local slash commands against the active slash position when focus has moved', () => {
    const document = doc(
      p('outside<cursor>'),
      table(row(th('Name'), th('Value')), row(td('A'), td(''))),
    );
    const view = createEditor(document);
    const item = resolveSlashCommandGroups({
      extensions,
      items: appItems,
      view,
      query: 'row below',
      position: tableCellContentPositions(document)[1],
      groupOrder: APP_SLASH_COMMAND_GROUPS,
    })
      .flatMap((group) => group.items)
      .find((candidate) => candidate.id === 'add-row-below');

    expect(item).toBeDefined();
  });
});
