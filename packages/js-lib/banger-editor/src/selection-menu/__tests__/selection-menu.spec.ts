// @vitest-environment jsdom

import { createStore } from 'jotai';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setupBase } from '../../base';
import { setupBold } from '../../bold';
import { setupCodeBlock } from '../../code-block';
import { collection, resolve } from '../../common';
import { setupHorizontalRule } from '../../horizontal-rule';
import { setupParagraph } from '../../paragraph';
import {
  AllSelection,
  EditorState,
  EditorView,
  NodeSelection,
  Schema,
  TextSelection,
} from '../../pm';
import { store as editorStore } from '../../store';
import { setupSelectionMenu } from '../index';

const documentCollections = [
  setupBase(),
  setupParagraph(),
  setupCodeBlock(),
  setupHorizontalRule(),
  setupBold(),
];
const documentResolved = resolve(documentCollections);
const schema = new Schema({
  nodes: documentResolved.nodes,
  marks: documentResolved.marks,
});

type TestEditor = {
  view: EditorView;
  selectionMenu: ReturnType<typeof setupSelectionMenu>;
};
const editors: TestEditor[] = [];

beforeEach(() => {
  window.getSelection()?.removeAllRanges();
  vi.spyOn(EditorView.prototype, 'coordsAtPos').mockImplementation(
    (pos: number) => ({
      left: pos * 10,
      right: pos * 10,
      top: 10,
      bottom: 30,
    }),
  );
});

afterEach(() => {
  for (const { view } of editors.splice(0)) {
    if (!view.isDestroyed) {
      view.destroy();
    }
  }
  vi.restoreAllMocks();
  document.body.replaceChildren();
});

function paragraph(text: string) {
  return schema.node('paragraph', null, text ? [schema.text(text)] : []);
}

function createEditor({
  doc = schema.node('doc', null, [paragraph('selected text')]),
  selection = TextSelection.create(doc, 1, 9),
  editable = true,
  store = createStore(),
}: {
  doc?: ReturnType<typeof schema.node>;
  selection?: AllSelection | NodeSelection | TextSelection;
  editable?: boolean;
  store?: ReturnType<typeof createStore>;
} = {}): TestEditor {
  const selectionMenu = setupSelectionMenu();
  const resolved = resolve([
    collection({
      id: 'test-store',
      plugin: { store: editorStore.storePlugin(store) },
    }),
    selectionMenu,
  ]);
  const mount = document.createElement('div');
  document.body.append(mount);
  const state = EditorState.create({
    doc,
    schema,
    selection,
    plugins: resolved.resolvePlugins({ schema }),
  });
  const view = new EditorView(
    { mount },
    {
      state,
      editable: () => editable,
    },
  );
  const result = { view, selectionMenu };
  editors.push(result);
  return result;
}

function menuState({ view, selectionMenu }: TestEditor) {
  return editorStore.get(view.state, selectionMenu.$selectionMenu).get(view);
}

