// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';
import { setupBase } from '../base';
import { setupCodeBlock } from '../code-block';
import {
  getHeadingFoldRange,
  setupCollapsibleHeading,
} from '../collapsible-heading';
import { setupHeading } from '../heading';
import { setupParagraph } from '../paragraph';
import type { PMNode } from '../pm';
import { TextSelection } from '../pm';
import { createBangerEditorTestSetup } from '../test-helpers';

const collapsible = setupCollapsibleHeading();

const editorTest = createBangerEditorTestSetup({
  extensions: [
    setupBase(),
    setupParagraph(),
    setupCodeBlock(),
    setupHeading(),
    collapsible,
  ],
  builderAliases: {
    codeBlock: { nodeType: 'code_block', language: '' },
    doc: { nodeType: 'doc' },
    p: { nodeType: 'paragraph' },
    h1: { nodeType: 'heading', level: 1 },
    h2: { nodeType: 'heading', level: 2 },
    h3: { nodeType: 'heading', level: 3 },
  },
});

const { doc, p } = editorTest.builders;
const h1 = editorTest.nodeBuilder('h1');
const h2 = editorTest.nodeBuilder('h2');
const h3 = editorTest.nodeBuilder('h3');

afterEach(() => {
  editorTest.cleanup();
});

/** Position right before the first heading whose text matches. */
function headingPos(docNode: PMNode, text: string): number {
  let found = -1;
  docNode.descendants((node, pos) => {
    if (
      found === -1 &&
      node.type.name === 'heading' &&
      node.textContent === text
    ) {
      found = pos;
    }
    return found === -1;
  });
  if (found === -1) {
    throw new Error(`Heading with text "${text}" not found`);
  }
  return found;
}

function hiddenTexts(view: { dom: HTMLElement }): string[] {
  return [...view.dom.querySelectorAll('.B-collapsible-heading-hidden')].map(
    (el) => el.textContent ?? '',
  );
}

function toggleButtons(view: { dom: HTMLElement }): HTMLButtonElement[] {
  return [
    ...view.dom.querySelectorAll<HTMLButtonElement>(
      'button.B-collapsible-heading-toggle',
    ),
  ];
}

describe('getHeadingFoldRange', () => {
  it('spans everything up to the next heading of the same level', () => {
    const d = doc(h1('One'), p('a'), p('b'), h1('Two'), p('c'));
    const pos = headingPos(d, 'One');
    const range = getHeadingFoldRange(d, pos);
    expect(range).not.toBeNull();
    // Hidden region is exactly the two paragraphs between the headings.
    expect(d.slice(range!.from, range!.to).content.childCount).toBe(2);
    expect(d.slice(range!.from, range!.to).content.child(0).textContent).toBe(
      'a',
    );
    expect(d.slice(range!.from, range!.to).content.child(1).textContent).toBe(
      'b',
    );
  });

  it('includes deeper headings but stops at a higher-level heading', () => {
    const d = doc(h1('One'), p('a'), h2('Sub'), p('b'), h1('Two'), p('c'));
    const range = getHeadingFoldRange(d, headingPos(d, 'One'));
    // Folds paragraph, sub-heading, and its paragraph — stops before "Two".
    expect(d.slice(range!.from, range!.to).content.childCount).toBe(3);

    const subRange = getHeadingFoldRange(d, headingPos(d, 'Sub'));
    expect(d.slice(subRange!.from, subRange!.to).content.childCount).toBe(1);
    expect(
      d.slice(subRange!.from, subRange!.to).content.child(0).textContent,
    ).toBe('b');
  });

  it('stops at a heading of a higher level than the fold owner', () => {
    const d = doc(h2('Sub'), p('a'), h1('Top'), p('b'));
    const range = getHeadingFoldRange(d, headingPos(d, 'Sub'));
    expect(d.slice(range!.from, range!.to).content.childCount).toBe(1);
  });

  it('extends to the end of the document after the last heading', () => {
    const d = doc(p('intro'), h1('Last'), p('a'), p('b'));
    const range = getHeadingFoldRange(d, headingPos(d, 'Last'));
    expect(range!.to).toBe(d.content.size);
  });

  it('returns null for adjacent headings and trailing headings', () => {
    const d = doc(h1('One'), h1('Two'));
    expect(getHeadingFoldRange(d, headingPos(d, 'One'))).toBeNull();
    expect(getHeadingFoldRange(d, headingPos(d, 'Two'))).toBeNull();
  });

  it('returns null for positions that do not hold a heading', () => {
    const d = doc(p('a'), h1('One'), p('b'));
    expect(getHeadingFoldRange(d, 0)).toBeNull();
    expect(getHeadingFoldRange(d, 10_000)).toBeNull();
  });
});

