import { highlightTokenizer } from '@bangle.io/markdown-syntax';
// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';
import { setupBase } from '../base';
import { setupCodeBlock } from '../code-block';
import { setupHighlight } from '../highlight';
import { setupParagraph } from '../paragraph';
import { type EditorView, TextSelection } from '../pm';
import { createBangerEditorTestSetup } from '../test-helpers/prosemirror-editor';

const highlight = setupHighlight();
const extensions = [setupBase(), setupParagraph(), setupCodeBlock(), highlight];
const editorTest = createBangerEditorTestSetup({
  extensions,
  builderAliases: {
    doc: { nodeType: 'doc' },
    codeBlock: { nodeType: 'code_block', language: '' },
    highlight: { markType: 'highlight' },
    p: { nodeType: 'paragraph' },
  },
});
const { doc, p } = editorTest.builders;
const highlightMark = editorTest.nodeBuilder('highlight');

afterEach(() => editorTest.cleanup());

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

describe('highlight authoring', () => {
  it('converts a completed typed delimiter pair and toggles selections', () => {
    const editor = editorTest.createEditor(doc(p('<cursor>')));
    typeText(editor.view, '==important==');
    editor.expectDoc(doc(p(highlightMark('important'))));

    editor.view.dispatch(
      editor.view.state.tr.setSelection(
        TextSelection.create(editor.view.state.doc, 1, 10),
      ),
    );
    expect(
      highlight.command.toggleHighlight(
        editor.view.state,
        editor.view.dispatch,
      ),
    ).toBe(true);
    editor.expectDoc(doc(p('important')));
  });
});

// Compile-time guard that this collection remains the owner of its tokenizer.
expect(highlight.markdown?.tokenizerPlugins).toContain(highlightTokenizer);
