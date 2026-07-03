// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';
import { setupBase } from '../base';
import { setupCodeBlock } from '../code-block';
import {
  getHeadingFoldRange,
  setupCollapsibleHeading,
} from '../collapsible-heading';
import { setupHeading } from '../heading';
import { setupList } from '../list';
import { setupParagraph } from '../paragraph';
import type { PMNode } from '../pm';
import { NodeSelection, TextSelection } from '../pm';
import { createBangerEditorTestSetup } from '../test-helpers';

const collapsible = setupCollapsibleHeading();

const editorTest = createBangerEditorTestSetup({
  extensions: [
    setupBase(),
    setupParagraph(),
    setupCodeBlock(),
    setupHeading(),
    setupList(),
    collapsible,
  ],
  builderAliases: {
    bullet: { nodeType: 'list', kind: 'bullet' },
    codeBlock: { nodeType: 'code_block', language: '' },
    doc: { nodeType: 'doc' },
    p: { nodeType: 'paragraph' },
    h1: { nodeType: 'heading', level: 1 },
    h2: { nodeType: 'heading', level: 2 },
    h3: { nodeType: 'heading', level: 3 },
    h4: { nodeType: 'heading', level: 4 },
  },
});

const { doc, p } = editorTest.builders;
const h1 = editorTest.nodeBuilder('h1');
const h2 = editorTest.nodeBuilder('h2');
const h3 = editorTest.nodeBuilder('h3');
const h4 = editorTest.nodeBuilder('h4');
const bullet = editorTest.nodeBuilder('bullet');
const codeBlock = editorTest.nodeBuilder('codeBlock');

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

describe('collapse all headings at a level', () => {
  const original = () =>
    doc(h1('One'), p('a'), h2('Sub'), p('b'), h1('Two'), p('c'));

  it('folds every heading of that level and nothing deeper', () => {
    const editor = editorTest.createEditor(original());
    const { view } = editor;

    expect(
      collapsible.command.collapseAllHeadingsAtLevel(1)(
        view.state,
        view.dispatch,
      ),
    ).toBe(true);

    const folded = collapsible.query.listCollapsedHeadings(view.state);
    expect(folded.map((f) => f.node.textContent)).toEqual(['One', 'Two']);
    // Sub is hidden inside One's section but carries no fold state of its
    // own — collapsing level 1 must not recursively collapse level 2.
    expect(hiddenTexts(view)).toEqual(['a', 'Sub', 'b', 'c']);
    editor.expectDoc(original());

    collapsible.command.toggleHeadingCollapseAtPos(
      headingPos(view.state.doc, 'One'),
    )(view.state, view.dispatch);
    // One's whole section reappears, including Sub's content.
    expect(hiddenTexts(view)).toEqual(['c']);
    expect(
      collapsible.query.isHeadingCollapsed(
        view.state,
        headingPos(view.state.doc, 'Sub'),
      ),
    ).toBe(false);
  });

  it('folds only the requested level', () => {
    const editor = editorTest.createEditor(original());
    const { view } = editor;

    collapsible.command.collapseAllHeadingsAtLevel(2)(
      view.state,
      view.dispatch,
    );

    expect(
      collapsible.query
        .listCollapsedHeadings(view.state)
        .map((f) => f.node.textContent),
    ).toEqual(['Sub']);
    expect(hiddenTexts(view)).toEqual(['b']);
  });

  it('skips headings already hidden inside a folded section', () => {
    const editor = editorTest.createEditor(original());
    const { view } = editor;
    collapsible.command.toggleHeadingCollapseAtPos(
      headingPos(view.state.doc, 'One'),
    )(view.state, view.dispatch);

    // The only level-2 heading is hidden inside One's fold; nothing to do.
    expect(
      collapsible.command.collapseAllHeadingsAtLevel(2)(
        view.state,
        view.dispatch,
      ),
    ).toBe(false);
    expect(
      collapsible.query
        .listCollapsedHeadings(view.state)
        .map((f) => f.node.textContent),
    ).toEqual(['One']);
  });

  it('returns false when no heading of that level is foldable', () => {
    const editor = editorTest.createEditor(doc(h1('One'), p('a')));
    const { view } = editor;
    expect(
      collapsible.command.collapseAllHeadingsAtLevel(3)(
        view.state,
        view.dispatch,
      ),
    ).toBe(false);
  });
});

