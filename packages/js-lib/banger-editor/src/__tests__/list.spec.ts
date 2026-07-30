// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';
import { setupBase } from '../base';
import { setupCodeBlock } from '../code-block';
import { setupList } from '../list';
import { setupParagraph } from '../paragraph';
import {
  type Command,
  DOMParser,
  type EditorView,
  type PMNode,
  TextSelection,
} from '../pm';
import { createBangerEditorTestSetup } from '../test-helpers';

const lists = setupList();
const editorTest = createBangerEditorTestSetup({
  extensions: [setupBase(), setupParagraph(), setupCodeBlock(), lists],
  builderAliases: {
    codeBlock: { nodeType: 'code_block', language: '' },
    doc: { nodeType: 'doc' },
    list: { nodeType: 'list' },
    p: { nodeType: 'paragraph' },
  },
});

const { doc, p } = editorTest.builders;
const list = editorTest.nodeBuilder('list');

afterEach(() => editorTest.cleanup());

type ListShape = {
  checked?: boolean;
  kind: 'bullet' | 'ordered' | 'task';
  listKind: 'bullet' | 'ordered';
  tight: boolean;
};

function expectListShapes(editorDoc: PMNode, expected: readonly ListShape[]) {
  expect(editorDoc.childCount).toBe(expected.length);
  expected.forEach((attrs, index) => {
    const actual = editorDoc.child(index).attrs;
    expect({
      ...actual,
      listKind:
        actual.listKind ?? (actual.kind === 'ordered' ? 'ordered' : 'bullet'),
    }).toMatchObject(attrs);
  });
}

function run(
  command: Command,
  editor: ReturnType<typeof editorTest.createEditor>,
) {
  expect(command(editor.view.state, editor.view.dispatch)).toBe(true);
}

function typeText(view: EditorView, text: string) {
  for (const char of text) {
    const insertChar = () => view.state.tr.insertText(char);
    const handled = view.someProp('handleTextInput', (handler) =>
      handler(
        view,
        view.state.selection.from,
        view.state.selection.to,
        char,
        insertChar,
      ),
    );
    if (!handled) view.dispatch(insertChar());
  }
}

