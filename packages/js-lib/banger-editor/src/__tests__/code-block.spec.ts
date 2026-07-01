// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';
import { createBangerEditorTestSetup } from '../test-helpers';

const editorTest = createBangerEditorTestSetup();
const { codeBlock, doc, p } = editorTest.builders;

afterEach(editorTest.cleanup);

describe('code block keymap', () => {
  it('exits a code block after repeated Enter at the end', () => {
    const editor = editorTest.createEditor(
      doc(codeBlock('const done = true;\n\n<cursor>')),
    );

    expect(editor.pressKey('Enter')).toBe(true);

    editor.expectDoc(doc(codeBlock('const done = true;'), p()));
    expect(editor.selectionParentType()).toBe('paragraph');
  });

  it('lets normal Enter insert a newline inside code blocks', () => {
    const editor = editorTest.createEditor(
      doc(codeBlock('const done = true;<cursor>')),
    );

    expect(editor.pressKey('Enter')).toBe(true);

    editor.expectDoc(doc(codeBlock('const done = true;\n')));
    expect(editor.selectionParentType()).toBe('code_block');
  });

  it('exits an empty code block on Enter so it does not trap the cursor', () => {
    const editor = editorTest.createEditor(doc(codeBlock('<cursor>')));

    expect(editor.pressKey('Enter')).toBe(true);

    editor.expectDoc(doc(codeBlock(), p()));
    expect(editor.selectionParentType()).toBe('paragraph');
  });

  it('inserts paragraphs below and above with primary Enter shortcuts', () => {
    const editor = editorTest.createEditor(
      doc(codeBlock('const below = true;<cursor>')),
    );

    expect(editor.pressKey('Enter', { ctrlKey: true })).toBe(true);
    editor.expectDoc(doc(codeBlock('const below = true;'), p()));
    expect(editor.selectionParentType()).toBe('paragraph');

    editor.setSelectionAtFirstBlockEnd();
    expect(editor.pressKey('Enter', { ctrlKey: true, shiftKey: true })).toBe(
      true,
    );
    editor.expectDoc(doc(p(), codeBlock('const below = true;'), p()));
    expect(editor.selectionParentType()).toBe('paragraph');
  });

  it('inserts boundary paragraphs with ArrowUp and ArrowDown at code block edges', () => {
    const editor = editorTest.createEditor(doc(codeBlock('line<cursor>')));

    expect(editor.pressKey('ArrowDown')).toBe(true);
    editor.expectDoc(doc(codeBlock('line'), p()));
    expect(editor.selectionParentType()).toBe('paragraph');

    editor.setSelection(1);
    expect(editor.pressKey('ArrowUp')).toBe(true);
    editor.expectDoc(doc(p(), codeBlock('line'), p()));
    expect(editor.selectionParentType()).toBe('paragraph');
  });

  it('moves into existing adjacent paragraphs with ArrowUp and ArrowDown', () => {
    const upEditor = editorTest.createEditor(
      doc(p('before'), codeBlock('<cursor>line')),
    );

    expect(upEditor.pressKey('ArrowUp')).toBe(true);
    upEditor.expectDoc(doc(p('before'), codeBlock('line')));
    expect(upEditor.selectionParentType()).toBe('paragraph');
    expect(upEditor.selectionParentText()).toBe('before');
    expect(upEditor.selectionParentOffset()).toBe('before'.length);

    const downEditor = editorTest.createEditor(
      doc(codeBlock('line<cursor>'), p('after')),
    );

    expect(downEditor.pressKey('ArrowDown')).toBe(true);
    downEditor.expectDoc(doc(codeBlock('line'), p('after')));
    expect(downEditor.selectionParentType()).toBe('paragraph');
    expect(downEditor.selectionParentText()).toBe('after');
    expect(downEditor.selectionParentOffset()).toBe(0);
  });

  it('treats single-line code blocks as vertical ArrowUp and ArrowDown boundaries', () => {
    const initialDoc = doc(codeBlock('li<cursor>ne'));
    const downEditor = editorTest.createEditor(initialDoc);

    expect(downEditor.pressKey('ArrowDown')).toBe(true);
    downEditor.expectDoc(doc(codeBlock('line'), p()));
    expect(downEditor.selectionParentType()).toBe('paragraph');

    const upEditor = editorTest.createEditor(initialDoc);

    expect(upEditor.pressKey('ArrowUp')).toBe(true);
    upEditor.expectDoc(doc(p(), codeBlock('line')));
    expect(upEditor.selectionParentType()).toBe('paragraph');
  });

  it('does not claim the sidebar shortcut as a code block toggle', () => {
    const editor = editorTest.createEditor(doc(p('plai<cursor>n text')));

    expect(editor.runKeyDownHandlers('\\', { ctrlKey: true })).toBe(false);
    editor.expectDoc(doc(p('plain text')));
  });
});
