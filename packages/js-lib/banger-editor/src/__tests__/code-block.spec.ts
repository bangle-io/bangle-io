// @vitest-environment jsdom

import type { NodeBuilder } from 'prosemirror-test-builder';
import { afterEach, describe, expect, it } from 'vitest';
import { setupBase } from '../base';
import { setupCodeBlock } from '../code-block';
import { resolve } from '../common';
import { setupParagraph } from '../paragraph';
import {
  builders,
  EditorState,
  EditorView,
  type PMNode,
  Schema,
  TextSelection,
} from '../pm';

const resolved = resolve([setupBase(), setupParagraph(), setupCodeBlock()]);
const schema = new Schema({
  nodes: resolved.nodes,
  marks: resolved.marks,
});

const testBuilders = builders(schema, {
  doc: { nodeType: 'doc' },
  p: { nodeType: 'paragraph' },
  code_block: { nodeType: 'code_block', language: '' },
});
const doc = requiredNodeBuilder('doc');
const p = requiredNodeBuilder('p');
const codeBlock = requiredNodeBuilder('code_block');

function requiredNodeBuilder(name: string): NodeBuilder {
  const builder = testBuilders[name];
  if (!builder) {
    throw new Error(`Missing ProseMirror test builder: ${name}`);
  }
  return builder as NodeBuilder;
}

const editors: EditorView[] = [];

afterEach(() => {
  for (const view of editors.splice(0)) {
    if (!view.isDestroyed) {
      view.destroy();
    }
  }
  document.body.replaceChildren();
});

function createEditor({
  initialDoc,
}: {
  initialDoc: PMNode & { tag?: Record<string, number> };
}) {
  const mount = document.createElement('div');
  document.body.append(mount);
  const selectionPos = initialDoc.tag?.cursor ?? 1;

  const state = EditorState.create({
    doc: initialDoc,
    schema,
    selection: TextSelection.create(initialDoc, selectionPos),
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
  view.dispatchEvent(event);
  return event.defaultPrevented;
}

function canHandleKey(
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

function expectDoc(view: EditorView, expectedDoc: PMNode) {
  expect(view.state.doc.toJSON()).toEqual(expectedDoc.toJSON());
}

function selectionParentType(view: EditorView) {
  return view.state.selection.$from.parent.type.name;
}

function selectionParentText(view: EditorView) {
  return view.state.selection.$from.parent.textContent;
}

function setSelection(view: EditorView, pos: number) {
  view.dispatch(
    view.state.tr.setSelection(TextSelection.create(view.state.doc, pos)),
  );
}

function setSelectionAtFirstBlockEnd(view: EditorView) {
  const firstBlock = view.state.doc.firstChild;
  if (!firstBlock) {
    throw new Error('Expected a first block in the test document');
  }

  setSelection(view, 1 + firstBlock.content.size);
}

describe('code block keymap', () => {
  it('exits a code block after repeated Enter at the end', () => {
    const view = createEditor({
      initialDoc: doc(codeBlock('const done = true;\n\n<cursor>')),
    });

    expect(pressKey(view, 'Enter')).toBe(true);

    expectDoc(view, doc(codeBlock('const done = true;'), p()));
    expect(selectionParentType(view)).toBe('paragraph');
  });

  it('lets normal Enter insert a newline inside code blocks', () => {
    const view = createEditor({
      initialDoc: doc(codeBlock('const done = true;<cursor>')),
    });

    expect(pressKey(view, 'Enter')).toBe(true);

    expectDoc(view, doc(codeBlock('const done = true;\n')));
    expect(selectionParentType(view)).toBe('code_block');
  });

  it('exits an empty code block on Enter so it does not trap the cursor', () => {
    const view = createEditor({ initialDoc: doc(codeBlock('<cursor>')) });

    expect(pressKey(view, 'Enter')).toBe(true);

    expectDoc(view, doc(codeBlock(), p()));
    expect(selectionParentType(view)).toBe('paragraph');
  });

  it('inserts paragraphs below and above with primary Enter shortcuts', () => {
    const view = createEditor({
      initialDoc: doc(codeBlock('const below = true;<cursor>')),
    });

    expect(pressKey(view, 'Enter', { ctrlKey: true })).toBe(true);
    expectDoc(view, doc(codeBlock('const below = true;'), p()));
    expect(selectionParentType(view)).toBe('paragraph');

    setSelectionAtFirstBlockEnd(view);
    expect(pressKey(view, 'Enter', { ctrlKey: true, shiftKey: true })).toBe(
      true,
    );
    expectDoc(view, doc(p(), codeBlock('const below = true;'), p()));
    expect(selectionParentType(view)).toBe('paragraph');
  });

  it('inserts boundary paragraphs with ArrowUp and ArrowDown at code block edges', () => {
    const view = createEditor({ initialDoc: doc(codeBlock('line<cursor>')) });

    expect(pressKey(view, 'ArrowDown')).toBe(true);
    expectDoc(view, doc(codeBlock('line'), p()));
    expect(selectionParentType(view)).toBe('paragraph');

    setSelection(view, 1);
    expect(pressKey(view, 'ArrowUp')).toBe(true);
    expectDoc(view, doc(p(), codeBlock('line'), p()));
    expect(selectionParentType(view)).toBe('paragraph');
  });

  it('moves into existing adjacent paragraphs with ArrowUp and ArrowDown', () => {
    const upView = createEditor({
      initialDoc: doc(p('before'), codeBlock('<cursor>line')),
    });

    expect(pressKey(upView, 'ArrowUp')).toBe(true);
    expectDoc(upView, doc(p('before'), codeBlock('line')));
    expect(selectionParentType(upView)).toBe('paragraph');
    expect(selectionParentText(upView)).toBe('before');
    expect(upView.state.selection.$from.parentOffset).toBe('before'.length);

    const downView = createEditor({
      initialDoc: doc(codeBlock('line<cursor>'), p('after')),
    });

    expect(pressKey(downView, 'ArrowDown')).toBe(true);
    expectDoc(downView, doc(codeBlock('line'), p('after')));
    expect(selectionParentType(downView)).toBe('paragraph');
    expect(selectionParentText(downView)).toBe('after');
    expect(downView.state.selection.$from.parentOffset).toBe(0);
  });

  it('treats single-line code blocks as vertical ArrowUp and ArrowDown boundaries', () => {
    const initialDoc = doc(codeBlock('li<cursor>ne'));
    const downView = createEditor({ initialDoc });

    expect(pressKey(downView, 'ArrowDown')).toBe(true);
    expectDoc(downView, doc(codeBlock('line'), p()));
    expect(selectionParentType(downView)).toBe('paragraph');

    const upView = createEditor({ initialDoc });

    expect(pressKey(upView, 'ArrowUp')).toBe(true);
    expectDoc(upView, doc(p(), codeBlock('line')));
    expect(selectionParentType(upView)).toBe('paragraph');
  });

  it('does not claim the sidebar shortcut as a code block toggle', () => {
    const view = createEditor({ initialDoc: doc(p('plai<cursor>n text')) });

    expect(canHandleKey(view, '\\', { ctrlKey: true })).toBe(false);
    expectDoc(view, doc(p('plain text')));
  });
});
