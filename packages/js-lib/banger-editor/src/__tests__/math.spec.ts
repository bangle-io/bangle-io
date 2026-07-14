// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { setupBase } from '../base';
import { setupBold } from '../bold';
import { setupCodeBlock } from '../code-block';
import { collection } from '../common';
import { setupHardBreak } from '../hard-break';
import { setupImage } from '../image';
import { serializeMathClipboardText, setupMath } from '../math';
import { setupParagraph } from '../paragraph';
import { type EditorView, NodeSelection, Plugin, type PMNode } from '../pm';
import { createBangerEditorTestSetup } from '../test-helpers';
import { setupWikiLink } from '../wiki-link';

const math = setupMath({ reservedDollarTriggers: ['$date'] });
const reservedDollarTrigger = collection({
  id: 'reserved-dollar-trigger-test',
  plugin: {
    input: new Plugin({
      props: {
        handleTextInput(view, from, to, text) {
          const $from = view.state.doc.resolve(from);
          const sourceBefore = $from.parent.textBetween(0, $from.parentOffset);
          if (text !== 'e' || !sourceBefore.endsWith('$dat')) return false;
          view.dispatch(view.state.tr.insertText('e!', from, to));
          return true;
        },
      },
    }),
  },
});
const editorTest = createBangerEditorTestSetup({
  extensions: [
    setupBase(),
    setupParagraph(),
    setupBold(),
    setupCodeBlock(),
    setupHardBreak(),
    setupImage(),
    setupWikiLink(),
    math,
    reservedDollarTrigger,
  ],
  builderAliases: {
    codeBlock: { nodeType: 'code_block', language: '' },
    doc: { nodeType: 'doc' },
    hardBreak: { nodeType: 'hard_break' },
    image: {
      nodeType: 'image',
      alt: null,
      src: 'image.png',
      title: null,
    },
    p: { nodeType: 'paragraph' },
    mathInline: { nodeType: 'math_inline' },
    mathDisplay: { nodeType: 'math_display' },
    mathEscapedDollar: { nodeType: 'math_escaped_dollar' },
    wikiLink: { nodeType: 'wiki_link', label: null, target: 'Home' },
  },
});
const { doc, p } = editorTest.builders;
const mathInline = editorTest.nodeBuilder('mathInline');
const mathDisplay = editorTest.nodeBuilder('mathDisplay');
const mathEscapedDollar = editorTest.nodeBuilder('mathEscapedDollar');
const hardBreak = editorTest.nodeBuilder('hardBreak');
const image = editorTest.nodeBuilder('image');
const wikiLink = editorTest.nodeBuilder('wikiLink');

afterEach(() => {
  editorTest.cleanup();
  vi.restoreAllMocks();
});

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

