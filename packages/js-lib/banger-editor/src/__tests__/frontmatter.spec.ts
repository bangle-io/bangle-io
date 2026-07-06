// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';
import { setupBase } from '../base';
import { setupCodeBlock } from '../code-block';
import { setupFrontmatter } from '../frontmatter';
import { setupHorizontalRule } from '../horizontal-rule';
import { setupParagraph } from '../paragraph';
import type { EditorView } from '../pm';
import { DOMParser as PMDOMParser } from '../pm';
import { createBangerEditorTestSetup } from '../test-helpers';

const frontmatterExt = setupFrontmatter();
const editorTest = createBangerEditorTestSetup({
  extensions: [
    setupBase({ docContent: 'frontmatter? block+' }),
    setupParagraph(),
    setupCodeBlock(),
    frontmatterExt,
  ],
});
const { doc, p } = editorTest.builders;
const frontmatter = editorTest.nodeBuilder('frontmatter');

// A separate setup with the horizontal rule registered, to prove the `---`
// input rules coexist: frontmatter wins at the doc start, hr everywhere else.
const inputRuleEditorTest = createBangerEditorTestSetup({
  extensions: [
    setupBase({ docContent: 'frontmatter? block+' }),
    setupParagraph(),
    setupCodeBlock(),
    setupHorizontalRule(),
    setupFrontmatter(),
  ],
});

afterEach(() => {
  editorTest.cleanup();
  inputRuleEditorTest.cleanup();
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
    if (!handled) {
      view.dispatch(insertChar());
    }
  }
}

describe('frontmatter schema', () => {
  it('only allows a single frontmatter as the first child of the doc', () => {
    const docType = editorTest.schema.nodes.doc;
    expect(docType).toBeDefined();

    expect(() =>
      docType?.createChecked(null, [frontmatter('title: x'), p('body')]),
    ).not.toThrow();
    expect(() =>
      docType?.createChecked(null, [p('body'), frontmatter('title: x')]),
    ).toThrow();
    expect(() =>
      docType?.createChecked(null, [
        frontmatter('a: 1'),
        frontmatter('b: 2'),
        p('body'),
      ]),
    ).toThrow();
  });
});

describe('frontmatter DOM parsing', () => {
  it('parses pre[data-frontmatter] as frontmatter and plain pre as code block', () => {
    const container = document.createElement('div');
    container.innerHTML =
      '<pre data-frontmatter=""><code>a: 1</code></pre>' +
      '<pre><code>plain code</code></pre>';

    const parsed = PMDOMParser.fromSchema(editorTest.schema).parse(container, {
      preserveWhitespace: 'full',
    });

    expect(parsed.firstChild?.type.name).toBe('frontmatter');
    expect(parsed.firstChild?.textContent).toBe('a: 1');
    expect(parsed.child(1).type.name).toBe('code_block');
    expect(parsed.child(1).textContent).toBe('plain code');
  });
});

describe('insertFrontmatter command', () => {
  it('inserts an empty frontmatter at the top and moves the cursor inside', () => {
    const editor = editorTest.createEditor(doc(p('hello<cursor>')));

    const handled = frontmatterExt.command.insertFrontmatter(
      editor.view.state,
      editor.view.dispatch,
    );

    expect(handled).toBe(true);
    editor.expectDoc(doc(frontmatter(), p('hello')));
    expect(editor.selectionParentType()).toBe('frontmatter');
  });

  it('does not add a second frontmatter; it focuses the existing one', () => {
    const editor = editorTest.createEditor(
      doc(frontmatter('title: x'), p('body<cursor>')),
    );

    const handled = frontmatterExt.command.insertFrontmatter(
      editor.view.state,
      editor.view.dispatch,
    );

    expect(handled).toBe(true);
    editor.expectDoc(doc(frontmatter('title: x'), p('body')));
    expect(editor.selectionParentType()).toBe('frontmatter');
    expect(editor.selectionParentOffset()).toBe('title: x'.length);
  });

  it('deleteFrontmatter removes the block with all of its content', () => {
    const editor = editorTest.createEditor(
      doc(frontmatter('title: x\ntags: [a]'), p('body<cursor>')),
    );

    const handled = frontmatterExt.command.deleteFrontmatter(
      editor.view.state,
      editor.view.dispatch,
    );

    expect(handled).toBe(true);
    editor.expectDoc(doc(p('body')));
  });

  it('deleteFrontmatter is a no-op without a frontmatter block', () => {
    const editor = editorTest.createEditor(doc(p('body<cursor>')));

    const handled = frontmatterExt.command.deleteFrontmatter(
      editor.view.state,
      editor.view.dispatch,
    );

    expect(handled).toBe(false);
    editor.expectDoc(doc(p('body')));
  });

  it('reports frontmatter presence through the query', () => {
    const withFrontmatter = editorTest.createEditor(
      doc(frontmatter('a: 1'), p('body<cursor>')),
    );
    const withoutFrontmatter = editorTest.createEditor(doc(p('body<cursor>')));

    expect(
      frontmatterExt.query.hasFrontmatter(withFrontmatter.view.state),
    ).toBe(true);
    expect(
      frontmatterExt.query.hasFrontmatter(withoutFrontmatter.view.state),
    ).toBe(false);
  });
});