describe('toggle and unfold commands', () => {
  it('folds and unfolds without ever changing the document', () => {
    const original = doc(h1('One'), p('a'), p('b'), h1('Two'), p('c'));
    const editor = editorTest.createEditor(original);
    const { view } = editor;
    // Cursor inside the first heading.
    editor.setSelection(headingPos(view.state.doc, 'One') + 1);

    expect(
      collapsible.command.toggleHeadingCollapse(view.state, view.dispatch),
    ).toBe(true);

    expect(collapsible.query.isHeadingCollapsed(view.state)).toBe(true);
    expect(collapsible.query.listCollapsedHeadings(view.state)).toHaveLength(1);
    expect(hiddenTexts(view)).toEqual(['a', 'b']);
    editor.expectDoc(original);

    expect(
      collapsible.command.toggleHeadingCollapse(view.state, view.dispatch),
    ).toBe(true);
    expect(hiddenTexts(view)).toEqual([]);
    expect(collapsible.query.isHeadingCollapsed(view.state)).toBe(false);
    editor.expectDoc(original);
  });

  it('does not fold a heading with nothing beneath it', () => {
    const editor = editorTest.createEditor(doc(h1('One'), h1('Two'), p('c')));
    const { view } = editor;
    editor.setSelection(headingPos(view.state.doc, 'One') + 1);

    expect(
      collapsible.command.toggleHeadingCollapse(view.state, view.dispatch),
    ).toBe(false);
    expect(hiddenTexts(view)).toEqual([]);
  });

  it('folds only the subsection when toggling a deeper heading', () => {
    const editor = editorTest.createEditor(
      doc(h1('One'), p('a'), h2('Sub'), p('b'), h1('Two'), p('c')),
    );
    const { view } = editor;
    const subPos = headingPos(view.state.doc, 'Sub');

    expect(
      collapsible.command.toggleHeadingCollapseAtPos(subPos)(
        view.state,
        view.dispatch,
      ),
    ).toBe(true);
    expect(hiddenTexts(view)).toEqual(['b']);
  });

  it('uncollapseAllHeadings expands every folded section', () => {
    const editor = editorTest.createEditor(
      doc(h1('One'), p('a'), h1('Two'), p('b')),
    );
    const { view } = editor;
    const first = headingPos(view.state.doc, 'One');
    const second = headingPos(view.state.doc, 'Two');
    collapsible.command.toggleHeadingCollapseAtPos(first)(
      view.state,
      view.dispatch,
    );
    collapsible.command.toggleHeadingCollapseAtPos(second)(
      view.state,
      view.dispatch,
    );
    expect(hiddenTexts(view)).toEqual(['a', 'b']);

    expect(
      collapsible.command.uncollapseAllHeadings(view.state, view.dispatch),
    ).toBe(true);
    expect(hiddenTexts(view)).toEqual([]);
    // Nothing left to unfold.
    expect(
      collapsible.command.uncollapseAllHeadings(view.state, view.dispatch),
    ).toBe(false);
  });
});

describe('toggle affordance', () => {
  it('renders a toggle button only for foldable headings', () => {
    const editor = editorTest.createEditor(
      doc(h1('One'), p('a'), h1('Empty'), h1('Last'), p('b')),
    );
    // "One" and "Last" are foldable; "Empty" has no content beneath it.
    expect(toggleButtons(editor.view)).toHaveLength(2);
  });

  it('clicking the toggle folds and unfolds the section', () => {
    const editor = editorTest.createEditor(doc(h1('One'), p('a'), p('b')));
    const { view } = editor;

    const [button] = toggleButtons(view);
    expect(button).toBeDefined();
    expect(button?.getAttribute('aria-expanded')).toBe('true');
    button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(hiddenTexts(view)).toEqual(['a', 'b']);

    const [foldedButton] = toggleButtons(view);
    expect(foldedButton?.getAttribute('aria-expanded')).toBe('false');
    foldedButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(hiddenTexts(view)).toEqual([]);
  });
});

