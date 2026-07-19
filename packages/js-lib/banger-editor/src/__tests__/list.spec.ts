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

  it('splitting a loose ordered task keeps container kind and tightness', () => {
    const editor = editorTest.createEditor(
      doc(
        list(
          {
            checked: false,
            kind: 'task',
            listKind: 'ordered',
            tight: false,
          },
          p('one<cursor>'),
        ),
      ),
    );

    expect(editor.pressKey('Enter')).toBe(true);
    expect(editor.view.state.doc.childCount).toBe(2);
    for (let i = 0; i < 2; i++) {
      expect(editor.view.state.doc.child(i).attrs).toMatchObject({
        kind: 'task',
        listKind: 'ordered',
        tight: false,
      });
    }
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
    {
      command: lists.command.toggleOrderedList,
      expected: { kind: 'ordered', listKind: 'ordered', tight: false },
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
      expected: { kind: 'bullet', listKind: 'bullet', tight: false },
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

  it('converts only the selected item in a longer list run', () => {
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
    expectListShapes(editor.view.state.doc, [bullet, ordered, bullet]);
  });

  it('leaves surrounding paragraphs and list items outside the selection unchanged', () => {
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
    expect(editor.view.state.doc.child(1).attrs).toMatchObject(bullet);
    expect(editor.view.state.doc.child(2).attrs).toMatchObject(ordered);
    expect(editor.view.state.doc.child(3).attrs).toMatchObject(bullet);
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
      kind: 'bullet',
      listKind: 'bullet',
      tight: false,
    });
    expect(editor.view.state.doc.firstChild?.content.toJSON()).toEqual(
      contentBefore,
    );
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
