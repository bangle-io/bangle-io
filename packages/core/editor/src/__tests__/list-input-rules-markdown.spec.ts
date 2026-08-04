// @vitest-environment jsdom

import {
  EditorState,
  EditorView,
  type PMNode,
  setupList,
  TextSelection,
} from '@bangle.io/prosemirror-plugins';
import { afterEach, describe, expect, it } from 'vitest';
import { createProductionMarkdown } from './production-markdown-test-helpers';

const editors: Array<{ editor: EditorView; mount: HTMLElement }> = [];

afterEach(() => {
  for (const { editor, mount } of editors.splice(0)) {
    editor.destroy();
    mount.remove();
  }
});

function findTextPosition(doc: PMNode, text: string, offset: number): number {
  let position = -1;
  doc.descendants((node, nodePosition) => {
    if (position !== -1 || !node.isText || !node.text?.includes(text)) return;
    position = nodePosition + node.text.indexOf(text) + offset;
  });
  if (position === -1) throw new Error(`No text "${text}" in document`);
  return position;
}

function createEditor(
  source: string,
  selectionFor: (doc: PMNode) => TextSelection,
): EditorView {
  const markdown = createProductionMarkdown();
  const doc = markdown.parser.parse(source);
  const mount = document.createElement('div');
  document.body.append(mount);
  const editor = new EditorView(
    { mount },
    {
      state: EditorState.create({
        doc,
        plugins: markdown.resolved.resolvePlugins({ schema: markdown.schema }),
        schema: markdown.schema,
        selection: selectionFor(doc),
      }),
    },
  );
  editors.push({ editor, mount });
  return editor;
}

function typeText(editor: EditorView, text: string) {
  for (const character of text) {
    const insertCharacter = () => editor.state.tr.insertText(character);
    const handled = editor.someProp('handleTextInput', (handler) =>
      handler(
        editor,
        editor.state.selection.from,
        editor.state.selection.to,
        character,
        insertCharacter,
      ),
    );
    if (!handled) editor.dispatch(insertCharacter());
  }
}

function pressEnter(editor: EditorView): boolean {
  const event = new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    key: 'Enter',
  });
  return Boolean(
    editor.someProp('handleKeyDown', (handler) => handler(editor, event)),
  );
}

function serialize(editor: EditorView): string {
  const markdown = createProductionMarkdown();
  return markdown.serializer.serialize(editor.state.doc);
}

function expectFixedPoint(markdownSource: string) {
  const markdown = createProductionMarkdown();
  expect(
    markdown.serializer.serialize(markdown.parser.parse(markdownSource)),
  ).toBe(markdownSource);
}

describe('list edits through the full production extension set', () => {
  it('keeps a loose ordered task split as an exact Markdown fixed point', () => {
    const source = '1. [x] ordered task\n\n1. [ ] sibling task';
    const editor = createEditor(source, (doc) =>
      TextSelection.create(doc, findTextPosition(doc, 'ordered task', 0)),
    );

    expect(pressEnter(editor)).toBe(true);
    const output = serialize(editor);
    expect(output).toBe(
      '1. [ ] \n\n1. [x] ordered task\n\n1. [ ] sibling task',
    );
    expectFixedPoint(output);
  });

  it('serializes a typed bullet marker through the production input rule', () => {
    const editor = createEditor('', (doc) => TextSelection.create(doc, 1));

    typeText(editor, '- converted');
    const output = serialize(editor);
    expect(output).toBe('- converted');
    expectFixedPoint(output);
  });

  it('keeps a typed ordered list ordered when converting it to a task', () => {
    const editor = createEditor('', (doc) => TextSelection.create(doc, 1));
    const list = setupList();

    typeText(editor, '1. typed ordered');
    expect(list.command.toggleTaskList(editor.state, editor.dispatch)).toBe(
      true,
    );

    const output = serialize(editor);
    expect(output).toBe('1. [ ] typed ordered');
    expectFixedPoint(output);
  });

  it('keeps a task thematic-break input rule through production serialization', () => {
    const source = '- [ ] replace me\n- [ ] second';
    const editor = createEditor(source, (doc) =>
      TextSelection.create(
        doc,
        findTextPosition(doc, 'replace me', 0),
        findTextPosition(doc, 'replace me', 'replace me'.length),
      ),
    );

    typeText(editor, '---');
    const output = serialize(editor);
    expect(output).toBe('- [ ] \n\n  ---\n\n- [ ] second');
    expectFixedPoint(output);
  });
});
