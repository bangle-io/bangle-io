// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';
import { setupBase } from '../base';
import { setupBlockquote } from '../blockquote';
import { setupCodeBlock } from '../code-block';
import { keybinding } from '../common';
import { setupHeading } from '../heading';
import { setupList } from '../list';
import { setupParagraph } from '../paragraph';
import type { PMNode } from '../pm';
import { createBangerEditorTestSetup } from '../test-helpers';

const editorTest = createBangerEditorTestSetup({
  // Registered in the same relative order as the app (see the `extensions`
  // object in @bangle.io/editor). Keymaps of equal priority are sorted stably,
  // so a different order here would exercise a different winner for keys that
  // more than one extension binds.
  extensions: [
    setupBase(),
    setupBlockquote(),
    setupList(),
    setupHeading(),
    setupParagraph(),
    setupCodeBlock(),
  ],
  builderAliases: {
    blockquote: { nodeType: 'blockquote' },
    codeBlock: { nodeType: 'code_block', language: '' },
    doc: { nodeType: 'doc' },
    h1: { nodeType: 'heading', level: 1 },
    list: { nodeType: 'list' },
    p: { nodeType: 'paragraph' },
  },
});

const { doc, p, codeBlock } = editorTest.builders;
const list = editorTest.nodeBuilder('list');
const h1 = editorTest.nodeBuilder('h1');
const blockquote = editorTest.nodeBuilder('blockquote');

afterEach(() => editorTest.cleanup());

// `Mod-` resolves to Meta on Apple platforms and Ctrl everywhere else. Mirror
// prosemirror-keymap's own check so the test follows the environment instead of
// hard-coding a modifier that only matches one of them.
const IS_APPLE =
  typeof navigator !== 'undefined' &&
  /Mac|iP(hone|[oa]d)/.test(navigator.platform);
const MOD = IS_APPLE ? { metaKey: true } : { ctrlKey: true };
const INSERT_BELOW = MOD;
const INSERT_ABOVE = { ...MOD, shiftKey: true };
const TOGGLE_TASK_CHECKED = { altKey: true };

const bullet = { kind: 'bullet', listKind: 'bullet', tight: true } as const;
const ordered = { kind: 'ordered', listKind: 'ordered', tight: true } as const;
const uncheckedTask = {
  checked: false,
  kind: 'task',
  listKind: 'bullet',
  tight: true,
} as const;
const checkedTask = { ...uncheckedTask, checked: true } as const;

type Editor = ReturnType<typeof editorTest.createEditor>;

function caretPath(editor: Editor) {
  const { $from } = editor.view.state.selection;
  const path: string[] = [];
  for (let depth = 1; depth <= $from.depth; depth++) {
    path.push($from.node(depth).type.name);
  }
  return path.join('>');
}

function caretIsInEmptyBlock(editor: Editor) {
  return editor.view.state.selection.$from.parent.content.size === 0;
}

/** Position of the source text, so above/below can be told apart by direction. */
function posOfText(editor: Editor, text: string) {
  let found = -1;
  editor.view.state.doc.descendants((node, pos) => {
    if (found === -1 && node.isText && node.text?.includes(text)) found = pos;
  });
  return found;
}

function childTexts(node: PMNode) {
  return Array.from(
    { length: node.childCount },
    (_, index) => node.child(index).textContent,
  );
}

