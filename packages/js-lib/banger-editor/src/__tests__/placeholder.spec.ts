// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';
import { setupBase } from '../base';
import { setupCodeBlock } from '../code-block';
import { setupHeading } from '../heading';
import { setupParagraph } from '../paragraph';
import { setupPlaceholder } from '../placeholder';
import { createBangerEditorTestSetup } from '../test-helpers';

const EMPTY_DOC_HINT = 'empty doc hint';
const EMPTY_BLOCK_HINT = 'empty block hint';

const editorTest = createBangerEditorTestSetup({
  extensions: [
    setupBase(),
    setupParagraph(),
    setupHeading(),
    setupCodeBlock(),
    setupPlaceholder({
      placeholder: EMPTY_DOC_HINT,
      blockPlaceholder: EMPTY_BLOCK_HINT,
    }),
  ],
  builderAliases: {
    codeBlock: { nodeType: 'code_block', language: '' },
    doc: { nodeType: 'doc' },
    heading: { nodeType: 'heading', level: 1 },
    p: { nodeType: 'paragraph' },
  },
});

const { codeBlock, doc, p } = editorTest.builders;
const heading = editorTest.nodeBuilder('heading');

const docOnlyTest = createBangerEditorTestSetup({
  extensions: [
    setupBase(),
    setupParagraph(),
    setupCodeBlock(),
    setupPlaceholder({ placeholder: EMPTY_DOC_HINT }),
  ],
});

afterEach(() => {
  editorTest.cleanup();
  docOnlyTest.cleanup();
});

function visiblePlaceholder(view: { dom: HTMLElement }): string | null {
  return (
    view.dom
      .querySelector('[data-placeholder]')
      ?.getAttribute('data-placeholder') ?? null
  );
}

describe('placeholder', () => {
  it('shows the doc placeholder when the document is empty', () => {
    const editor = editorTest.createEditor(doc(p()));
    expect(visiblePlaceholder(editor.view)).toBe(EMPTY_DOC_HINT);
  });

  it('shows the block placeholder on the empty cursor paragraph when the doc has content', () => {
    const editor = editorTest.createEditor(doc(p('hello'), p()));
    editor.setSelection(8);
    expect(visiblePlaceholder(editor.view)).toBe(EMPTY_BLOCK_HINT);
  });

  it('does not show a placeholder when the cursor paragraph has content', () => {
    const editor = editorTest.createEditor(doc(p('hello'), p('world')));
    editor.setSelection(9);
    expect(visiblePlaceholder(editor.view)).toBeNull();
  });

  it('does not show the block placeholder on empty non-paragraph blocks', () => {
    const editor = editorTest.createEditor(doc(p('hello'), heading()));
    editor.setSelection(8);
    expect(visiblePlaceholder(editor.view)).toBeNull();
  });

  it('does not show the block placeholder inside code blocks', () => {
    const editor = editorTest.createEditor(doc(p('hello'), codeBlock()));
    editor.setSelection(8);
    expect(visiblePlaceholder(editor.view)).toBeNull();
  });

  it('does not show the block placeholder on empty paragraphs away from the cursor', () => {
    const editor = editorTest.createEditor(doc(p('hello'), p()));
    editor.setSelection(2);
    expect(visiblePlaceholder(editor.view)).toBeNull();
  });

  it('shows nothing on empty cursor blocks when blockPlaceholder is not configured', () => {
    const { doc: doc2, p: p2 } = docOnlyTest.builders;
    const editor = docOnlyTest.createEditor(doc2(p2('hello'), p2()));
    editor.setSelection(8);
    expect(visiblePlaceholder(editor.view)).toBeNull();
  });

  it('still shows the doc placeholder for legacy config without blockPlaceholder', () => {
    const { doc: doc2, p: p2 } = docOnlyTest.builders;
    const editor = docOnlyTest.createEditor(doc2(p2()));
    expect(visiblePlaceholder(editor.view)).toBe(EMPTY_DOC_HINT);
  });
});
