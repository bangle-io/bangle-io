import { Logger } from '@bangle.io/logger';
import {
  EditorState,
  markdownLoader,
  type PMNode,
  resolve,
  Schema,
  TextSelection,
} from '@bangle.io/prosemirror-plugins';
import { describe, expect, it, vi } from 'vitest';
import {
  buildSlashMenuGroups,
  type SlashMenuActions,
  type SlashMenuGroup,
  slashMenuFilter,
} from '../components/slash-items';
import { setupExtensions } from '../extensions';

function createExtensions() {
  return setupExtensions(new Logger('test', 'error'), undefined, undefined, {
    storeFiles: async () => [],
  });
}

function createState(source: string, select: (doc: PMNode) => number) {
  const extensions = createExtensions();
  const resolved = resolve(extensions, false, true);
  const schema = new Schema({
    marks: resolved.marks,
    nodes: resolved.nodes,
    topNode: 'doc',
  });
  const markdown = markdownLoader([...Object.values(extensions)], schema);
  const doc = markdown.parser.parse(source);
  const position = select(doc);
  return {
    extensions,
    state: EditorState.create({
      doc,
      schema,
      selection: TextSelection.create(doc, position),
    }),
  };
}

function textPosition(doc: PMNode, text: string) {
  let position = -1;
  doc.descendants((node, nodePosition) => {
    if (position === -1 && node.isText && node.text?.includes(text)) {
      position = nodePosition + node.text.indexOf(text) + 1;
    }
  });
  if (position === -1) throw new Error(`Expected text ${text}`);
  return position;
}

function findItem(groups: readonly SlashMenuGroup[], title: string) {
  const item = groups
    .flatMap((group) => group.items)
    .find((entry) => entry.title === title);
  if (!item) throw new Error(`Expected slash item ${title}`);
  return item;
}

function actions(): SlashMenuActions {
  return {
    insertText: vi.fn(),
    openDatePicker: vi.fn(),
    openFilePicker: vi.fn(),
    run: vi.fn(),
  };
}

describe('slashMenuFilter', () => {
  it('ranks a canonical-id prefix highest', () => {
    expect(slashMenuFilter('date calendar', 'date')).toBe(1);
    expect(slashMenuFilter('heading-1 h1 title large', 'head')).toBe(1);
  });

  it('matches alias word prefixes below canonical prefixes', () => {
    expect(slashMenuFilter('heading-1 h1 title large', 'h1')).toBe(0.8);
    expect(slashMenuFilter('date calendar', 'cal')).toBe(0.8);
    // "heading-1" splits on the dash, so the number is a word too.
    expect(slashMenuFilter('heading-1 h1 title large', '1')).toBe(0.8);
  });

  it('matches plain substrings lowest', () => {
    expect(slashMenuFilter('numbered-list ordered ol', 'bere')).toBe(0.5);
  });

  it('rejects scattered fuzzy matches', () => {
    // cmdk's fuzzy scorer used to let "date" match "heading-1 h1 title
    // large" via scattered letters and outrank the Date item.
    expect(slashMenuFilter('heading-1 h1 title large', 'date')).toBe(0);
    expect(slashMenuFilter('bullet-list unordered ul', 'code')).toBe(0);
  });

  it('shows everything for an empty query', () => {
    expect(slashMenuFilter('anything at all', '')).toBe(1);
    expect(slashMenuFilter('anything at all', '   ')).toBe(1);
  });

  it('is case-insensitive', () => {
    expect(slashMenuFilter('date calendar', 'DATE')).toBe(1);
  });
});

