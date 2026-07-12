// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';
import { setupBase } from '../base';
import { setupBlockquote } from '../blockquote';
import { setupCodeBlock } from '../code-block';
import { insertParagraphNear } from '../drag/add-block';
import { setupFrontmatter } from '../frontmatter';
import { setupParagraph } from '../paragraph';
import { setupTable } from '../table';
import { createBangerEditorTestSetup } from '../test-helpers';

const setup = createBangerEditorTestSetup({
  extensions: [
    setupBase({ docContent: 'frontmatter? block+' }),
    setupParagraph(),
    setupCodeBlock(),
    setupBlockquote(),
    setupFrontmatter(),
    setupTable(),
  ],
  builderAliases: {
    doc: { nodeType: 'doc' },
    p: { nodeType: 'paragraph' },
    codeBlock: { nodeType: 'code_block', language: '' },
    blockquote: { nodeType: 'blockquote' },
    frontmatter: { nodeType: 'frontmatter' },
    table: { nodeType: 'table' },
    row: { nodeType: 'table_row' },
    th: { nodeType: 'table_header' },
    td: { nodeType: 'table_cell' },
  },
});

const doc = setup.nodeBuilder('doc');
const p = setup.nodeBuilder('p');
const codeBlock = setup.nodeBuilder('codeBlock');
const blockquote = setup.nodeBuilder('blockquote');
const frontmatter = setup.nodeBuilder('frontmatter');
const tableNode = setup.nodeBuilder('table');
const row = setup.nodeBuilder('row');
const th = setup.nodeBuilder('th');
const td = setup.nodeBuilder('td');

afterEach(() => {
  setup.cleanup();
});

function simpleTable() {
  return tableNode(row(th('h1'), th('h2')), row(td('a'), td('b')));
}

describe('insertParagraphNear', () => {
  it('inserts after a top-level paragraph', () => {
    const editor = setup.createEditor(doc(p('one'), p('two')));
    // Position before the first paragraph.
    const handled = insertParagraphNear(editor.view, 0, { above: false });

    expect(handled).toBe(true);
    editor.expectDoc(doc(p('one'), p(), p('two')));
    expect(editor.selectionParentType()).toBe('paragraph');
    expect(editor.selectionParentText()).toBe('');
  });

  it('inserts before a top-level paragraph with above', () => {
    const editor = setup.createEditor(doc(p('one')));
    const handled = insertParagraphNear(editor.view, 0, { above: true });

    expect(handled).toBe(true);
    editor.expectDoc(doc(p(), p('one')));
  });

  it('never splits a table: a position inside a cell lands after the whole table', () => {
    const initial = doc(simpleTable(), p('tail'));
    const editor = setup.createEditor(initial);

    // Resolve a position inside the first header cell's text.
    const insideCell = 3;
    expect(editor.view.state.doc.resolve(insideCell).parent.type.name).toBe(
      'table_header',
    );

    const handled = insertParagraphNear(editor.view, insideCell, {
      above: false,
    });

    expect(handled).toBe(true);
    editor.expectDoc(doc(simpleTable(), p(), p('tail')));
  });

  it('inserts before the whole table with above from inside a cell', () => {
    const editor = setup.createEditor(doc(simpleTable()));

    const handled = insertParagraphNear(editor.view, 3, { above: true });

    expect(handled).toBe(true);
    editor.expectDoc(doc(p(), simpleTable()));
  });

  it('inserts inside a blockquote next to the hovered paragraph', () => {
    const editor = setup.createEditor(doc(blockquote(p('quoted'), p('more'))));

    // Position before the second paragraph inside the blockquote.
    const beforeSecond = 9;
    expect(
      editor.view.state.doc.resolve(beforeSecond).nodeAfter?.textContent,
    ).toBe('more');

    const handled = insertParagraphNear(editor.view, beforeSecond, {
      above: true,
    });

    expect(handled).toBe(true);
    editor.expectDoc(doc(blockquote(p('quoted'), p(), p('more'))));
  });

  it('does not insert above frontmatter, which must stay first', () => {
    const editor = setup.createEditor(doc(frontmatter('a: b'), p('body')));

    const handled = insertParagraphNear(editor.view, 0, { above: true });

    expect(handled).toBe(false);
    editor.expectDoc(doc(frontmatter('a: b'), p('body')));
  });

  it('inserts below frontmatter', () => {
    const editor = setup.createEditor(doc(frontmatter('a: b'), p('body')));

    const handled = insertParagraphNear(editor.view, 0, { above: false });

    expect(handled).toBe(true);
    editor.expectDoc(doc(frontmatter('a: b'), p(), p('body')));
  });

  it('inserts after a code block without touching its content', () => {
    const editor = setup.createEditor(doc(codeBlock('const x = 1;'), p('t')));

    const handled = insertParagraphNear(editor.view, 0, { above: false });

    expect(handled).toBe(true);
    editor.expectDoc(doc(codeBlock('const x = 1;'), p(), p('t')));
  });
});
