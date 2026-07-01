// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';
import { setupBase } from '../base';
import { setupBlockquote } from '../blockquote';
import { setupCodeBlock } from '../code-block';
import { collection } from '../common';
import { setupList } from '../list';
import { setupParagraph } from '../paragraph';
import { createBangerEditorTestSetup } from '../test-helpers';

const editorTest = createBangerEditorTestSetup();
const { codeBlock, doc, p } = editorTest.builders;
const macShortcutEditorTest = createBangerEditorTestSetup({
  extensions: [
    setupBase(),
    setupParagraph(),
    setupCodeBlock({
      keyDeleteWordBackward: 'Alt-Backspace',
      keyJumpToLineStart: 'Ctrl-a',
      keyJumpToLineEnd: 'Ctrl-e',
    }),
  ],
});
const appKeymapOrderEditorTest = createBangerEditorTestSetup({
  extensions: [setupBase(), setupList(), setupParagraph(), setupCodeBlock()],
});
const nestedEditorTest = createBangerEditorTestSetup({
  extensions: [
    setupBase(),
    setupParagraph(),
    setupBlockquote(),
    setupList(),
    setupCodeBlock(),
    collection({
      id: 'restricted-test-container',
      nodes: {
        restricted: {
          content: 'paragraph+',
          group: 'block',
          parseDOM: [{ tag: 'section[data-restricted]' }],
          toDOM: () => ['section', { 'data-restricted': 'true' }, 0],
        },
      },
    }),
  ],
  builderAliases: {
    bq: { nodeType: 'blockquote' },
    codeBlock: { nodeType: 'code_block', language: '' },
    doc: { nodeType: 'doc' },
    list: { nodeType: 'list', kind: 'bullet' },
    p: { nodeType: 'paragraph' },
    restricted: { nodeType: 'restricted' },
  },
});

