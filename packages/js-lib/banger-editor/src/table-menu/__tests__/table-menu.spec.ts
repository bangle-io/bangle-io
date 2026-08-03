// @vitest-environment jsdom

import { createStore } from 'jotai';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setupBase } from '../../base';
import { collection, resolve } from '../../common';
import { setupParagraph } from '../../paragraph';
import { EditorState, EditorView, Schema, TextSelection } from '../../pm';
import { store as editorStore } from '../../store';
import { setupTable } from '../../table';
import { setupTableMenu } from '../index';

const table = setupTable();
const resolved = resolve([setupBase(), setupParagraph(), table]);
const schema = new Schema({
  nodes: resolved.nodes,
  marks: resolved.marks,
});

type TestEditor = {
  tableMenu: ReturnType<typeof setupTableMenu>;
  view: EditorView;
};

const editors: TestEditor[] = [];

beforeEach(() => {
  vi.spyOn(EditorView.prototype, 'coordsAtPos').mockImplementation(
    (pos: number) => ({
      bottom: 30,
      left: pos * 10,
      right: pos * 10,
      top: 10,
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

function tableDoc() {
  const cell = (type: 'table_cell' | 'table_header', text: string) =>
    schema.node(type, null, text ? [schema.text(text)] : []);
  return schema.node('doc', null, [
    schema.node('paragraph', null, [schema.text('outside')]),
    schema.node('table', null, [
      schema.node('table_row', null, [
        cell('table_header', 'h1'),
        cell('table_header', 'h2'),
      ]),
      schema.node('table_row', null, [
        cell('table_cell', 'a1'),
        cell('table_cell', 'a2'),
      ]),
    ]),
  ]);
}

function tableCellPosition(doc: ReturnType<typeof tableDoc>, index = 0) {
  const positions: number[] = [];
  doc.descendants((node, pos) => {
    if (node.type.name === 'table_header' || node.type.name === 'table_cell') {
      positions.push(pos);
      return false;
    }
    return true;
  });
  const position = positions[index];
  if (position === undefined) {
    throw new Error(`Expected table cell at index ${index}`);
  }
  return position;
}

function createEditor({
  doc = tableDoc(),
  selection = TextSelection.create(doc, tableCellPosition(doc) + 1),
  store = createStore(),
}: {
  doc?: ReturnType<typeof tableDoc>;
  selection?: TextSelection;
  store?: ReturnType<typeof createStore>;
} = {}): TestEditor {
  const tableMenu = setupTableMenu();
  const collections = resolve([
    collection({
      id: 'test-store',
      plugin: { store: editorStore.storePlugin(store) },
    }),
    tableMenu,
  ]);
  const mount = document.createElement('div');
  document.body.append(mount);
  const view = new EditorView(
    { mount },
    {
      state: EditorState.create({
        doc,
        plugins: collections.resolvePlugins({ schema }),
        schema,
        selection,
      }),
    },
  );
  const editor = { tableMenu, view };
  editors.push(editor);
  return editor;
}

function menuState({ tableMenu, view }: TestEditor) {
  return editorStore.get(view.state, tableMenu.$tableMenu).get(view);
}

describe('table menu plugin view', () => {
  it('exposes an anchored menu only while an editable cursor is in a table', () => {
    const editor = createEditor();

    expect(menuState(editor)).toMatchObject({ show: true });
    expect(menuState(editor)?.anchorEl()?.contextElement).toBe(editor.view.dom);

    editor.view.dispatch(
      editor.view.state.tr.setSelection(
        TextSelection.create(editor.view.state.doc, 2),
      ),
    );
    expect(menuState(editor)).toBeUndefined();
  });

  it('does not expose a menu for a real read-only editor view', () => {
    const editor = createEditor();

    expect(menuState(editor)).toMatchObject({ show: true });
    editor.view.setProps({ editable: () => false });

    expect(editor.view.editable).toBe(false);
    expect(menuState(editor)).toBeUndefined();
  });

  it('dismisses with Escape until a document mutation restores the active table menu', () => {
    const editor = createEditor();

    const event = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: 'Escape',
    });
    editor.view.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(menuState(editor)).toBeUndefined();

    editor.view.dispatch(
      editor.view.state.tr.setSelection(
        TextSelection.create(
          editor.view.state.doc,
          tableCellPosition(editor.view.state.doc, 1) + 1,
        ),
      ),
    );
    expect(menuState(editor)).toBeUndefined();

    editor.view.dispatch(
      editor.view.state.tr.insertText('!', editor.view.state.selection.from),
    );
    expect(menuState(editor)).toMatchObject({ show: true });
  });

  it('keeps table menu ownership isolated across editors and cleans up only the destroyed view', () => {
    const store = createStore();
    const first = createEditor({ store });
    const second = createEditor({ store });

    expect(menuState(first)).toMatchObject({ show: true });
    expect(menuState(second)).toMatchObject({ show: true });

    first.view.destroy();
    expect(menuState(first)).toBeUndefined();
    expect(menuState(second)).toMatchObject({ show: true });

    expect(
      second.tableMenu.command.dismissTableMenu()(
        second.view.state,
        second.view.dispatch,
        second.view,
      ),
    ).toBe(true);
    expect(menuState(second)).toBeUndefined();
  });
});
