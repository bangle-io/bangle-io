// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';
import { setupBase } from '../base';
import { setupCodeBlock } from '../code-block';
import { resolve } from '../common';
import { setupParagraph } from '../paragraph';
import { EditorState, EditorView, Schema, TextSelection } from '../pm';

const resolved = resolve([setupBase(), setupParagraph(), setupCodeBlock()]);
const schema = new Schema({
  nodes: resolved.nodes,
  marks: resolved.marks,
});

const editors: EditorView[] = [];

afterEach(() => {
  for (const view of editors.splice(0)) {
    if (!view.isDestroyed) {
      view.destroy();
    }
  }
  document.body.replaceChildren();
});

function paragraph(text = '') {
  return schema.node('paragraph', null, text ? [schema.text(text)] : undefined);
}

function codeBlock(text = '', attrs?: { language?: string }) {
  return schema.node(
    'code_block',
    { language: attrs?.language ?? '' },
    text ? [schema.text(text)] : undefined,
  );
}

function createEditor({
  doc,
  selectionPos,
}: {
  doc: ReturnType<typeof schema.node>;
  selectionPos: number;
}) {
  const mount = document.createElement('div');
  document.body.append(mount);

  const state = EditorState.create({
    doc,
    schema,
    selection: TextSelection.create(doc, selectionPos),
    plugins: resolved.resolvePlugins({ schema }),
  });
  const view = new EditorView({ mount }, { state });
  editors.push(view);
  return view;
}

function pressKey(
  view: EditorView,
  key: string,
  modifiers: {
    altKey?: boolean;
    ctrlKey?: boolean;
    metaKey?: boolean;
    shiftKey?: boolean;
  } = {},
) {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...modifiers,
  });
  let handled = false;
  view.someProp('handleKeyDown', (handler) => {
    if (handler(view, event)) {
      handled = true;
      return true;
    }
    return undefined;
  });
  return handled;
}

function docJson(view: EditorView) {
  return view.state.doc.toJSON();
}

function selectionParentType(view: EditorView) {
  return view.state.selection.$from.parent.type.name;
}

function codeTextPos(text: string, offset = text.length) {
  return 1 + offset;
}