describe('insert empty block above/below shortcuts', () => {
  // Guards the whole keymap surface at once: before this fix, a caret inside a
  // list item left both shortcuts completely unhandled because paragraph.ts
  // filtered them to top level and list.ts bound neither.
  // `docChildren` and `caret` pin *which* extension handled the key: a special
  // block inside a list item inserts a paragraph into that item (doc stays one
  // child), while a plain item gets a whole sibling item (doc grows to two).
  describe.each([
    {
      name: 'paragraph at top level',
      build: () => doc(p('one<cursor>')),
      docChildren: 2,
      caret: 'paragraph',
    },
    {
      name: 'heading at top level',
      build: () => doc(h1('one<cursor>')),
      docChildren: 2,
      caret: 'paragraph',
    },
    {
      name: 'code block at top level',
      build: () => doc(codeBlock('one<cursor>')),
      docChildren: 2,
      caret: 'paragraph',
    },
    {
      name: 'paragraph in a blockquote',
      build: () => doc(blockquote(p('one<cursor>'))),
      docChildren: 2,
      caret: 'paragraph',
    },
    {
      name: 'bullet list item',
      build: () => doc(list(bullet, p('one<cursor>'))),
      docChildren: 2,
      caret: 'list>paragraph',
    },
    {
      name: 'ordered list item',
      build: () => doc(list(ordered, p('one<cursor>'))),
      docChildren: 2,
      caret: 'list>paragraph',
    },
    {
      name: 'task list item',
      build: () => doc(list(uncheckedTask, p('one<cursor>'))),
      docChildren: 2,
      caret: 'list>paragraph',
    },
    {
      name: 'heading inside a list item',
      build: () => doc(list(bullet, h1('one<cursor>'))),
      docChildren: 1,
      caret: 'list>paragraph',
    },
    {
      name: 'code block inside a list item',
      build: () => doc(list(bullet, codeBlock('one<cursor>'))),
      docChildren: 1,
      caret: 'list>paragraph',
    },
    {
      name: 'nested list item',
      build: () =>
        doc(list(bullet, p('parent'), list(bullet, p('one<cursor>')))),
      docChildren: 1,
      caret: 'list>list>paragraph',
    },
  ])('$name', ({ build, docChildren, caret }) => {
    it('inserts an empty block below the source and puts the caret in it', () => {
      const editor = editorTest.createEditor(build());

      expect(editor.pressKey('Enter', INSERT_BELOW)).toBe(true);
      expect(caretIsInEmptyBlock(editor)).toBe(true);
      expect(editor.view.state.doc.childCount).toBe(docChildren);
      expect(caretPath(editor)).toBe(caret);
      expect(editor.view.state.selection.from).toBeGreaterThan(
        posOfText(editor, 'one'),
      );
    });

    it('inserts an empty block above the source and puts the caret in it', () => {
      const editor = editorTest.createEditor(build());

      expect(editor.pressKey('Enter', INSERT_ABOVE)).toBe(true);
      expect(caretIsInEmptyBlock(editor)).toBe(true);
      expect(editor.view.state.doc.childCount).toBe(docChildren);
      expect(caretPath(editor)).toBe(caret);
      expect(editor.view.state.selection.from).toBeLessThan(
        posOfText(editor, 'one'),
      );
    });
  });

  it('adds a sibling item below that keeps the run marker', () => {
    const editor = editorTest.createEditor(doc(list(bullet, p('one<cursor>'))));

    editor.pressKey('Enter', INSERT_BELOW);

    const doc_ = editor.view.state.doc;
    expect(childTexts(doc_)).toEqual(['one', '']);
    expect(doc_.child(1).attrs).toMatchObject(bullet);
    expect(caretPath(editor)).toBe('list>paragraph');
  });

  it('adds a sibling item above that keeps the run marker', () => {
    const editor = editorTest.createEditor(
      doc(list(ordered, p('one<cursor>'))),
    );

    editor.pressKey('Enter', INSERT_ABOVE);

    const doc_ = editor.view.state.doc;
    expect(childTexts(doc_)).toEqual(['', 'one']);
    expect(doc_.child(0).attrs).toMatchObject(ordered);
    expect(caretPath(editor)).toBe('list>paragraph');
  });

  it('starts a new task item unchecked without touching the source item', () => {
    const editor = editorTest.createEditor(
      doc(list(checkedTask, p('one<cursor>'))),
    );

    editor.pressKey('Enter', INSERT_BELOW);

    const doc_ = editor.view.state.doc;
    expect(doc_.child(0).attrs).toMatchObject(checkedTask);
    expect(doc_.child(1).attrs).toMatchObject(uncheckedTask);
  });

  it('keeps a nested insert at the nested level', () => {
    const editor = editorTest.createEditor(
      doc(list(bullet, p('parent'), list(bullet, p('one<cursor>')))),
    );

    editor.pressKey('Enter', INSERT_BELOW);

    const doc_ = editor.view.state.doc;
    expect(doc_.childCount).toBe(1);
    const parent = doc_.child(0);
    expect(childTexts(parent)).toEqual(['parent', 'one', '']);
    expect(parent.child(2).attrs).toMatchObject(bullet);
    expect(caretPath(editor)).toBe('list>list>paragraph');
  });

  it('adds the sibling after the whole subtree, not between an item and its children', () => {
    const editor = editorTest.createEditor(
      doc(list(bullet, p('one<cursor>'), list(bullet, p('child')))),
    );

    editor.pressKey('Enter', INSERT_BELOW);

    const doc_ = editor.view.state.doc;
    expect(childTexts(doc_)).toEqual(['onechild', '']);
    expect(doc_.child(0).childCount).toBe(2);
  });
});

describe('task checkbox shortcut', () => {
  it('toggles the checkbox on its own binding', () => {
    const editor = editorTest.createEditor(
      doc(list(uncheckedTask, p('one<cursor>'))),
    );

    expect(editor.pressKey('Enter', TOGGLE_TASK_CHECKED)).toBe(true);
    expect(editor.view.state.doc.child(0).attrs).toMatchObject(checkedTask);
  });

  // Regression guard for the conflict this fix resolved: while the checkbox
  // owned Mod-Enter, insert-below could never run inside a task item.
  it('no longer intercepts the insert-below binding', () => {
    const editor = editorTest.createEditor(
      doc(list(uncheckedTask, p('one<cursor>'))),
    );

    editor.pressKey('Enter', INSERT_BELOW);

    const doc_ = editor.view.state.doc;
    expect(doc_.childCount).toBe(2);
    expect(doc_.child(0).attrs).toMatchObject(uncheckedTask);
  });
});

describe('keybinding', () => {
  // Object.fromEntries keeps the last entry for a repeated key, so a duplicate
  // used to silently disable the earlier command instead of failing.
  it('rejects two commands bound to the same key in one keymap', () => {
    expect(() =>
      keybinding(
        [
          ['Mod-Enter', () => true],
          ['Mod-Enter', () => false],
        ],
        'test-keymap',
      ),
    ).toThrow(/Duplicate keybinding "Mod-Enter" in "test-keymap"/);
  });

  it('allows disabled bindings to repeat', () => {
    expect(() =>
      keybinding(
        [
          [false, () => true],
          [false, () => false],
        ],
        'test-keymap',
      ),
    ).not.toThrow();
  });
});