describe('frontmatter keymap', () => {
  it('Backspace removes an empty frontmatter block', () => {
    const editor = editorTest.createEditor(
      doc(frontmatter('<cursor>'), p('body')),
    );

    expect(editor.pressKey('Backspace')).toBe(true);

    editor.expectDoc(doc(p('body')));
  });

  it('Backspace at the start of a non-empty frontmatter keeps its content', () => {
    const editor = editorTest.createEditor(
      doc(frontmatter('<cursor>title: x'), p('body')),
    );

    editor.pressKey('Backspace');

    editor.expectDoc(doc(frontmatter('title: x'), p('body')));
  });

  it('Backspace at the start of the body does not merge text into the metadata', () => {
    const editor = editorTest.createEditor(
      doc(frontmatter('title: x'), p('<cursor>body')),
    );

    editor.pressKey('Backspace');

    editor.expectDoc(doc(frontmatter('title: x'), p('body')));
  });

  it('Enter inserts a newline inside the block', () => {
    const editor = editorTest.createEditor(
      doc(frontmatter('title: x<cursor>'), p('body')),
    );

    expect(editor.pressKey('Enter')).toBe(true);

    editor.expectDoc(doc(frontmatter('title: x\n'), p('body')));
  });

  it('Enter on a trailing blank line exits into the body and drops the blank line', () => {
    const editor = editorTest.createEditor(
      doc(frontmatter('title: x\n<cursor>'), p('body')),
    );

    expect(editor.pressKey('Enter')).toBe(true);

    editor.expectDoc(doc(frontmatter('title: x'), p('body')));
    expect(editor.selectionParentType()).toBe('paragraph');
  });

  it('Tab indents by two spaces', () => {
    const editor = editorTest.createEditor(
      doc(frontmatter('tags:\n<cursor>'), p('body')),
    );

    expect(editor.pressKey('Tab')).toBe(true);

    editor.expectDoc(doc(frontmatter('tags:\n  '), p('body')));
  });

  it('ArrowDown on the last line moves the cursor into the body', () => {
    const editor = editorTest.createEditor(
      doc(frontmatter('a: 1\nb: 2<cursor>'), p('body')),
    );

    expect(editor.pressKey('ArrowDown')).toBe(true);

    editor.expectDoc(doc(frontmatter('a: 1\nb: 2'), p('body')));
    expect(editor.selectionParentType()).toBe('paragraph');
  });

  it('ArrowDown on an earlier line stays inside the block', () => {
    const editor = editorTest.createEditor(
      doc(frontmatter('a: 1<cursor>\nb: 2'), p('body')),
    );

    editor.pressKey('ArrowDown');

    expect(editor.selectionParentType()).toBe('frontmatter');
  });
});

describe('frontmatter input rule', () => {
  const { doc: docB, p: pB } = inputRuleEditorTest.builders;
  const frontmatterB = inputRuleEditorTest.nodeBuilder('frontmatter');
  const hr = inputRuleEditorTest.nodeBuilder('horizontalRule');

  it('typing --- at the start of an empty document creates frontmatter', () => {
    const editor = inputRuleEditorTest.createEditor(docB(pB('<cursor>')));

    typeText(editor.view, '---');

    editor.expectDoc(docB(frontmatterB(), pB()));
    expect(editor.selectionParentType()).toBe('frontmatter');
  });

  it('typing --- in a later paragraph still creates a horizontal rule', () => {
    const editor = inputRuleEditorTest.createEditor(
      docB(pB('intro'), pB('<cursor>')),
    );

    typeText(editor.view, '---');

    editor.expectDoc(docB(pB('intro'), hr(), pB()));
  });

  it('typing --- below an existing frontmatter creates a horizontal rule', () => {
    const editor = inputRuleEditorTest.createEditor(
      docB(frontmatterB('a: 1'), pB('<cursor>')),
    );

    typeText(editor.view, '---');

    editor.expectDoc(docB(frontmatterB('a: 1'), hr(), pB()));
  });

  it('typing --- before other text yields an hr (existing behavior), not frontmatter', () => {
    const editor = inputRuleEditorTest.createEditor(
      docB(pB('<cursor>keep me')),
    );

    typeText(editor.view, '---');

    editor.expectDoc(docB(hr(), pB('keep me')));
  });
});