describe('math commands and input rules', () => {
  it('inserts typed inline math with conservative delimiters', () => {
    const editor = editorTest.createEditor(doc(p('<cursor>')));
    typeText(editor.view, 'before $x + 1$ after');

    editor.expectDoc(doc(p('before ', mathInline('x + 1'), ' after')));
  });

  it.each([
    ['formatting-like TeX', '$a **b**$', 'a **b**'],
    ['an escaped dollar', String.raw`$x \$ y$`, String.raw`x \$ y`],
    ['wiki-link-like TeX', '$[[Home]]$', '[[Home]]'],
  ])('keeps %s raw until the closing delimiter', (_label, source, expected) => {
    const editor = editorTest.createEditor(doc(p('<cursor>')));
    typeText(editor.view, source);

    editor.expectDoc(doc(p(mathInline(expected))));
  });

  it('creates adjacent inline expressions without requiring whitespace', () => {
    const editor = editorTest.createEditor(doc(p('<cursor>')));
    typeText(editor.view, '$x$+$y$');

    editor.expectDoc(doc(p(mathInline('x'), '+', mathInline('y'))));
  });

  it.each([
    '$x$5',
    '$x$$y$',
  ])('restores ambiguous typed delimiters as raw text: %s', (source) => {
    const editor = editorTest.createEditor(doc(p('<cursor>')));
    typeText(editor.view, source);

    editor.expectDoc(doc(p(source)));
  });

  it('leaves currency and whitespace-delimited dollars as text', () => {
    const editor = editorTest.createEditor(doc(p('<cursor>')));
    typeText(editor.view, '$5 and $6; $ x $');

    editor.expectDoc(doc(p('$5 and $6; $ x $')));
  });

  it('hands a reserved dollar trigger to the owning editor extension', () => {
    const editor = editorTest.createEditor(doc(p('<cursor>')));
    typeText(editor.view, '$date');

    expect(editor.view.state.doc.textContent).toBe('$date!');
  });

  it('keeps a typed escaped dollar as ordinary visible text', () => {
    const editor = editorTest.createEditor(doc(p('<cursor>')));
    typeText(editor.view, String.raw`\$x$`);

    editor.expectDoc(doc(p(mathEscapedDollar(), 'x$')));
    expect(editor.view.dom.textContent).toContain('$x$');
  });

  const precedingAtomCases: Array<[string, () => PMNode]> = [
    ['image', () => image()],
    ['wiki link', () => wikiLink()],
    ['escaped dollar', () => mathEscapedDollar()],
    ['hard break', () => hardBreak()],
  ];

  it.each(
    precedingAtomCases,
  )('preserves a preceding %s when typing inline math', (_label, atom) => {
    const preceding = atom();
    const editor = editorTest.createEditor(doc(p(preceding, '<cursor>')));
    typeText(editor.view, '$x$');

    editor.expectDoc(doc(p(preceding, mathInline('x'))));
  });

  it('does not create inline math across an inline atom', () => {
    const editor = editorTest.createEditor(doc(p('$', image(), 'x<cursor>')));
    typeText(editor.view, '$');

    editor.expectDoc(doc(p('$', image(), 'x$')));
  });

  it('converts a strict leading double-dollar rule into display math', () => {
    const editor = editorTest.createEditor(doc(p('<cursor>')));
    typeText(editor.view, '$$ ');

    editor.expectDoc(doc(mathDisplay()));
    expect(editor.view.state.selection).toBeInstanceOf(NodeSelection);
  });

  it('inserts inline math and replaces an empty paragraph with display math', () => {
    const inlineEditor = editorTest.createEditor(doc(p('a<cursor>')));
    expect(
      math.command.insertInlineMath({ initialText: 'x' })(
        inlineEditor.view.state,
        inlineEditor.view.dispatch,
        inlineEditor.view,
      ),
    ).toBe(true);
    inlineEditor.expectDoc(doc(p('a', mathInline('x'))));

    const displayEditor = editorTest.createEditor(doc(p('<cursor>')));
    expect(
      math.command.insertDisplayMath({ initialText: 'y' })(
        displayEditor.view.state,
        displayEditor.view.dispatch,
        displayEditor.view,
      ),
    ).toBe(true);
    displayEditor.expectDoc(doc(mathDisplay('y')));
    expect(displayEditor.view.state.selection).toBeInstanceOf(NodeSelection);
  });
});

