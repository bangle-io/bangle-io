// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { setupBase } from '../base';
import { setupBold } from '../bold';
import { setupCodeBlock } from '../code-block';
import { collection, isMac } from '../common';
import { setupHardBreak } from '../hard-break';
import { setupHistory } from '../history';
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
    setupHistory(),
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
    strong: { markType: 'bold' },
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
const strong = editorTest.nodeBuilder('strong');

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

function mathSource(view: EditorView, selector: string): HTMLElement {
  const source = view.dom.querySelector<HTMLElement>(
    `${selector} .math-src .ProseMirror`,
  );
  if (!source) throw new Error(`Expected nested math source for ${selector}`);
  return source;
}

function sourceTextPosition(
  source: HTMLElement,
  offset: number,
): { node: Text; offset: number } {
  const walker = document.createTreeWalker(source, NodeFilter.SHOW_TEXT);
  let remaining = offset;
  let current = walker.nextNode();
  while (current) {
    const text = current.textContent ?? '';
    if (remaining <= text.length) {
      return { node: current as Text, offset: remaining };
    }
    remaining -= text.length;
    current = walker.nextNode();
  }
  throw new Error(`Expected text offset ${offset} inside math source`);
}

function selectMathSource(source: HTMLElement, from: number, to = from): void {
  const start = sourceTextPosition(source, from);
  const end = sourceTextPosition(source, to);
  const range = document.createRange();
  range.setStart(start.node, start.offset);
  range.setEnd(end.node, end.offset);
  const selection = document.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

function mathPasteEvent(text: string, types = ['text/plain']): Event {
  const event = new Event('paste', { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'clipboardData', {
    value: {
      getData: () => text,
      types,
    },
  });
  return event;
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

  it('still creates a complete numeric inline expression', () => {
    const editor = editorTest.createEditor(doc(p('<cursor>')));
    typeText(editor.view, '$5$');

    editor.expectDoc(doc(p(mathInline('5'))));
  });

  it('does not suppress later input rules after currency-like text', () => {
    const editor = editorTest.createEditor(doc(p('<cursor>')));
    typeText(editor.view, String.raw`Spent $5 on **lunch** [[Home]] \$`);

    editor.expectDoc(
      doc(
        p(
          'Spent $5 on ',
          strong('lunch'),
          ' ',
          wikiLink(),
          ' ',
          mathEscapedDollar(),
        ),
      ),
    );
  });

  it('does not suppress later input rules after a pre-existing shell variable', () => {
    const editor = editorTest.createEditor(doc(p('Shell $PATH then <cursor>')));
    typeText(editor.view, '**bold** [[Home]]');

    editor.expectDoc(
      doc(p('Shell $PATH then ', strong('bold'), ' ', wikiLink())),
    );
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

  it.each([
    ['ArrowLeft', 0, 1],
    ['ArrowUp', 0, 1],
    ['ArrowRight', 3, 8],
    ['ArrowDown', 3, 8],
  ])('exits display math with %s only at the matching source boundary', (key, offset, expectedPosition) => {
    const editor = editorTest.createEditor(doc(p(), mathDisplay('abc'), p()));
    editor.view.dispatch(
      editor.view.state.tr.setSelection(
        NodeSelection.create(editor.view.state.doc, 2),
      ),
    );
    const source = mathSource(editor.view, 'math-display');
    selectMathSource(source, offset);
    const event = new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      cancelable: true,
    });

    source.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(editor.selectionParentType()).toBe('paragraph');
    expect(editor.view.state.selection.from).toBe(expectedPosition);
    editor.expectDoc(doc(p(), mathDisplay('abc'), p()));
  });

  it.each([
    ['ArrowRight', 1, {}],
    ['ArrowLeft', 0, { shiftKey: true }],
    ['ArrowDown', 3, { ctrlKey: true }],
    ['ArrowUp', 0, { altKey: true }],
    ['ArrowRight', 3, { isComposing: true }],
  ])('leaves display-math %s fallthroughs to the nested editor', (key, offset, modifiers) => {
    const editor = editorTest.createEditor(
      doc(p('before'), mathDisplay('abc'), p('after')),
    );
    editor.view.dispatch(
      editor.view.state.tr.setSelection(
        NodeSelection.create(editor.view.state.doc, 8),
      ),
    );
    const source = mathSource(editor.view, 'math-display');
    selectMathSource(source, offset);
    const event = new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      cancelable: true,
      ...modifiers,
    });

    source.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
    expect(editor.view.state.selection).toBeInstanceOf(NodeSelection);
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

  it('runs the Firefox focus bridge before returning focus to the outer editor', () => {
    const userAgent = vi
      .spyOn(window.navigator, 'userAgent', 'get')
      .mockReturnValue(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:128.0) Gecko/20100101 Firefox/128.0',
      );
    const editor = editorTest.createEditor(doc(p(), mathDisplay('x')));
    editor.view.dispatch(
      editor.view.state.tr.setSelection(
        NodeSelection.create(editor.view.state.doc, 2),
      ),
    );
    const source = mathSource(editor.view, 'math-display');
    const append = vi.spyOn(document.body, 'append');
    const focus = vi.spyOn(HTMLElement.prototype, 'focus');
    const event = new KeyboardEvent('keydown', {
      key: 'Enter',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });

    source.dispatchEvent(event);

    const focusBridge = append.mock.calls
      .flat()
      .find(
        (node): node is HTMLButtonElement => node instanceof HTMLButtonElement,
      );
    expect(event.defaultPrevented).toBe(true);
    expect(focusBridge).toBeInstanceOf(HTMLButtonElement);
    expect(focusBridge?.tabIndex).toBe(-1);
    expect(focusBridge?.getAttribute('aria-hidden')).toBe('true');
    expect(focusBridge?.isConnected).toBe(false);
    expect(focus.mock.contexts).toContain(focusBridge);
    expect(focus.mock.contexts.at(-1)).toBe(editor.view.dom);
    expect(editor.view.hasFocus()).toBe(true);
    append.mockRestore();
    focus.mockRestore();
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

  it('keeps select-all scoped to the nested math source', () => {
    const editor = editorTest.createEditor(doc(p(mathInline('abc'))));
    editor.view.dispatch(
      editor.view.state.tr.setSelection(
        NodeSelection.create(editor.view.state.doc, 1),
      ),
    );
    const sourceEditor = editor.view.dom.querySelector<HTMLElement>(
      'math-inline .math-src .ProseMirror',
    );
    expect(sourceEditor).not.toBeNull();
    sourceEditor?.focus();
    const event = new KeyboardEvent('keydown', {
      key: 'a',
      metaKey: isMac,
      ctrlKey: !isMac,
      bubbles: true,
      cancelable: true,
    });
    sourceEditor?.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(document.getSelection()?.toString()).toBe('abc');
    expect(editor.view.state.selection).toBeInstanceOf(NodeSelection);
  });

  it.each([
    ['math-inline', () => doc(p(mathInline('abc'))), 1],
    ['math-display', () => doc(p(), mathDisplay('abc'), p()), 2],
  ])('keeps primary select-all inside a %s source while modifiers and composition fall through', (selector, createDocument, nodePos) => {
    const editor = editorTest.createEditor(createDocument());
    editor.view.dispatch(
      editor.view.state.tr.setSelection(
        NodeSelection.create(editor.view.state.doc, nodePos),
      ),
    );
    const source = mathSource(editor.view, selector);
    source.focus();
    const selectAll = new KeyboardEvent('keydown', {
      key: 'a',
      metaKey: isMac,
      ctrlKey: !isMac,
      bubbles: true,
      cancelable: true,
    });

    source.dispatchEvent(selectAll);

    expect(selectAll.defaultPrevented).toBe(true);
    expect(document.getSelection()?.toString()).toBe('abc');

    for (const modifiers of [
      { altKey: true },
      { shiftKey: true },
      { isComposing: true },
    ]) {
      const event = new KeyboardEvent('keydown', {
        key: 'a',
        metaKey: isMac,
        ctrlKey: !isMac,
        bubbles: true,
        cancelable: true,
        ...modifiers,
      });
      source.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(false);
    }
    expect(editor.view.state.selection).toBeInstanceOf(NodeSelection);
  });

  it('undoes outer document history while the math source editor is focused', () => {
    const editor = editorTest.createEditor(doc(p(), mathDisplay('abc'), p()));
    const mathPos = 2;
    editor.view.dispatch(
      editor.view.state.tr.setSelection(
        NodeSelection.create(editor.view.state.doc, mathPos),
      ),
    );
    const sourceEditor = editor.view.dom.querySelector<HTMLElement>(
      'math-display .math-src .ProseMirror',
    );
    expect(sourceEditor).not.toBeNull();

    editor.view.dispatch(
      editor.view.state.tr.insertText('d', mathPos + 4, mathPos + 4),
    );
    editor.expectDoc(doc(p(), mathDisplay('abcd'), p()));

    const event = new KeyboardEvent('keydown', {
      key: 'z',
      metaKey: isMac,
      ctrlKey: !isMac,
      bubbles: true,
      cancelable: true,
    });
    sourceEditor?.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    editor.expectDoc(doc(p(), mathDisplay('abc'), p()));
  });

  it('redoes nested-source history and leaves unavailable or composition shortcuts alone', () => {
    const editor = editorTest.createEditor(doc(p(), mathDisplay('abc'), p()));
    const mathPos = 2;
    editor.view.dispatch(
      editor.view.state.tr.setSelection(
        NodeSelection.create(editor.view.state.doc, mathPos),
      ),
    );
    editor.view.dispatch(
      editor.view.state.tr.insertText('d', mathPos + 4, mathPos + 4),
    );
    const source = mathSource(editor.view, 'math-display');
    const undoEvent = new KeyboardEvent('keydown', {
      key: 'z',
      metaKey: isMac,
      ctrlKey: !isMac,
      bubbles: true,
      cancelable: true,
    });
    source.dispatchEvent(undoEvent);
    editor.expectDoc(doc(p(), mathDisplay('abc'), p()));

    const redoEvent = new KeyboardEvent('keydown', {
      key: 'z',
      metaKey: isMac,
      ctrlKey: !isMac,
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    mathSource(editor.view, 'math-display').dispatchEvent(redoEvent);
    expect(redoEvent.defaultPrevented).toBe(true);
    editor.expectDoc(doc(p(), mathDisplay('abcd'), p()));

    const noHistoryEditor = editorTest.createEditor(doc(p(mathInline('x'))));
    noHistoryEditor.view.dispatch(
      noHistoryEditor.view.state.tr.setSelection(
        NodeSelection.create(noHistoryEditor.view.state.doc, 1),
      ),
    );
    const noHistoryEvent = new KeyboardEvent('keydown', {
      key: 'z',
      metaKey: isMac,
      ctrlKey: !isMac,
      bubbles: true,
      cancelable: true,
    });
    mathSource(noHistoryEditor.view, 'math-inline').dispatchEvent(
      noHistoryEvent,
    );
    expect(noHistoryEvent.defaultPrevented).toBe(false);

    const compositionEvent = new KeyboardEvent('keydown', {
      key: 'z',
      metaKey: isMac,
      ctrlKey: !isMac,
      isComposing: true,
      bubbles: true,
      cancelable: true,
    });
    mathSource(editor.view, 'math-display').dispatchEvent(compositionEvent);
    expect(compositionEvent.defaultPrevented).toBe(false);
  });

  it('keeps multiline plain-text paste inside display math source', () => {
    const editor = editorTest.createEditor(doc(p(), mathDisplay('replace me')));
    editor.view.dispatch(
      editor.view.state.tr.setSelection(
        NodeSelection.create(editor.view.state.doc, 2),
      ),
    );
    const sourceEditor = editor.view.dom.querySelector<HTMLElement>(
      'math-display .math-src .ProseMirror',
    );
    expect(sourceEditor).not.toBeNull();
    const range = document.createRange();
    range.selectNodeContents(sourceEditor as HTMLElement);
    const selection = document.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    const event = new Event('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'clipboardData', {
      value: {
        getData: () => 'a\r\n$$\r\nb',
        types: ['text/plain'],
      },
    });
    sourceEditor?.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    editor.expectDoc(doc(p(), mathDisplay('a\n$$\nb')));
  });

  it('keeps partial and collapsed nested-source pastes isolated and ignores unsafe targets', () => {
    const editor = editorTest.createEditor(
      doc(p(), mathDisplay('abcde'), p('following prose')),
    );
    editor.view.dispatch(
      editor.view.state.tr.setSelection(
        NodeSelection.create(editor.view.state.doc, 2),
      ),
    );
    const firstSource = mathSource(editor.view, 'math-display');
    selectMathSource(firstSource, 1, 4);
    const partialPaste = mathPasteEvent('Z');
    firstSource.dispatchEvent(partialPaste);
    expect(partialPaste.defaultPrevented).toBe(true);
    editor.expectDoc(doc(p(), mathDisplay('aZe'), p('following prose')));

    const collapsedSource = mathSource(editor.view, 'math-display');
    selectMathSource(collapsedSource, 1);
    const collapsedPaste = mathPasteEvent('\r\nX');
    collapsedSource.dispatchEvent(collapsedPaste);
    expect(collapsedPaste.defaultPrevented).toBe(true);
    editor.expectDoc(doc(p(), mathDisplay('a\nXZe'), p('following prose')));

    const missingPlainSource = mathSource(editor.view, 'math-display');
    const stopUpstreamPaste = (event: Event) =>
      event.stopImmediatePropagation();
    missingPlainSource.addEventListener('paste', stopUpstreamPaste, true);
    const missingPlainText = mathPasteEvent('ignored', ['text/html']);
    missingPlainSource.dispatchEvent(missingPlainText);
    missingPlainSource.removeEventListener('paste', stopUpstreamPaste, true);
    expect(missingPlainText.defaultPrevented).toBe(false);
    editor.expectDoc(doc(p(), mathDisplay('a\nXZe'), p('following prose')));

    const outsideTarget = document.createElement('div');
    editor.view.dom.parentElement?.append(outsideTarget);
    const outsidePaste = mathPasteEvent('outside');
    outsideTarget.dispatchEvent(outsidePaste);
    outsideTarget.remove();
    editor.expectDoc(doc(p(), mathDisplay('a\nXZe'), p('following prose')));

    const independentEditor = editorTest.createEditor(
      doc(p(mathInline('safe'))),
    );
    independentEditor.view.dispatch(
      independentEditor.view.state.tr.setSelection(
        NodeSelection.create(independentEditor.view.state.doc, 1),
      ),
    );
    const independentSource = mathSource(independentEditor.view, 'math-inline');
    const independentText = independentSource.textContent;
    selectMathSource(mathSource(editor.view, 'math-display'), 0);
    const firstEditorPaste = mathPasteEvent('only first editor');
    mathSource(editor.view, 'math-display').dispatchEvent(firstEditorPaste);
    expect(firstEditorPaste.defaultPrevented).toBe(true);
    expect(independentSource.textContent).toBe(independentText);

    const staleSource = mathSource(editor.view, 'math-display');
    const mathNode = editor.view.state.doc.nodeAt(2);
    if (!mathNode) throw new Error('Expected display math node');
    editor.view.dispatch(editor.view.state.tr.delete(2, 2 + mathNode.nodeSize));
    const stalePaste = mathPasteEvent('stale');
    staleSource.dispatchEvent(stalePaste);
    expect(stalePaste.defaultPrevented).toBe(false);
    expect(editor.view.state.doc.textContent).toContain('following prose');
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
    const ordinarySlice = doc(p('plain', hardBreak(), 'text'), p('tail')).slice(
      0,
    );
    expect(serializeMathClipboardText(ordinarySlice)).toBe(
      ordinarySlice.content.textBetween(0, ordinarySlice.content.size, '\n\n'),
    );
  });

  it('preserves portable delimiters across open partial slices of inline and display math', () => {
    const document = doc(
      p('before ', mathInline('x'), ' after'),
      mathDisplay('display'),
      p('tail ', mathInline('z'), ' done'),
    );
    const partialSlice = document.slice(3, 39);

    expect(partialSlice.openStart).toBe(1);
    expect(partialSlice.openEnd).toBe(1);
    expect(serializeMathClipboardText(partialSlice)).toBe(
      'fore $x$ after\n\n$$\ndisplay\n$$\n\ntail $z$ do',
    );
  });

  it('keeps block boundaries when a mixed slice starts and ends inside prose', () => {
    const document = doc(
      p('left ', mathInline('x'), ' middle'),
      mathDisplay('display'),
      p('right ', mathInline('y'), ' end'),
    );
    const mixedSlice = document.slice(3, 40);

    expect(serializeMathClipboardText(mixedSlice)).toBe(
      'ft $x$ middle\n\n$$\ndisplay\n$$\n\nright $y$ end',
    );
  });
});