afterEach(() => {
  editorTest.cleanup();
  macShortcutEditorTest.cleanup();
  appKeymapOrderEditorTest.cleanup();
  nestedEditorTest.cleanup();
});

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

  it('moves code blocks with Alt ArrowUp and ArrowDown', () => {
    const upEditor = editorTest.createEditor(
      doc(p('before'), codeBlock('line<cursor>'), p('after')),
    );

    expect(upEditor.pressKey('ArrowUp', { altKey: true })).toBe(true);
    upEditor.expectDoc(doc(codeBlock('line'), p('before'), p('after')));
    expect(upEditor.selectionParentType()).toBe('code_block');

    const downEditor = editorTest.createEditor(
      doc(p('before'), codeBlock('line<cursor>'), p('after')),
    );

    expect(downEditor.pressKey('ArrowDown', { altKey: true })).toBe(true);
    downEditor.expectDoc(doc(p('before'), p('after'), codeBlock('line')));
    expect(downEditor.selectionParentType()).toBe('code_block');
  });

  it('turns an empty leading code block into a paragraph on Backspace', () => {
    const editor = editorTest.createEditor(doc(codeBlock('<cursor>')));

    expect(editor.pressKey('Backspace')).toBe(true);

    editor.expectDoc(doc(p()));
    expect(editor.selectionParentType()).toBe('paragraph');
  });

  it('deletes the previous code word with Alt Backspace', () => {
    const { codeBlock, doc } = macShortcutEditorTest.builders;
    const longWordEditor = macShortcutEditorTest.createEditor(
      doc(codeBlock('singlelongword<cursor>')),
    );

    expect(longWordEditor.pressKey('Backspace', { altKey: true })).toBe(true);
    longWordEditor.expectDoc(doc(codeBlock()));
    expect(longWordEditor.selectionParentType()).toBe('code_block');

    const multiWordEditor = macShortcutEditorTest.createEditor(
      doc(codeBlock('two words<cursor>')),
    );

    expect(multiWordEditor.pressKey('Backspace', { altKey: true })).toBe(true);
    multiWordEditor.expectDoc(doc(codeBlock('two ')));
    expect(multiWordEditor.selectionParentType()).toBe('code_block');
  });

  it('jumps to code line boundaries with Ctrl-a and Ctrl-e', () => {
    const { codeBlock, doc } = macShortcutEditorTest.builders;
    const lineEditor = macShortcutEditorTest.createEditor(
      doc(codeBlock('one\ntw<cursor>o\nthree')),
    );

    expect(lineEditor.pressKey('a', { ctrlKey: true })).toBe(true);
    expect(lineEditor.selectionParentType()).toBe('code_block');
    expect(lineEditor.selectionParentOffset()).toBe('one\n'.length);

    lineEditor.setSelection('one\ntw'.length + 1);
    expect(lineEditor.pressKey('e', { ctrlKey: true })).toBe(true);
    expect(lineEditor.selectionParentType()).toBe('code_block');
    expect(lineEditor.selectionParentOffset()).toBe('one\ntwo'.length);
  });

  it('indents and outdents code lines with Tab and Shift-Tab', () => {
    const emptySelectionEditor = editorTest.createEditor(
      doc(codeBlock('const<cursor> value = true;')),
    );

    expect(emptySelectionEditor.pressKey('Tab')).toBe(true);
    emptySelectionEditor.expectDoc(doc(codeBlock('const   value = true;')));
    expect(emptySelectionEditor.selectionParentOffset()).toBe('const  '.length);

    const currentLineEditor = editorTest.createEditor(
      doc(codeBlock('  first\n  sec<cursor>ond')),
    );

    expect(currentLineEditor.pressKey('Tab', { shiftKey: true })).toBe(true);
    currentLineEditor.expectDoc(doc(codeBlock('  first\nsecond')));
    expect(currentLineEditor.selectionParentOffset()).toBe(
      '  first\nsec'.length,
    );
  });

  it('indents and outdents selected code lines with Tab and Shift-Tab', () => {
    const editor = editorTest.createEditor(
      doc(codeBlock('<start>first\nsecond<end>\nthird')),
    );

    expect(editor.pressKey('Tab')).toBe(true);
    editor.expectDoc(doc(codeBlock('  first\n  second\nthird')));

    expect(editor.pressKey('Tab', { shiftKey: true })).toBe(true);
    editor.expectDoc(doc(codeBlock('first\nsecond\nthird')));
  });

  it('deletes an empty paragraph before a code block with forward Delete', () => {
    const { codeBlock, doc, p } = appKeymapOrderEditorTest.builders;
    const editor = appKeymapOrderEditorTest.createEditor(
      doc(p('<cursor>'), codeBlock('const value = true;')),
    );

    expect(editor.pressKey('Delete')).toBe(true);

    editor.expectDoc(doc(codeBlock('const value = true;')));
    expect(editor.selectionParentType()).toBe('code_block');
    expect(editor.selectionParentOffset()).toBe(0);

    const emptyCodeEditor = appKeymapOrderEditorTest.createEditor(
      doc(p('<cursor>'), codeBlock()),
    );

    expect(emptyCodeEditor.pressKey('Delete')).toBe(true);

    emptyCodeEditor.expectDoc(doc(codeBlock()));
    expect(emptyCodeEditor.selectionParentType()).toBe('code_block');
    expect(emptyCodeEditor.selectionParentOffset()).toBe(0);
  });

  it('does not claim the sidebar shortcut as a code block toggle', () => {
    const editor = editorTest.createEditor(doc(p('plai<cursor>n text')));

    expect(editor.runKeyDownHandlers('\\', { ctrlKey: true })).toBe(false);
    editor.expectDoc(doc(p('plain text')));
  });

  it('converts typed fences inside schema-valid block containers', () => {
    const blockquote = nestedEditorTest.nodeBuilder('bq');
    const list = nestedEditorTest.nodeBuilder('list');
    const nestedDoc = nestedEditorTest.nodeBuilder('doc');
    const nestedCodeBlock = nestedEditorTest.nodeBuilder('codeBlock');
    const nestedParagraph = nestedEditorTest.nodeBuilder('p');
    const blockquoteEditor = nestedEditorTest.createEditor(
      nestedDoc(blockquote(nestedParagraph('```js<cursor>'))),
    );

    expect(blockquoteEditor.pressKey('Enter')).toBe(true);
    blockquoteEditor.expectDoc(
      nestedDoc(blockquote(nestedCodeBlock({ language: 'js' }))),
    );
    expect(blockquoteEditor.selectionParentType()).toBe('code_block');

    const listEditor = nestedEditorTest.createEditor(
      nestedDoc(list(nestedParagraph('```ts<cursor>'))),
    );

    expect(listEditor.pressKey('Enter')).toBe(true);
    listEditor.expectDoc(nestedDoc(list(nestedCodeBlock({ language: 'ts' }))));
    expect(listEditor.selectionParentType()).toBe('code_block');
  });

  it('does not convert typed fences when the parent schema forbids code blocks', () => {
    const restricted = nestedEditorTest.nodeBuilder('restricted');
    const nestedDoc = nestedEditorTest.nodeBuilder('doc');
    const nestedParagraph = nestedEditorTest.nodeBuilder('p');
    const editor = nestedEditorTest.createEditor(
      nestedDoc(restricted(nestedParagraph('```<cursor>'))),
    );

    expect(editor.pressKey('Enter')).toBe(true);
    editor.expectDoc(
      nestedDoc(restricted(nestedParagraph('```'), nestedParagraph())),
    );
    expect(editor.selectionParentType()).toBe('paragraph');
  });
});
