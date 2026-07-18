// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';
import { setupBase } from '../base';
import { setupCodeBlock } from '../code-block';
import { setupList } from '../list';
import { setupParagraph } from '../paragraph';
import { DOMParser } from '../pm';
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

describe('list Markdown metadata through editing commands', () => {
  it('newly created lists default to tight', () => {
    const editor = editorTest.createEditor(doc(p('one<cursor>')));
    const { view } = editor;

    expect(lists.command.toggleBulletList(view.state, view.dispatch)).toBe(
      true,
    );

    expect(view.state.doc.firstChild?.attrs).toMatchObject({
      kind: 'bullet',
      listKind: 'bullet',
      tight: true,
    });
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

  it.each([
    {
      command: lists.command.toggleOrderedList,
      expectedKind: 'ordered',
      expectedListKind: 'ordered',
      sourceKind: 'bullet',
      sourceListKind: 'bullet',
    },
    {
      command: lists.command.toggleBulletList,
      expectedKind: 'bullet',
      expectedListKind: 'bullet',
      sourceKind: 'ordered',
      sourceListKind: 'ordered',
    },
    {
      command: lists.command.toggleTaskList,
      expectedKind: 'task',
      expectedListKind: 'bullet',
      sourceKind: 'bullet',
      sourceListKind: 'bullet',
    },
  ])('changing $sourceKind to $expectedKind preserves a loose run', ({
    command,
    expectedKind,
    expectedListKind,
    sourceKind,
    sourceListKind,
  }) => {
    const attrs = {
      kind: sourceKind,
      listKind: sourceListKind,
      tight: false,
    };
    const editor = editorTest.createEditor(
      doc(list(attrs, p('one<start>')), list(attrs, p('two<end>'))),
    );

    expect(command(editor.view.state, editor.view.dispatch)).toBe(true);
    for (let i = 0; i < 2; i++) {
      expect(editor.view.state.doc.child(i).attrs).toMatchObject({
        kind: expectedKind,
        listKind: expectedListKind,
        tight: false,
      });
    }
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