describe('nested folds', () => {
  it('collapse h2, collapse h1, uncollapse h1 keeps h2 folded, uncollapse h2 restores all', () => {
    const original = doc(
      h1('One'),
      p('a'),
      h2('Sub'),
      p('b'),
      h1('Two'),
      p('c'),
    );
    const editor = editorTest.createEditor(original);
    const { view } = editor;

    // Fold the inner h2 first.
    collapsible.command.toggleHeadingCollapseAtPos(
      headingPos(view.state.doc, 'Sub'),
    )(view.state, view.dispatch);
    expect(hiddenTexts(view)).toEqual(['b']);

    // Fold the enclosing h1: its whole section hides, including folded Sub.
    collapsible.command.toggleHeadingCollapseAtPos(
      headingPos(view.state.doc, 'One'),
    )(view.state, view.dispatch);
    expect(hiddenTexts(view)).toEqual(['a', 'Sub', 'b']);
    expect(collapsible.query.listCollapsedHeadings(view.state)).toHaveLength(2);

    // Unfold the h1: Sub reappears and is still folded.
    collapsible.command.toggleHeadingCollapseAtPos(
      headingPos(view.state.doc, 'One'),
    )(view.state, view.dispatch);
    expect(hiddenTexts(view)).toEqual(['b']);
    expect(
      collapsible.query.isHeadingCollapsed(
        view.state,
        headingPos(view.state.doc, 'Sub'),
      ),
    ).toBe(true);

    // Unfold the h2: back exactly where we started.
    collapsible.command.toggleHeadingCollapseAtPos(
      headingPos(view.state.doc, 'Sub'),
    )(view.state, view.dispatch);
    expect(hiddenTexts(view)).toEqual([]);
    expect(collapsible.query.listCollapsedHeadings(view.state)).toHaveLength(0);
    editor.expectDoc(original);
  });

  it('uncollapseAllHeadings clears folds at every nesting depth', () => {
    // Ported from the legacy "uncollapse all headings nested" case.
    const original = doc(
      h2('heading-a'),
      p('one'),
      h4('two'),
      p('three'),
      codeBlock('four'),
      h3('heading-b'),
      p('five'),
      h4('heading-c'),
      p('seven'),
      codeBlock('eight'),
      h3('heading-d'),
      p('nine'),
      p('ten'),
      h4('eleven'),
      p('twelve'),
    );
    const editor = editorTest.createEditor(original);
    const { view } = editor;

    for (const text of ['heading-c', 'heading-b', 'heading-a']) {
      collapsible.command.toggleHeadingCollapseAtPos(
        headingPos(view.state.doc, text),
      )(view.state, view.dispatch);
    }
    expect(collapsible.query.listCollapsedHeadings(view.state)).toHaveLength(3);
    expect(hiddenTexts(view)).not.toEqual([]);

    collapsible.command.uncollapseAllHeadings(view.state, view.dispatch);

    expect(hiddenTexts(view)).toEqual([]);
    expect(collapsible.query.listCollapsedHeadings(view.state)).toHaveLength(0);
    editor.expectDoc(original);
  });
});

describe('moving folded sections', () => {
  it('moves the heading together with its hidden section to the end', () => {
    const editor = editorTest.createEditor(
      doc(h1('One'), p('a'), p('b'), h1('Two'), p('c')),
    );
    const { view } = editor;
    const pos = headingPos(view.state.doc, 'One');
    collapsible.command.toggleHeadingCollapseAtPos(pos)(
      view.state,
      view.dispatch,
    );

    expect(
      collapsible.command.moveFoldedHeadingSection(
        pos,
        view.state.doc.content.size,
      )(view.state, view.dispatch),
    ).toBe(true);

    editor.expectDoc(doc(h1('Two'), p('c'), h1('One'), p('a'), p('b')));
    // The section arrives still folded, with a NodeSelection on the heading.
    expect(hiddenTexts(view)).toEqual(['a', 'b']);
    expect(
      collapsible.query.isHeadingCollapsed(
        view.state,
        headingPos(view.state.doc, 'One'),
      ),
    ).toBe(true);
    expect(view.state.selection).toBeInstanceOf(NodeSelection);
  });

  it('moves a folded section upwards', () => {
    const editor = editorTest.createEditor(
      doc(h1('One'), p('a'), h1('Two'), p('c')),
    );
    const { view } = editor;
    const pos = headingPos(view.state.doc, 'Two');
    collapsible.command.toggleHeadingCollapseAtPos(pos)(
      view.state,
      view.dispatch,
    );

    expect(
      collapsible.command.moveFoldedHeadingSection(pos, 0)(
        view.state,
        view.dispatch,
      ),
    ).toBe(true);

    editor.expectDoc(doc(h1('Two'), p('c'), h1('One'), p('a')));
    expect(hiddenTexts(view)).toEqual(['c']);
  });

  it('preserves nested fold state across a move', () => {
    const editor = editorTest.createEditor(
      doc(h1('One'), p('a'), h2('Sub'), p('b'), h1('Two'), p('c')),
    );
    const { view } = editor;
    collapsible.command.toggleHeadingCollapseAtPos(
      headingPos(view.state.doc, 'Sub'),
    )(view.state, view.dispatch);
    const onePos = headingPos(view.state.doc, 'One');
    collapsible.command.toggleHeadingCollapseAtPos(onePos)(
      view.state,
      view.dispatch,
    );

    collapsible.command.moveFoldedHeadingSection(
      onePos,
      view.state.doc.content.size,
    )(view.state, view.dispatch);

    editor.expectDoc(
      doc(h1('Two'), p('c'), h1('One'), p('a'), h2('Sub'), p('b')),
    );
    expect(collapsible.query.listCollapsedHeadings(view.state)).toHaveLength(2);

    // Unfolding the moved h1 reveals Sub, which is still folded.
    collapsible.command.toggleHeadingCollapseAtPos(
      headingPos(view.state.doc, 'One'),
    )(view.state, view.dispatch);
    expect(hiddenTexts(view)).toEqual(['b']);
    expect(
      collapsible.query.isHeadingCollapsed(
        view.state,
        headingPos(view.state.doc, 'Sub'),
      ),
    ).toBe(true);
  });

  it('refuses to drop a section into itself and leaves the doc untouched', () => {
    const original = doc(h1('One'), p('a'), p('b'), h1('Two'), p('c'));
    const editor = editorTest.createEditor(original);
    const { view } = editor;
    const pos = headingPos(view.state.doc, 'One');
    collapsible.command.toggleHeadingCollapseAtPos(pos)(
      view.state,
      view.dispatch,
    );

    const insideOwnRange = pos + 3;
    expect(
      collapsible.command.moveFoldedHeadingSection(pos, insideOwnRange)(
        view.state,
        view.dispatch,
      ),
    ).toBe(false);
    editor.expectDoc(original);
    expect(hiddenTexts(view)).toEqual(['a', 'b']);
  });

  it('does nothing for a heading that is not folded', () => {
    const editor = editorTest.createEditor(doc(h1('One'), p('a'), h1('Two')));
    const { view } = editor;
    expect(
      collapsible.command.moveFoldedHeadingSection(
        headingPos(view.state.doc, 'One'),
        view.state.doc.content.size,
      )(view.state, view.dispatch),
    ).toBe(false);
  });
});

