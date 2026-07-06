// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';
import { setupBase } from '../base';
import { setupCodeBlock } from '../code-block';
import { setupFrontmatter } from '../frontmatter';
import { setupParagraph } from '../paragraph';
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

afterEach(() => {
  editorTest.cleanup();
});

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