describe('list Markdown metadata through editing commands', () => {
  it.each<{ command: Command; expected: ListShape; name: string }>([
    {
      command: lists.command.toggleBulletList,
      expected: { kind: 'bullet', listKind: 'bullet', tight: true },
      name: 'bullet',
    },
    {
      command: lists.command.toggleOrderedList,
      expected: { kind: 'ordered', listKind: 'ordered', tight: true },
      name: 'ordered',
    },
    {
      command: lists.command.toggleTaskList,
      expected: {
        checked: false,
        kind: 'task',
        listKind: 'bullet',
        tight: true,
      },
      name: 'task',
    },
  ])('creates tight $name lists from one or several paragraphs', ({
    command,
    expected,
  }) => {
    const single = editorTest.createEditor(doc(p('one<cursor>')));
    run(command, single);
    expectListShapes(single.view.state.doc, [expected]);

    const multiple = editorTest.createEditor(
      doc(p('one<start>'), p('two'), p('three<end>')),
    );
    run(command, multiple);
    expectListShapes(multiple.view.state.doc, [expected, expected, expected]);
  });

  it.each<{ name: string; source: ListShape }>([
    {
      name: 'tight bullet',
      source: { kind: 'bullet', listKind: 'bullet', tight: true },
    },
    {
      name: 'loose bullet',
      source: { kind: 'bullet', listKind: 'bullet', tight: false },
    },
    {
      name: 'loose ordered',
      source: { kind: 'ordered', listKind: 'ordered', tight: false },
    },
    {
      name: 'loose ordered checked task',
      source: {
        checked: true,
        kind: 'task',
        listKind: 'ordered',
        tight: false,
      },
    },
  ])('splitting a $name preserves Markdown attrs at every cursor position', ({
    source,
  }) => {
    const positions = [
      { content: '<cursor>one', texts: ['', 'one'] },
      { content: 'o<cursor>ne', texts: ['o', 'ne'] },
      { content: 'one<cursor>', texts: ['one', ''] },
    ] as const;

    for (const { content, texts } of positions) {
      const editor = editorTest.createEditor(doc(list(source, p(content))));

      expect(editor.pressKey('Enter')).toBe(true);
      const markdownAttrs = {
        kind: source.kind,
        listKind: source.listKind,
        tight: source.tight,
      };
      expectListShapes(editor.view.state.doc, [markdownAttrs, markdownAttrs]);
      expect(
        Array.from(
          { length: editor.view.state.doc.childCount },
          (_, index) => editor.view.state.doc.child(index).textContent,
        ),
      ).toEqual(texts);

      if (source.kind === 'task') {
        const checked = Array.from(
          { length: editor.view.state.doc.childCount },
          (_, index) => editor.view.state.doc.child(index).attrs.checked,
        );
        expect(checked).toEqual(
          content.startsWith('<cursor>') ? [false, true] : [true, false],
        );
      }
    }
  });

  it('splitting a nested loose ordered task preserves its parent and both children', () => {
    const outer = {
      kind: 'bullet',
      listKind: 'bullet',
      tight: true,
    } as const;
    const nested = {
      checked: true,
      kind: 'task',
      listKind: 'ordered',
      tight: false,
    } as const;
    const editor = editorTest.createEditor(
      doc(list(outer, p('outer'), list(nested, p('<cursor>nested')))),
    );

    expect(editor.pressKey('Enter')).toBe(true);
    const parent = editor.view.state.doc.firstChild;
    expect(parent?.attrs).toMatchObject(outer);
    expect(parent?.childCount).toBe(3);
    expect(parent?.child(1).attrs).toMatchObject({
      ...nested,
      checked: false,
    });
    expect(parent?.child(2).attrs).toMatchObject(nested);
  });

  it('keeps an ordered input-rule list ordered when converting it to tasks', () => {
    const editor = editorTest.createEditor(doc(p('<cursor>')));
    typeText(editor.view, '1. ordered');

    expectListShapes(editor.view.state.doc, [
      { kind: 'ordered', listKind: 'ordered', tight: true },
    ]);
    run(lists.command.toggleTaskList, editor);
    expectListShapes(editor.view.state.doc, [
      {
        checked: false,
        kind: 'task',
        listKind: 'ordered',
        tight: true,
      },
    ]);
    expect(editor.view.state.doc.textContent).toBe('ordered');
  });

  it('keeps an ordinary HTML ordered list ordered when converting it to tasks', () => {
    const host = document.createElement('div');
    host.innerHTML = '<ol><li>pasted one</li><li>pasted two</li></ol>';
    const parsed = DOMParser.fromSchema(editorTest.schema).parse(host);
    expectListShapes(parsed, [
      { kind: 'ordered', listKind: 'ordered', tight: true },
      { kind: 'ordered', listKind: 'ordered', tight: true },
    ]);

    const editor = editorTest.createEditor(parsed);
    editor.view.dispatch(
      editor.view.state.tr.setSelection(
        TextSelection.between(
          editor.view.state.doc.resolve(1),
          editor.view.state.doc.resolve(editor.view.state.doc.content.size - 1),
        ),
      ),
    );
    run(lists.command.toggleTaskList, editor);
    expectListShapes(editor.view.state.doc, [
      {
        checked: false,
        kind: 'task',
        listKind: 'ordered',
        tight: true,
      },
      {
        checked: false,
        kind: 'task',
        listKind: 'ordered',
        tight: true,
      },
    ]);
  });

  it.each([
    {
      container: 'bullet',
      html: '<ul><li data-list-kind="task" data-checked>done</li></ul>',
      listKind: 'bullet',
    },
    {
      container: 'ordered',
      html: '<ol><li data-list-kind="task" data-checked>done</li></ol>',
      listKind: 'ordered',
    },
  ] as const)('preserves data-checked when parsing a $container task list', ({
    html,
    listKind,
  }) => {
    const host = document.createElement('div');
    host.innerHTML = html;

    const parsed = DOMParser.fromSchema(editorTest.schema).parse(host);

    expectListShapes(parsed, [
      { checked: true, kind: 'task', listKind, tight: true },
    ]);
  });

  it.each([
    { checked: false, checkedAttribute: '', label: 'unchecked' },
    { checked: true, checkedAttribute: ' checked', label: 'checked' },
  ])('parses a $label checkbox in an ordered list as a task', ({
    checked,
    checkedAttribute,
  }) => {
    const host = document.createElement('div');
    host.innerHTML = `<ol><li><input type="checkbox"${checkedAttribute}>task</li></ol>`;

    const parsed = DOMParser.fromSchema(editorTest.schema).parse(host);

    expectListShapes(parsed, [
      {
        checked,
        kind: 'task',
        listKind: 'ordered',
        tight: true,
      },
    ]);
  });

  it.each([
    { checked: false, marker: '[ ]' },
    { checked: true, marker: '[x]' },
    { checked: true, marker: '[X]' },
  ])('creates a checked=$checked task from $marker input', ({
    checked,
    marker,
  }) => {
    const editor = editorTest.createEditor(doc(p('<cursor>')));

    typeText(editor.view, `${marker} task`);

    expectListShapes(editor.view.state.doc, [
      {
        checked,
        kind: 'task',
        listKind: 'bullet',
        tight: true,
      },
    ]);
    expect(editor.view.state.doc.textContent).toBe('task');
  });

  it('does not create a task from a pipe checkbox marker', () => {
    const editor = editorTest.createEditor(doc(p('<cursor>')));

    typeText(editor.view, '[|] not a task');

    expect(editor.view.state.doc.firstChild?.type.name).toBe('paragraph');
    expect(editor.view.state.doc.textContent).toBe('[|] not a task');
  });

  it.each([
    {
      name: 'ordered item',
      source: { kind: 'ordered', listKind: 'ordered', tight: true },
    },
    {
      name: 'loose ordered task',
      source: {
        checked: true,
        kind: 'task',
        listKind: 'ordered',
        tight: false,
      },
    },
  ] as const)('turns an existing $name into a bullet from typed input', ({
    source,
  }) => {
    const editor = editorTest.createEditor(doc(list(source, p('<cursor>'))));

    typeText(editor.view, '- converted');

    expectListShapes(editor.view.state.doc, [
      { kind: 'bullet', listKind: 'bullet', tight: source.tight },
    ]);
    expect(editor.view.state.doc.textContent).toBe('converted');
  });

  it.each<{
    command: Command;
    expected: ListShape;
    name: string;
    source: ListShape;
  }>([
    {
      command: lists.command.toggleOrderedList,
      expected: { kind: 'ordered', listKind: 'ordered', tight: false },
      name: 'bullet to ordered',
      source: { kind: 'bullet', listKind: 'bullet', tight: false },
    },
    {
      command: lists.command.toggleBulletList,
      expected: { kind: 'bullet', listKind: 'bullet', tight: false },
      name: 'ordered to bullet',
      source: { kind: 'ordered', listKind: 'ordered', tight: false },
    },
    {
      command: lists.command.toggleTaskList,
      expected: {
        checked: false,
        kind: 'task',
        listKind: 'bullet',
        tight: false,
      },
      name: 'bullet to task',
      source: { kind: 'bullet', listKind: 'bullet', tight: false },
    },
    {
      command: lists.command.toggleTaskList,
      expected: {
        checked: false,
        kind: 'task',
        listKind: 'ordered',
        tight: false,
      },
      name: 'ordered to ordered task',
      source: { kind: 'ordered', listKind: 'ordered', tight: false },
    },
    // Changing the marker of a task keeps the task: the container becomes
    // ordered/bullet while the checkbox survives, which Markdown writes as
    // `1. [x] item`. Rewriting `kind` here used to drop the checkbox outright.
    {
      command: lists.command.toggleOrderedList,
      expected: {
        checked: true,
        kind: 'task',
        listKind: 'ordered',
        tight: false,
      },
      name: 'bullet task to ordered',
      source: {
        checked: true,
        kind: 'task',
        listKind: 'bullet',
        tight: false,
      },
    },
    {
      command: lists.command.toggleBulletList,
      expected: {
        checked: true,
        kind: 'task',
        listKind: 'bullet',
        tight: false,
      },
      name: 'ordered task to bullet',
      source: {
        checked: true,
        kind: 'task',
        listKind: 'ordered',
        tight: false,
      },
    },
  ])('$name preserves a loose run', ({ command, expected, source }) => {
    const editor = editorTest.createEditor(
      doc(list(source, p('one<start>')), list(source, p('two<end>'))),
    );

    run(command, editor);
    expectListShapes(editor.view.state.doc, [expected, expected]);
  });

  it('converts the whole same-level list run from the selected item', () => {
    const bullet = {
      kind: 'bullet',
      listKind: 'bullet',
      tight: false,
    } as const;
    const ordered = {
      kind: 'ordered',
      listKind: 'ordered',
      tight: false,
    } as const;
    const editor = editorTest.createEditor(
      doc(
        list(bullet, p('one')),
        list(bullet, p('two<start><end>')),
        list(bullet, p('three')),
      ),
    );

    run(lists.command.toggleOrderedList, editor);
    expectListShapes(editor.view.state.doc, [ordered, ordered, ordered]);
  });

  it('converts a whole list run without changing surrounding paragraphs', () => {
    const bullet = { kind: 'bullet', listKind: 'bullet', tight: true } as const;
    const ordered = {
      kind: 'ordered',
      listKind: 'ordered',
      tight: true,
    } as const;
    const editor = editorTest.createEditor(
      doc(
        p('before'),
        list(bullet, p('one')),
        list(bullet, p('two<start><end>')),
        list(bullet, p('three')),
        p('after'),
      ),
    );

    run(lists.command.toggleOrderedList, editor);
    expect(editor.view.state.doc.child(0).textContent).toBe('before');
    expect(editor.view.state.doc.child(4).textContent).toBe('after');
    expect(editor.view.state.doc.child(1).attrs).toMatchObject(ordered);
    expect(editor.view.state.doc.child(2).attrs).toMatchObject(ordered);
    expect(editor.view.state.doc.child(3).attrs).toMatchObject(ordered);
  });

  // A task sharing the run's marker is still part of the same Markdown list, so
  // the conversion has to carry it along. Stopping at it would leave
  // `1. one` beside `- [x] task`, splitting one list into two.
  it('carries a task that shares the marker along with the run', () => {
    const bullet = {
      kind: 'bullet',
      listKind: 'bullet',
      tight: true,
    } as const;
    const task = {
      checked: true,
      kind: 'task',
      listKind: 'bullet',
      tight: true,
    } as const;
    const ordered = {
      kind: 'ordered',
      listKind: 'ordered',
      tight: true,
    } as const;
    const editor = editorTest.createEditor(
      doc(
        list(bullet, p('one<cursor>')),
        list(task, p('task')),
        list(bullet, p('two')),
      ),
    );

    run(lists.command.toggleOrderedList, editor);

    expectListShapes(editor.view.state.doc, [
      ordered,
      // The container becomes ordered but the checkbox stays.
      { ...task, listKind: 'ordered' },
      ordered,
    ]);
  });

  it('unwraps only the selected item when toggling the active list kind', () => {
    const bullet = {
      kind: 'bullet',
      listKind: 'bullet',
      tight: true,
    } as const;
    const editor = editorTest.createEditor(
      doc(
        list(bullet, p('one')),
        list(bullet, p('two<cursor>')),
        list(bullet, p('three')),
      ),
    );

    run(lists.command.toggleBulletList, editor);

    expect(editor.view.state.doc.childCount).toBe(3);
    expect(editor.view.state.doc.child(0).attrs).toMatchObject(bullet);
    expect(editor.view.state.doc.child(1).type.name).toBe('paragraph');
    expect(editor.view.state.doc.child(1).textContent).toBe('two');
    expect(editor.view.state.doc.child(2).attrs).toMatchObject(bullet);
  });

  it('keeps each container kind when a mixed selection becomes tasks', () => {
    const bullet = { kind: 'bullet', listKind: 'bullet', tight: true } as const;
    const ordered = {
      kind: 'ordered',
      listKind: 'ordered',
      tight: false,
    } as const;
    const editor = editorTest.createEditor(
      doc(list(bullet, p('bullet<start>')), list(ordered, p('ordered<end>'))),
    );

    run(lists.command.toggleTaskList, editor);
    expectListShapes(editor.view.state.doc, [
      {
        checked: false,
        kind: 'task',
        listKind: 'bullet',
        tight: true,
      },
      {
        checked: false,
        kind: 'task',
        listKind: 'ordered',
        tight: false,
      },
    ]);
  });

  it('converts a selected nested item without changing its parent run', () => {
    const outer = {
      kind: 'ordered',
      listKind: 'ordered',
      tight: true,
    } as const;
    const nested = {
      kind: 'bullet',
      listKind: 'bullet',
      tight: false,
    } as const;
    const nestedTask = {
      checked: false,
      kind: 'task',
      listKind: 'bullet',
      tight: false,
    } as const;
    const editor = editorTest.createEditor(
      doc(
        list(outer, p('outer'), list(nested, p('nested<cursor>'))),
        list(outer, p('sibling')),
      ),
    );

    run(lists.command.toggleTaskList, editor);
    expect(editor.view.state.doc.child(0).attrs).toMatchObject(outer);
    expect(editor.view.state.doc.child(1).attrs).toMatchObject(outer);
    expect(editor.view.state.doc.child(0).child(1).attrs).toMatchObject(
      nestedTask,
    );
  });

  it('keeps a nested run unchanged when converting its parent item', () => {
    const outer = { kind: 'bullet', listKind: 'bullet', tight: true } as const;
    const nested = {
      kind: 'ordered',
      listKind: 'ordered',
      tight: false,
    } as const;
    const editor = editorTest.createEditor(
      doc(list(outer, p('outer<cursor>'), list(nested, p('nested')))),
    );

    run(lists.command.toggleOrderedList, editor);
    expect(editor.view.state.doc.firstChild?.attrs).toMatchObject({
      kind: 'ordered',
      listKind: 'ordered',
      tight: true,
    });
    expect(editor.view.state.doc.firstChild?.child(1).attrs).toMatchObject(
      nested,
    );
  });

  it('preserves multi-block and nested content while converting a task', () => {
    const { codeBlock } = editorTest.builders;
    const nested = { kind: 'bullet', listKind: 'bullet', tight: true } as const;
    const editor = editorTest.createEditor(
      doc(
        list(
          {
            checked: true,
            kind: 'task',
            listKind: 'ordered',
            tight: false,
          },
          p('first<cursor>'),
          p('continuation'),
          codeBlock('const answer = 42;'),
          list(nested, p('nested')),
        ),
      ),
    );
    const contentBefore = editor.view.state.doc.firstChild?.content.toJSON();

    run(lists.command.toggleBulletList, editor);
    expect(editor.view.state.doc.firstChild?.attrs).toMatchObject({
      checked: true,
      kind: 'task',
      listKind: 'bullet',
      tight: false,
    });
    expect(editor.view.state.doc.firstChild?.content.toJSON()).toEqual(
      contentBefore,
    );
  });

  it('preserves a continuation paragraph when converting its list run', () => {
    const bullet = {
      kind: 'bullet',
      listKind: 'bullet',
      tight: false,
    } as const;
    const ordered = {
      kind: 'ordered',
      listKind: 'ordered',
      tight: false,
    } as const;
    const editor = editorTest.createEditor(
      doc(
        list(bullet, p('first'), p('continuation<cursor>')),
        list(bullet, p('sibling')),
      ),
    );
    const contentBefore = editor.view.state.doc.firstChild?.content.toJSON();

    run(lists.command.toggleOrderedList, editor);

    expectListShapes(editor.view.state.doc, [ordered, ordered]);
    expect(editor.view.state.doc.firstChild?.content.toJSON()).toEqual(
      contentBefore,
    );
  });

  it('preserves loose ordered task attrs while indenting and dedenting', () => {
    const parent = {
      checked: true,
      kind: 'task',
      listKind: 'ordered',
      tight: false,
    } as const;
    const child = {
      checked: false,
      kind: 'task',
      listKind: 'ordered',
      tight: false,
    } as const;
    const editor = editorTest.createEditor(
      doc(list(parent, p('parent')), list(child, p('child<cursor>'))),
    );

    run(lists.command.indentList, editor);
    expect(editor.view.state.doc.childCount).toBe(1);
    expect(editor.view.state.doc.firstChild?.attrs).toMatchObject(parent);
    expect(editor.view.state.doc.firstChild?.child(1).attrs).toMatchObject(
      child,
    );

    run(lists.command.dedentList, editor);
    expectListShapes(editor.view.state.doc, [parent, child]);
    expect(editor.view.state.doc.child(0).textContent).toBe('parent');
    expect(editor.view.state.doc.child(1).textContent).toBe('child');
  });

  it('adopts the destination list kind when dedenting into a parent run', () => {
    const bullet = {
      kind: 'bullet',
      listKind: 'bullet',
      tight: true,
    } as const;
    const ordered = {
      kind: 'ordered',
      listKind: 'ordered',
      tight: true,
    } as const;
    const editor = editorTest.createEditor(
      doc(
        list(bullet, p('one'), list(ordered, p('nested<cursor>'))),
        list(bullet, p('two')),
      ),
    );

    run(lists.command.dedentList, editor);

    expectListShapes(editor.view.state.doc, [bullet, bullet, bullet]);
    expect(
      Array.from(
        { length: editor.view.state.doc.childCount },
        (_, index) => editor.view.state.doc.child(index).textContent,
      ),
    ).toEqual(['one', 'nested', 'two']);
  });

  it.each([
    {
      child: {
        checked: false,
        kind: 'task',
        listKind: 'bullet',
        tight: true,
      },
      name: 'bullet task',
      placeholderKind: 'bullet',
    },
    {
      child: {
        checked: true,
        kind: 'task',
        listKind: 'ordered',
        tight: false,
      },
      name: 'ordered task',
      placeholderKind: 'ordered',
    },
  ] as const)('normalizes a deeply indented $name placeholder without changing the task', ({
    child,
    placeholderKind,
  }) => {
    const outer = {
      kind: 'bullet',
      listKind: 'bullet',
      tight: true,
    } as const;
    const editor = editorTest.createEditor(
      doc(
        list(
          outer,
          p('parent'),
          list(child, p('child<cursor>')),
          list(outer, p('sibling')),
        ),
      ),
    );

    run(lists.command.indentList, editor);

    const parent = editor.view.state.doc.firstChild;
    const placeholder = parent?.child(1);
    expect(placeholder?.attrs).toMatchObject({
      checked: false,
      kind: placeholderKind,
      listKind: child.listKind,
    });
    expect(placeholder?.firstChild?.attrs).toMatchObject(child);
    expect(placeholder?.firstChild?.textContent).toBe('child');
  });

  it('does not normalize an existing task whose first block is a list', () => {
    const outer = {
      kind: 'bullet',
      listKind: 'bullet',
      tight: true,
    } as const;
    const task = {
      checked: true,
      kind: 'task',
      listKind: 'bullet',
      tight: true,
    } as const;
    const editor = editorTest.createEditor(
      doc(
        list(task, list(outer, p('existing nested block'))),
        list(outer, p('parent'), list(task, p('child<cursor>'))),
      ),
    );

    run(lists.command.indentList, editor);

    expect(editor.view.state.doc.firstChild?.attrs).toMatchObject(task);
    expect(editor.view.state.doc.firstChild?.firstChild?.textContent).toBe(
      'existing nested block',
    );
  });

  it.each([
    ['toggle task', lists.command.toggleTaskList],
    ['unwrap', lists.command.unwrapList],
  ] as const)('%s targets the real task immediately after deep indentation', (_name, command) => {
    const outer = {
      kind: 'bullet',
      listKind: 'bullet',
      tight: true,
    } as const;
    const task = {
      checked: false,
      kind: 'task',
      listKind: 'bullet',
      tight: true,
    } as const;
    const editor = editorTest.createEditor(
      doc(
        list(
          outer,
          p('parent'),
          list(task, p('child<cursor>')),
          list(outer, p('sibling')),
        ),
      ),
    );

    run(lists.command.indentList, editor);
    run(command, editor);

    const parent = editor.view.state.doc.firstChild;
    expect(parent?.child(1).attrs.kind).toBe('bullet');
    expect(parent?.child(1).firstChild?.type.name).toBe('paragraph');
    expect(parent?.child(1).textContent).toBe('child');
    expect(parent?.child(2).textContent).toBe('sibling');
  });

  it('preserves loose ordered task attrs while moving an item', () => {
    const bullet = {
      kind: 'bullet',
      listKind: 'bullet',
      tight: true,
    } as const;
    const moving = {
      checked: true,
      kind: 'task',
      listKind: 'ordered',
      tight: false,
    } as const;
    const editor = editorTest.createEditor(
      doc(
        list(bullet, p('before')),
        list(moving, p('moving<cursor>')),
        list(bullet, p('after')),
      ),
    );

    run(lists.command.moveListDown, editor);

    expect(editor.view.state.doc.childCount).toBe(3);
    expect(editor.view.state.doc.child(0).textContent).toBe('before');
    expect(editor.view.state.doc.child(1).textContent).toBe('after');
    expect(editor.view.state.doc.child(2).textContent).toBe('moving');
    expect(editor.view.state.doc.child(2).attrs).toMatchObject(moving);
  });

  it('preserves loose ordered task attrs when adjacent items join', () => {
    const source = {
      checked: true,
      kind: 'task',
      listKind: 'ordered',
      tight: false,
    } as const;
    const editor = editorTest.createEditor(
      doc(list(source, p('one')), list(source, p('<cursor>two'))),
    );

    expect(editor.pressKey('Backspace')).toBe(true);
    expect(editor.pressKey('Backspace')).toBe(true);

    expectListShapes(editor.view.state.doc, [source]);
    expect(editor.view.state.doc.firstChild?.textContent).toBe('onetwo');
  });

  it('keeps the text selection stable while changing list kind', () => {
    const source = {
      kind: 'bullet',
      listKind: 'bullet',
      tight: false,
    } as const;
    const editor = editorTest.createEditor(doc(list(source, p('o<cursor>ne'))));
    const selectionBefore = editor.view.state.selection.toJSON();

    run(lists.command.toggleOrderedList, editor);

    expect(editor.view.state.selection.toJSON()).toEqual(selectionBefore);
    expectListShapes(editor.view.state.doc, [
      { kind: 'ordered', listKind: 'ordered', tight: false },
    ]);
  });

  it('clipboard HTML retains looseness and ordered task containers', () => {
    const editor = editorTest.createEditor(
      doc(
        list(
          {
            checked: true,
            kind: 'task',
            listKind: 'ordered',
            tight: false,
          },
          p('done'),
        ),
        list(
          {
            checked: false,
            kind: 'task',
            listKind: 'ordered',
            tight: false,
          },
          p('todo'),
        ),
      ),
    );
    const serializer = editor.view.someProp('clipboardSerializer');
    if (!serializer) throw new Error('Missing clipboard serializer');
    const fragment = serializer.serializeFragment(
      editor.view.state.doc.content,
      { document },
    );
    const host = document.createElement('div');
    host.append(fragment);

    expect(host.querySelector('ol')).not.toBeNull();
    expect(host.querySelector('ul')).toBeNull();
    const parsed = DOMParser.fromSchema(editor.view.state.schema).parse(host);
    expect(parsed.childCount).toBe(2);
    expect(parsed.child(0).attrs).toMatchObject({
      checked: true,
      kind: 'task',
      listKind: 'ordered',
      tight: false,
    });
    expect(parsed.child(1).attrs).toMatchObject({
      checked: false,
      kind: 'task',
      listKind: 'ordered',
      tight: false,
    });
  });
});
