// @vitest-environment jsdom

import { createStore } from 'jotai';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setupBase } from '../../base';
import { collection, resolve } from '../../common';
import { setupLink } from '../../link';
import { setupParagraph } from '../../paragraph';
import { EditorState, EditorView, Schema, TextSelection } from '../../pm';
import { store as editorStore } from '../../store';
import { setupLinkMenu } from '../index';

const link = setupLink();
const documentResolved = resolve([setupBase(), setupParagraph(), link]);
const schema = new Schema({
  nodes: documentResolved.nodes,
  marks: documentResolved.marks,
});

type TestEditor = {
  view: EditorView;
  linkMenu: ReturnType<typeof setupLinkMenu>;
};
const editors: TestEditor[] = [];

beforeEach(() => {
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

function createEditor({
  href,
  store,
}: {
  href?: string;
  store: ReturnType<typeof createStore>;
}): TestEditor {
  const marks = href ? [schema.mark('link', { href, title: null })] : undefined;
  const doc = schema.node('doc', null, [
    schema.node('paragraph', null, [schema.text('linked', marks)]),
  ]);
  const linkMenu = setupLinkMenu({ link });
  const resolved = resolve([
    collection({
      id: 'test-store',
      plugin: { store: editorStore.storePlugin(store) },
    }),
    linkMenu,
  ]);
  const mount = document.createElement('div');
  document.body.append(mount);
  const state = EditorState.create({
    doc,
    schema,
    selection: TextSelection.create(doc, 2),
    plugins: resolved.resolvePlugins({ schema }),
  });
  const view = new EditorView({ mount }, { state });
  const result = { view, linkMenu };
  editors.push(result);
  return result;
}

function menuState({ view, linkMenu }: TestEditor) {
  return editorStore.get(view.state, linkMenu.$linkMenu).get(view);
}

describe('link menu plugin view', () => {
  it('does not let an unrelated editor clear or dismiss another menu', () => {
    const store = createStore();
    const linked = createEditor({ href: 'https://example.com', store });
    const plain = createEditor({ store });

    expect(menuState(linked)).toMatchObject({
      href: 'https://example.com',
      position: 2,
    });
    expect(menuState(plain)).toBeUndefined();

    plain.view.dispatch(plain.view.state.tr.insertText('x', 2));
    expect(menuState(linked)).toBeDefined();
    expect(
      plain.linkMenu.command.dismissLinkMenu()(
        plain.view.state,
        plain.view.dispatch,
        plain.view,
      ),
    ).toBe(false);
    expect(menuState(linked)).toBeDefined();
  });

  it('keeps two active menus scoped independently through destruction', () => {
    const store = createStore();
    const first = createEditor({ href: 'https://one.example', store });
    const second = createEditor({ href: 'https://two.example', store });

    expect(menuState(first)?.href).toBe('https://one.example');
    expect(menuState(second)?.href).toBe('https://two.example');

    first.view.destroy();
    expect(menuState(first)).toBeUndefined();
    expect(menuState(second)?.href).toBe('https://two.example');
  });

  it('hides the menu if selection becomes non-empty', () => {
    const store = createStore();
    const editor = createEditor({ href: 'https://example.com', store });
    expect(menuState(editor)).toBeDefined();

    // Select text (non-empty)
    editor.view.dispatch(
      editor.view.state.tr.setSelection(
        TextSelection.create(editor.view.state.doc, 1, 5),
      ),
    );
    expect(menuState(editor)).toBeUndefined();
  });

  it('hides the menu if anchorEl cannot be created (coordsAtPos throws)', () => {
    const store = createStore();
    const editor = createEditor({ href: 'https://example.com', store });
    expect(menuState(editor)).toBeDefined();

    // Make coordsAtPos throw to simulate failing to map/create element
    vi.spyOn(editor.view, 'coordsAtPos').mockImplementation(() => {
      throw new Error('unmappable');
    });

    // Trigger update/sync by shifting selection slightly within the link mark
    editor.view.dispatch(
      editor.view.state.tr.setSelection(
        TextSelection.create(editor.view.state.doc, 3),
      ),
    );
    expect(menuState(editor)).toBeUndefined();
  });

  it('dismisses the menu via dismissLinkMenu command when view is not passed but match is found', () => {
    const store = createStore();
    const editor = createEditor({ href: 'https://example.com', store });
    expect(menuState(editor)).toBeDefined();

    // Call dismissLinkMenu without the view argument
    const command = editor.linkMenu.command.dismissLinkMenu();
    const result = command(editor.view.state, editor.view.dispatch);
    expect(result).toBe(true);
    expect(menuState(editor)).toBeUndefined();
  });

  it('handles link with no href (null href)', () => {
    const store = createStore();
    const marks = [schema.mark('link', { href: null, title: null })];
    const doc = schema.node('doc', null, [
      schema.node('paragraph', null, [schema.text('linked', marks)]),
    ]);
    const linkMenu = setupLinkMenu({ link });
    const resolved = resolve([
      collection({
        id: 'test-store',
        plugin: { store: editorStore.storePlugin(store) },
      }),
      linkMenu,
    ]);
    const mount = document.createElement('div');
    document.body.append(mount);
    const state = EditorState.create({
      doc,
      schema,
      selection: TextSelection.create(doc, 2),
      plugins: resolved.resolvePlugins({ schema }),
    });
    const view = new EditorView({ mount }, { state });
    editors.push({ view, linkMenu });

    const menu = editorStore.get(view.state, linkMenu.$linkMenu).get(view);
    expect(menu).toMatchObject({
      href: '',
      position: 2,
    });
  });
});