describe('selection menu plugin view', () => {
  it('synchronizes its initial non-empty text selection', () => {
    const editor = createEditor();
    expect(menuState(editor)).toMatchObject({ from: 1, to: 9 });
    expect(menuState(editor)?.anchorEl()?.contextElement).toBe(editor.view.dom);
  });

  it('hides for cursors, node selections, empty paragraphs, read-only views, and code blocks', () => {
    const textDoc = schema.node('doc', null, [paragraph('text')]);
    expect(
      menuState(
        createEditor({
          doc: textDoc,
          selection: TextSelection.create(textDoc, 2),
        }),
      ),
    ).toBeUndefined();

    const emptyDoc = schema.node('doc', null, [paragraph('')]);
    expect(
      menuState(
        createEditor({
          doc: emptyDoc,
          selection: TextSelection.create(emptyDoc, 1),
        }),
      ),
    ).toBeUndefined();

    const ruleDoc = schema.node('doc', null, [schema.node('horizontalRule')]);
    expect(
      menuState(
        createEditor({
          doc: ruleDoc,
          selection: NodeSelection.create(ruleDoc, 0),
        }),
      ),
    ).toBeUndefined();

    expect(menuState(createEditor({ editable: false }))).toBeUndefined();

    const codeDoc = schema.node('doc', null, [
      schema.node('code_block', null, [schema.text('code')]),
    ]);
    expect(
      menuState(
        createEditor({
          doc: codeDoc,
          selection: TextSelection.create(codeDoc, 1, 4),
        }),
      ),
    ).toBeUndefined();
  });

  it('supports multi-block inline selections', () => {
    const doc = schema.node('doc', null, [paragraph('one'), paragraph('two')]);
    const editor = createEditor({
      doc,
      selection: TextSelection.create(doc, 2, 7),
    });
    expect(menuState(editor)).toMatchObject({ from: 2, to: 7 });
  });

  it('supports ProseMirror AllSelection without redefining Mod-a', () => {
    const doc = schema.node('doc', null, [paragraph('one'), paragraph('two')]);
    const editor = createEditor({
      doc,
      selection: new AllSelection(doc),
    });

    expect(editor.view.state.selection).toBeInstanceOf(AllSelection);
    expect(menuState(editor)).toMatchObject({
      from: 0,
      to: doc.content.size,
    });
  });

  it('suppresses Escape dismissal through document changes until the selection changes', () => {
    const editor = createEditor();
    const { view, selectionMenu } = editor;

    const escapeEvent = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    });
    view.dispatchEvent(escapeEvent);
    expect(escapeEvent.defaultPrevented).toBe(true);
    expect(menuState(editor)).toBeUndefined();

    view.dispatch(view.state.tr.addMark(1, 9, schema.mark('bold')));
    expect(menuState(editor)).toBeUndefined();

    view.dispatch(
      view.state.tr.setSelection(TextSelection.create(view.state.doc, 2, 9)),
    );
    expect(menuState(editor)).toMatchObject({ from: 2, to: 9 });

    expect(
      selectionMenu.command.dismissSelectionMenu()(
        view.state,
        view.dispatch,
        view,
      ),
    ).toBe(true);
    expect(menuState(editor)).toBeUndefined();
  });

  it('keeps the menu open for formatting-only transactions', () => {
    const editor = createEditor();
    editor.view.dispatch(
      editor.view.state.tr.addMark(1, 9, schema.mark('bold')),
    );
    expect(menuState(editor)).toMatchObject({ from: 1, to: 9 });
  });
  it('keeps shared-store menu state scoped to each editor', () => {
    const store = createStore();
    const first = createEditor({ store });
    const second = createEditor({ store });

    expect(menuState(first)).toMatchObject({ from: 1, to: 9 });
    expect(menuState(second)).toMatchObject({ from: 1, to: 9 });

    first.view.destroy();
    expect(menuState(first)).toBeUndefined();
    expect(menuState(second)).toMatchObject({ from: 1, to: 9 });
  });

  it('does not prevent default for non-Escape keydown events', () => {
    const editor = createEditor();
    const event = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    });
    editor.view.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });

  it('does not prevent default on Escape keydown when menu is already dismissed', () => {
    const editor = createEditor();
    const { view } = editor;

    // First Escape dismisses
    const escapeEvent1 = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    });
    view.dispatchEvent(escapeEvent1);
    expect(escapeEvent1.defaultPrevented).toBe(true);

    // Second Escape does not prevent default since it is already dismissed
    const escapeEvent2 = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    });
    view.dispatchEvent(escapeEvent2);
    expect(escapeEvent2.defaultPrevented).toBe(false);
  });

  it('hides the menu when anchorEl cannot be created (coordsAtPos throws)', () => {
    const editor = createEditor();
    expect(menuState(editor)).toBeDefined();

    vi.spyOn(editor.view, 'coordsAtPos').mockImplementation(() => {
      throw new Error('unmappable');
    });

    // trigger sync by modifying selection
    editor.view.dispatch(
      editor.view.state.tr.setSelection(
        TextSelection.create(editor.view.state.doc, 2, 9),
      ),
    );
    expect(menuState(editor)).toBeUndefined();
  });

  it('dismisses the menu via dismissSelectionMenu command when view is not passed but match is found', () => {
    const editor = createEditor();
    expect(menuState(editor)).toBeDefined();

    const command = editor.selectionMenu.command.dismissSelectionMenu();
    const result = command(editor.view.state, editor.view.dispatch);
    expect(result).toBe(true);
    expect(menuState(editor)).toBeUndefined();
  });

  it('returns false from dismissSelectionMenu if no owner is found', () => {
    const editor = createEditor();
    const command = editor.selectionMenu.command.dismissSelectionMenu();
    // Use a fresh dummy state with the same plugins (so the store is present), but no active views
    const dummyState = EditorState.create({
      schema,
      plugins: editor.view.state.plugins,
    });
    const result = command(dummyState, () => {});
    expect(result).toBe(false);
  });
});