// Fold-boundary cases ported from the legacy collapsible-heading tests
// (bangle.dev base-components), re-expressed for view-only folding.
describe('legacy ported cases', () => {
  it('higher level below: h3 folds up to the next h2', () => {
    const editor = editorTest.createEditor(
      doc(h3('ab'), p('hello'), p('abcd'), h2('bye')),
    );
    const { view } = editor;
    collapsible.command.toggleHeadingCollapseAtPos(
      headingPos(view.state.doc, 'ab'),
    )(view.state, view.dispatch);
    expect(hiddenTexts(view)).toEqual(['hello', 'abcd']);
  });

  it('same level below: h3 folds up to the next h3', () => {
    const editor = editorTest.createEditor(
      doc(h3('ab'), p('hello'), p('abcd'), h3('bye')),
    );
    const { view } = editor;
    collapsible.command.toggleHeadingCollapseAtPos(
      headingPos(view.state.doc, 'ab'),
    )(view.state, view.dispatch);
    expect(hiddenTexts(view)).toEqual(['hello', 'abcd']);
  });

  it('lower level below: h3 swallows an h4 section through the end', () => {
    const editor = editorTest.createEditor(
      doc(h3('ab'), p('12'), p('abcd'), h4('bye'), p('1'), p('2')),
    );
    const { view } = editor;
    collapsible.command.toggleHeadingCollapseAtPos(
      headingPos(view.state.doc, 'ab'),
    )(view.state, view.dispatch);
    expect(hiddenTexts(view)).toEqual(['12', 'abcd', 'bye', '1', '2']);
  });

  it('multi level: h3 folds through an h4 but stops at an h2', () => {
    const editor = editorTest.createEditor(
      doc(h3('ab'), p('12'), h4('bye4'), p('1'), h2('bye2'), p('2')),
    );
    const { view } = editor;
    collapsible.command.toggleHeadingCollapseAtPos(
      headingPos(view.state.doc, 'ab'),
    )(view.state, view.dispatch);
    expect(hiddenTexts(view)).toEqual(['12', 'bye4', '1']);
  });

  it('folds code blocks and lists like any other block', () => {
    const original = doc(
      p('a'),
      h4('hi'),
      p('1'),
      h3('ab'),
      bullet(p('first')),
      bullet(p('last')),
      codeBlock('foobar'),
      p('2'),
      h4('bye'),
    );
    const editor = editorTest.createEditor(original);
    const { view } = editor;
    collapsible.command.toggleHeadingCollapseAtPos(
      headingPos(view.state.doc, 'ab'),
    )(view.state, view.dispatch);

    expect(hiddenTexts(view)).toEqual(['first', 'last', 'foobar', '2', 'bye']);

    // Toggling again restores the original doc exactly (legacy invariant).
    collapsible.command.toggleHeadingCollapseAtPos(
      headingPos(view.state.doc, 'ab'),
    )(view.state, view.dispatch);
    expect(hiddenTexts(view)).toEqual([]);
    editor.expectDoc(original);
  });
});