describe('document edits around folds', () => {
  it('keeps the fold anchored when content is inserted above it', () => {
    const editor = editorTest.createEditor(
      doc(p('intro'), h1('One'), p('a'), h1('Two'), p('b')),
    );
    const { view } = editor;
    collapsible.command.toggleHeadingCollapseAtPos(
      headingPos(view.state.doc, 'One'),
    )(view.state, view.dispatch);
    expect(hiddenTexts(view)).toEqual(['a']);

    view.dispatch(view.state.tr.insertText('more ', 1));
    expect(hiddenTexts(view)).toEqual(['a']);
    expect(
      collapsible.query.isHeadingCollapsed(
        view.state,
        headingPos(view.state.doc, 'One'),
      ),
    ).toBe(true);
  });

  it('reveals the hidden content when the folded heading is deleted', () => {
    const editor = editorTest.createEditor(
      doc(h1('One'), p('a'), h1('Two'), p('b')),
    );
    const { view } = editor;
    const pos = headingPos(view.state.doc, 'One');
    collapsible.command.toggleHeadingCollapseAtPos(pos)(
      view.state,
      view.dispatch,
    );
    expect(hiddenTexts(view)).toEqual(['a']);

    const heading = view.state.doc.nodeAt(pos);
    view.dispatch(view.state.tr.delete(pos, pos + (heading?.nodeSize ?? 0)));

    expect(hiddenTexts(view)).toEqual([]);
    expect(view.state.doc.textContent).toContain('a');
  });

  it('auto-unfolds when an edit lands inside the hidden region', () => {
    const editor = editorTest.createEditor(
      doc(h1('One'), p('a'), h1('Two'), p('b')),
    );
    const { view } = editor;
    const pos = headingPos(view.state.doc, 'One');
    collapsible.command.toggleHeadingCollapseAtPos(pos)(
      view.state,
      view.dispatch,
    );
    expect(hiddenTexts(view)).toEqual(['a']);

    // Put the cursor at the end of the folded heading and split it: the new
    // block would land inside the hidden region, so the fold must open.
    const heading = view.state.doc.nodeAt(pos);
    editor.setSelection(pos + (heading?.nodeSize ?? 0) - 1);
    editor.pressKey('Enter');

    expect(hiddenTexts(view)).toEqual([]);
    expect(collapsible.query.listCollapsedHeadings(view.state)).toHaveLength(0);
  });
});

describe('selection guard', () => {
  it('pushes a cursor moving forward past the hidden region', () => {
    const editor = editorTest.createEditor(
      doc(h1('One'), p('aaaa'), h1('Two'), p('b')),
    );
    const { view } = editor;
    const pos = headingPos(view.state.doc, 'One');
    collapsible.command.toggleHeadingCollapseAtPos(pos)(
      view.state,
      view.dispatch,
    );

    // Selection starts at the heading end, then moves into hidden content.
    const heading = view.state.doc.nodeAt(pos);
    editor.setSelection(pos + (heading?.nodeSize ?? 0) - 1);
    const insideHidden = pos + (heading?.nodeSize ?? 0) + 2;
    view.dispatch(
      view.state.tr.setSelection(
        TextSelection.create(view.state.doc, insideHidden),
      ),
    );

    // Cursor must not be stranded inside the hidden paragraph.
    const head = view.state.selection.head;
    const hiddenStart = pos + (heading?.nodeSize ?? 0);
    const twoPos = headingPos(view.state.doc, 'Two');
    expect(head > hiddenStart && head < twoPos).toBe(false);
    expect(hiddenTexts(view)).toEqual(['aaaa']);
  });

  it('moves the cursor to the heading when folding a section the cursor is inside', () => {
    const editor = editorTest.createEditor(
      doc(h1('One'), p('inside'), h1('Two'), p('b')),
    );
    const { view } = editor;
    const pos = headingPos(view.state.doc, 'One');
    const heading = view.state.doc.nodeAt(pos);
    // Cursor inside the paragraph that is about to be hidden.
    editor.setSelection(pos + (heading?.nodeSize ?? 0) + 3);

    collapsible.command.toggleHeadingCollapseAtPos(pos)(
      view.state,
      view.dispatch,
    );

    expect(hiddenTexts(view)).toEqual(['inside']);
    // The fold stays folded and the cursor lands on visible content.
    expect(view.state.selection.$head.parent.textContent).not.toBe('inside');
    expect(collapsible.query.listCollapsedHeadings(view.state)).toHaveLength(1);
  });
});