describe('slash item registry', () => {
  it('keeps canonical group and item order, icons, and action wiring', () => {
    const { extensions, state } = createState('', () => 1);
    const menuActions = actions();
    const groups = buildSlashMenuGroups(extensions, state, menuActions);

    expect(groups.map((group) => group.heading)).toEqual([
      'Basic blocks',
      'Lists',
      'Assets',
      'Time',
    ]);
    expect(
      groups.flatMap((group) => group.items.map((item) => item.title)),
    ).toEqual([
      'Text',
      'Heading 1',
      'Heading 2',
      'Heading 3',
      'Code block',
      'Math block',
      'Frontmatter',
      'Table',
      'Bullet list',
      'Numbered list',
      'To-do list',
      'Upload file',
      'Date',
      'Today',
      'Yesterday',
      'Next week',
      'Next month',
    ]);
    expect(findItem(groups, 'Code block').icon).toBeDefined();
    expect(findItem(groups, 'Code block').description).toBeDefined();

    findItem(groups, 'Code block').onSelect();
    expect(menuActions.run).toHaveBeenCalledWith(
      extensions.codeBlock.command.toggleCodeBlock,
    );
    findItem(groups, 'Upload file').onSelect();
    expect(menuActions.openFilePicker).toHaveBeenCalledOnce();
    findItem(groups, 'Date').onSelect();
    expect(menuActions.openDatePicker).toHaveBeenCalledOnce();
  });

  it('runs quick-date callbacks from one fixed clock and preserves refocus flags', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2028, 11, 15, 12));
    try {
      const { extensions, state } = createState('', () => 1);
      const menuActions = actions();
      const insertTable = vi.spyOn(extensions.table.command, 'insertTable');
      const groups = buildSlashMenuGroups(extensions, state, menuActions);

      findItem(groups, 'Today').onSelect();
      findItem(groups, 'Yesterday').onSelect();
      findItem(groups, 'Next week').onSelect();
      findItem(groups, 'Next month').onSelect();
      expect(menuActions.insertText).toHaveBeenNthCalledWith(1, 'Dec 15, 2028');
      expect(menuActions.insertText).toHaveBeenNthCalledWith(2, 'Dec 14, 2028');
      expect(menuActions.insertText).toHaveBeenNthCalledWith(
        3,
        'December 17th, 2028',
      );
      expect(menuActions.insertText).toHaveBeenNthCalledWith(4, 'Jan 1, 2029');

      findItem(groups, 'Frontmatter').onSelect();
      expect(menuActions.run).toHaveBeenLastCalledWith(
        extensions.frontmatter.command.insertFrontmatter,
        { refocus: true },
      );
      findItem(groups, 'Math block').onSelect();
      const mathCommand = vi.mocked(menuActions.run).mock.calls.at(-1)?.[0];
      if (!mathCommand) throw new Error('Expected Math block command');
      let withMath = state;
      expect(
        mathCommand(state, (tr) => {
          withMath = state.apply(tr);
        }),
      ).toBe(true);
      expect(withMath.doc.firstChild?.type.name).toBe('math_display');
      findItem(groups, 'Table').onSelect();
      expect(insertTable).toHaveBeenCalledOnce();
      expect(menuActions.run).toHaveBeenLastCalledWith(expect.any(Function), {
        refocus: true,
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('offers frontmatter once, inserts above the body, and keeps its refocus contract', () => {
    const initial = createState('body', (doc) => textPosition(doc, 'body'));
    const menuActions = actions();
    const groups = buildSlashMenuGroups(
      initial.extensions,
      initial.state,
      menuActions,
    );

    findItem(groups, 'Frontmatter').onSelect();
    expect(menuActions.run).toHaveBeenCalledExactlyOnceWith(
      initial.extensions.frontmatter.command.insertFrontmatter,
      { refocus: true },
    );

    let withFrontmatter = initial.state;
    expect(
      initial.extensions.frontmatter.command.insertFrontmatter(
        initial.state,
        (tr) => {
          withFrontmatter = initial.state.apply(tr);
        },
      ),
    ).toBe(true);
    expect(withFrontmatter.doc.firstChild?.type.name).toBe('frontmatter');
    expect(withFrontmatter.doc.lastChild?.textContent).toBe('body');

    const afterInsertGroups = buildSlashMenuGroups(
      initial.extensions,
      withFrontmatter,
      actions(),
    );
    expect(
      afterInsertGroups
        .flatMap((group) => group.items)
        .some((item) => item.title === 'Frontmatter'),
    ).toBe(false);

    const docBeforeDuplicateInsert = withFrontmatter.doc;
    expect(
      initial.extensions.frontmatter.command.insertFrontmatter(
        withFrontmatter,
        (tr) => {
          withFrontmatter = withFrontmatter.apply(tr);
        },
      ),
    ).toBe(true);
    expect(withFrontmatter.doc.eq(docBeforeDuplicateInsert)).toBe(true);
    expect(withFrontmatter.selection.$from.parent.type.name).toBe(
      'frontmatter',
    );
  });

  it('uses table command availability and hides block transforms in table cells', () => {
    const source = [
      '| heading | other |',
      '| --- | --- |',
      '| cell | value |',
    ].join('\n');
    const body = createState(source, (doc) => textPosition(doc, 'cell'));
    const header = createState(source, (doc) => textPosition(doc, 'heading'));
    const bodyActions = actions();
    const bodyGroups = buildSlashMenuGroups(
      body.extensions,
      body.state,
      bodyActions,
    );
    const headerGroups = buildSlashMenuGroups(
      header.extensions,
      header.state,
      actions(),
    );

    expect(bodyGroups.map((group) => group.heading)).toEqual([
      'Table',
      'Assets',
      'Time',
    ]);
    expect(findItem(bodyGroups, 'Add row above').icon).toBeDefined();
    expect(() => findItem(bodyGroups, 'Code block')).toThrow();
    expect(() => findItem(bodyGroups, 'Frontmatter')).toThrow();
    expect(findItem(headerGroups, 'Add row below')).toBeDefined();
    expect(() => findItem(headerGroups, 'Add row above')).toThrow();

    findItem(bodyGroups, 'Add row below').onSelect();
    expect(bodyActions.run).toHaveBeenCalledWith(
      body.extensions.table.command.addRowBelow,
    );
  });
});
