// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';
import { setupBase } from '../base';
import { setupCodeBlock } from '../code-block';
import { setupList } from '../list';
import { setupParagraph } from '../paragraph';
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
});
