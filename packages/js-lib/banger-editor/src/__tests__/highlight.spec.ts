import { highlightTokenizer } from '@bangle.io/markdown-syntax';
// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';
import { setupBase } from '../base';
import { setupBold } from '../bold';
import { setupCode } from '../code';
import { setupCodeBlock } from '../code-block';
import { setupHighlight } from '../highlight';
import { setupItalic } from '../italic';
import { setupParagraph } from '../paragraph';
import {
  type EditorView,
  Fragment,
  type Mark,
  Slice,
  TextSelection,
} from '../pm';
import { setupStrike } from '../strike';
import { createBangerEditorTestSetup } from '../test-helpers/prosemirror-editor';

const highlight = setupHighlight();
const extensions = [
  setupBase(),
  setupParagraph(),
  setupCodeBlock(),
  highlight,
  setupBold(),
  setupStrike(),
  setupCode(),
  setupItalic(),
];
const editorTest = createBangerEditorTestSetup({
  extensions,
  builderAliases: {
    doc: { nodeType: 'doc' },
    codeBlock: { nodeType: 'code_block', language: '' },
    code: { markType: 'code' },
    bold: { markType: 'bold' },
    highlight: { markType: 'highlight' },
    italic: { markType: 'italic' },
    p: { nodeType: 'paragraph' },
    strike: { markType: 'strike' },
  },
});
const { doc, p } = editorTest.builders;
const highlightMark = editorTest.nodeBuilder('highlight');
const boldMark = editorTest.nodeBuilder('bold');
const codeMark = editorTest.nodeBuilder('code');
const italicMark = editorTest.nodeBuilder('italic');
const strikeMark = editorTest.nodeBuilder('strike');

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

function transformPastedText(
  view: EditorView,
  text: string,
  marks: readonly Mark[] = [],
) {
  const paragraph = view.state.schema.nodes.paragraph;
  if (!paragraph) {
    throw new Error('paragraph node is missing');
  }
  let slice = new Slice(
    Fragment.from(paragraph.create(null, view.state.schema.text(text, marks))),
    0,
    0,
  );
  view.someProp('transformPasted', (transform) => {
    slice = transform(slice, view, false);
  });
  return slice.content.firstChild;
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

  it('strips pasted delimiters without dropping surrounding text or spaces', () => {
    const editor = editorTest.createEditor(doc(p('<cursor>')));
    const transformed = transformPastedText(
      editor.view,
      'before ==one== and ==two== after',
    );
    expect(transformed).toEqual(
      p(
        'before ',
        highlightMark('one'),
        ' and ',
        highlightMark('two'),
        ' after',
      ),
    );
  });

  it('leaves highlight-looking text literal inside code and existing highlights', () => {
    const editor = editorTest.createEditor(doc(p('<cursor>')));
    const code = editor.view.state.schema.marks.code;
    const highlightType = editor.view.state.schema.marks.highlight;
    if (!code || !highlightType) {
      throw new Error('code and highlight marks must be in the schema');
    }
    expect(
      transformPastedText(editor.view, '==code==', [code.create()]),
    ).toEqual(p(codeMark('==code==')));
    expect(
      transformPastedText(editor.view, '==marked==', [highlightType.create()]),
    ).toEqual(p(highlightMark('==marked==')));
  });

  it('does not run the typing rule inside inline code', () => {
    const editor = editorTest.createEditor(doc(p(codeMark('code<cursor>'))));
    typeText(editor.view, '==literal==');
    editor.expectDoc(doc(p(codeMark('code==literal=='))));
  });
});

describe('shared Markdown mark paste behavior', () => {
  it.each([
    ['bold', 'before **bold** after', boldMark('bold')],
    ['strike', 'before ~~strike~~ after', strikeMark('strike')],
    ['italic', 'before _italic_ after', italicMark('italic')],
    ['code', 'before `code` after', codeMark('code')],
  ])('preserves prose around pasted %s syntax', (_label, source, marked) => {
    const editor = editorTest.createEditor(doc(p('<cursor>')));
    expect(transformPastedText(editor.view, source)).toEqual(
      p('before ', marked, ' after'),
    );
  });
});

// Compile-time guard that this collection remains the owner of its tokenizer.
expect(highlight.markdown?.tokenizerPlugins).toContain(highlightTokenizer);