describe('code block keymap', () => {
  it('exits a code block after repeated Enter at the end', () => {
    const code = 'const done = true;\n\n';
    const doc = schema.node('doc', null, [codeBlock(code)]);
    const view = createEditor({ doc, selectionPos: codeTextPos(code) });

    expect(pressKey(view, 'Enter')).toBe(true);

    expect(docJson(view)).toEqual({
      type: 'doc',
      content: [
        {
          type: 'code_block',
          attrs: { language: '' },
          content: [{ type: 'text', text: 'const done = true;' }],
        },
        { type: 'paragraph' },
      ],
    });
    expect(selectionParentType(view)).toBe('paragraph');
  });

  it('lets normal Enter insert a newline inside code blocks', () => {
    const code = 'const done = true;';
    const doc = schema.node('doc', null, [codeBlock(code)]);
    const view = createEditor({ doc, selectionPos: codeTextPos(code) });

    expect(pressKey(view, 'Enter')).toBe(true);

    expect(docJson(view)).toEqual({
      type: 'doc',
      content: [
        {
          type: 'code_block',
          attrs: { language: '' },
          content: [{ type: 'text', text: 'const done = true;\n' }],
        },
      ],
    });
    expect(selectionParentType(view)).toBe('code_block');
  });

  it('exits an empty code block on Enter so it does not trap the cursor', () => {
    const doc = schema.node('doc', null, [codeBlock()]);
    const view = createEditor({ doc, selectionPos: 1 });

    expect(pressKey(view, 'Enter')).toBe(true);

    expect(docJson(view)).toEqual({
      type: 'doc',
      content: [
        { type: 'code_block', attrs: { language: '' } },
        { type: 'paragraph' },
      ],
    });
    expect(selectionParentType(view)).toBe('paragraph');
  });

  it('inserts paragraphs below and above with primary Enter shortcuts', () => {
    const code = 'const below = true;';
    const doc = schema.node('doc', null, [codeBlock(code)]);
    const view = createEditor({ doc, selectionPos: codeTextPos(code) });

    expect(pressKey(view, 'Enter', { ctrlKey: true })).toBe(true);
    expect(docJson(view)).toEqual({
      type: 'doc',
      content: [
        {
          type: 'code_block',
          attrs: { language: '' },
          content: [{ type: 'text', text: 'const below = true;' }],
        },
        { type: 'paragraph' },
      ],
    });
    expect(selectionParentType(view)).toBe('paragraph');

    view.dispatch(
      view.state.tr.setSelection(
        TextSelection.create(view.state.doc, codeTextPos(code)),
      ),
    );
    expect(pressKey(view, 'Enter', { ctrlKey: true, shiftKey: true })).toBe(
      true,
    );
    expect(docJson(view)).toEqual({
      type: 'doc',
      content: [
        { type: 'paragraph' },
        {
          type: 'code_block',
          attrs: { language: '' },
          content: [{ type: 'text', text: 'const below = true;' }],
        },
        { type: 'paragraph' },
      ],
    });
    expect(selectionParentType(view)).toBe('paragraph');
  });

  it('inserts boundary paragraphs with ArrowUp and ArrowDown at code block edges', () => {
    const doc = schema.node('doc', null, [codeBlock('line')]);
    const view = createEditor({ doc, selectionPos: 5 });

    expect(pressKey(view, 'ArrowDown')).toBe(true);
    expect(docJson(view)).toEqual({
      type: 'doc',
      content: [
        {
          type: 'code_block',
          attrs: { language: '' },
          content: [{ type: 'text', text: 'line' }],
        },
        { type: 'paragraph' },
      ],
    });
    expect(selectionParentType(view)).toBe('paragraph');

    view.dispatch(
      view.state.tr.setSelection(TextSelection.create(view.state.doc, 1)),
    );
    expect(pressKey(view, 'ArrowUp')).toBe(true);
    expect(docJson(view)).toEqual({
      type: 'doc',
      content: [
        { type: 'paragraph' },
        {
          type: 'code_block',
          attrs: { language: '' },
          content: [{ type: 'text', text: 'line' }],
        },
        { type: 'paragraph' },
      ],
    });
    expect(selectionParentType(view)).toBe('paragraph');
  });

  it('treats single-line code blocks as vertical ArrowUp and ArrowDown boundaries', () => {
    const doc = schema.node('doc', null, [codeBlock('line')]);
    const downView = createEditor({ doc, selectionPos: 3 });

    expect(pressKey(downView, 'ArrowDown')).toBe(true);
    expect(docJson(downView)).toEqual({
      type: 'doc',
      content: [
        {
          type: 'code_block',
          attrs: { language: '' },
          content: [{ type: 'text', text: 'line' }],
        },
        { type: 'paragraph' },
      ],
    });
    expect(selectionParentType(downView)).toBe('paragraph');

    const upView = createEditor({ doc, selectionPos: 3 });

    expect(pressKey(upView, 'ArrowUp')).toBe(true);
    expect(docJson(upView)).toEqual({
      type: 'doc',
      content: [
        { type: 'paragraph' },
        {
          type: 'code_block',
          attrs: { language: '' },
          content: [{ type: 'text', text: 'line' }],
        },
      ],
    });
    expect(selectionParentType(upView)).toBe('paragraph');
  });

  it('does not claim the sidebar shortcut as a code block toggle', () => {
    const doc = schema.node('doc', null, [paragraph('plain text')]);
    const view = createEditor({ doc, selectionPos: 5 });

    expect(pressKey(view, '\\', { ctrlKey: true })).toBe(false);
    expect(docJson(view)).toEqual({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'plain text' }],
        },
      ],
    });
  });
});