describe('math interaction', () => {
  it('Backspace enters inline and display nodes from adjacent content', () => {
    const inlineEditor = editorTest.createEditor(
      doc(p(mathInline('x'), '<cursor>')),
    );
    expect(inlineEditor.pressKey('Backspace')).toBe(true);
    expect(inlineEditor.view.state.selection).toBeInstanceOf(NodeSelection);
    expect(
      (inlineEditor.view.state.selection as NodeSelection).node.type.name,
    ).toBe('math_inline');

    const displayEditor = editorTest.createEditor(
      doc(mathDisplay('y'), p('<cursor>')),
    );
    expect(displayEditor.pressKey('Backspace')).toBe(true);
    expect(displayEditor.view.state.selection).toBeInstanceOf(NodeSelection);
    expect(
      (displayEditor.view.state.selection as NodeSelection).node.type.name,
    ).toBe('math_display');
  });

  it('deletes an empty selected node from the nested source editor', () => {
    const editor = editorTest.createEditor(doc(p(mathInline())));
    editor.view.dispatch(
      editor.view.state.tr.setSelection(
        NodeSelection.create(editor.view.state.doc, 1),
      ),
    );
    const sourceEditor = editor.view.dom.querySelector<HTMLElement>(
      'math-inline .math-src .ProseMirror',
    );
    expect(sourceEditor).not.toBeNull();
    sourceEditor?.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Backspace',
        bubbles: true,
        cancelable: true,
      }),
    );

    editor.expectDoc(doc(p()));
  });

  it('exits display editing into adjacent text without an invalid selection warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const editor = editorTest.createEditor(doc(p(), mathDisplay('x')));
    editor.view.dispatch(
      editor.view.state.tr.setSelection(
        NodeSelection.create(editor.view.state.doc, 2),
      ),
    );
    const sourceEditor = editor.view.dom.querySelector<HTMLElement>(
      'math-display .math-src .ProseMirror',
    );
    expect(sourceEditor).not.toBeNull();
    const event = new KeyboardEvent('keydown', {
      key: 'Enter',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    sourceEditor?.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(editor.selectionParentType()).toBe('paragraph');
    editor.expectDoc(doc(p(), mathDisplay('x'), p()));
    expect(warn).not.toHaveBeenCalledWith(
      expect.stringContaining(
        'TextSelection endpoint not pointing into a node with inline content',
      ),
    );
    warn.mockRestore();
  });

  it('does not run the Firefox focus bridge for Chromium user agents', () => {
    const userAgent = vi
      .spyOn(window.navigator, 'userAgent', 'get')
      .mockReturnValue(
        'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
      );
    const editor = editorTest.createEditor(doc(p(), mathDisplay('x')));
    editor.view.dispatch(
      editor.view.state.tr.setSelection(
        NodeSelection.create(editor.view.state.doc, 2),
      ),
    );
    const sourceEditor = editor.view.dom.querySelector<HTMLElement>(
      'math-display .math-src .ProseMirror',
    );
    expect(sourceEditor).not.toBeNull();
    const append = vi.spyOn(document.body, 'append');
    sourceEditor?.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Enter',
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      }),
    );

    expect(append).not.toHaveBeenCalled();
    append.mockRestore();
    userAgent.mockRestore();
  });

  it('Ctrl-Backspace deletes a source word instead of the whole math node', () => {
    const editor = editorTest.createEditor(
      doc(p('before ', mathInline('alpha beta'))),
    );
    editor.view.dispatch(
      editor.view.state.tr.setSelection(
        NodeSelection.create(editor.view.state.doc, 8),
      ),
    );
    const sourceEditor = editor.view.dom.querySelector<HTMLElement>(
      'math-inline .math-src .ProseMirror',
    );
    expect(sourceEditor).not.toBeNull();
    const range = document.createRange();
    range.selectNodeContents(sourceEditor as HTMLElement);
    range.collapse(false);
    const selection = document.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    const event = new KeyboardEvent('keydown', {
      key: 'Backspace',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    sourceEditor?.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    editor.expectDoc(doc(p('before ', mathInline('alpha '))));
  });

  it('keeps invalid TeX source rendered as a visible error', () => {
    const source = String.raw`\notacommand{`;
    const editor = editorTest.createEditor(doc(p(mathInline(source))));
    const error = editor.view.dom.querySelector('math-inline .katex-error');

    expect(error).not.toBeNull();
    expect(error?.textContent).toContain(source);
    expect(editor.view.state.doc.firstChild?.firstChild?.textContent).toBe(
      source,
    );
  });

  it('keeps KaTeX macro state isolated across simultaneous editors', () => {
    const definingEditor = editorTest.createEditor(
      doc(p(mathInline(String.raw`\gdef\banglemacro{A}\banglemacro`))),
    );
    const independentEditor = editorTest.createEditor(
      doc(p(mathInline(String.raw`\banglemacro`))),
    );

    expect(
      definingEditor.view.dom.querySelector('math-inline .math-render')
        ?.textContent,
    ).toContain('A');
    expect(
      independentEditor.view.dom.querySelector('math-inline .math-render')
        ?.textContent,
    ).not.toContain('A');
    expect(independentEditor.view.state.doc.textContent).toBe(
      String.raw`\banglemacro`,
    );
  });
});

describe('math clipboard text', () => {
  it('adds portable delimiters without changing ordinary text', () => {
    const document = doc(
      p('before ', mathInline('x'), ' after'),
      mathDisplay('y'),
      p('tail'),
    );
    const slice = document.slice(0, document.content.size);

    expect(serializeMathClipboardText(slice)).toBe(
      'before $x$ after\n\n$$\ny\n$$\n\ntail',
    );
    expect(serializeMathClipboardText(doc(p('plain text')).slice(0, 12))).toBe(
      'plain text',
    );
  });
});
