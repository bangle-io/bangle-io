// @vitest-environment jsdom

import { Logger } from '@bangle.io/logger';
import type { EditorView } from '@bangle.io/prosemirror-plugins';
import { createStore } from 'jotai';
import { afterEach, describe, expect, it } from 'vitest';
import { setupExtensions } from '../extensions';
import { createEditor } from '../pm-setup';

const editors: Array<{ mount: HTMLElement; view: EditorView }> = [];

afterEach(() => {
  for (const { mount, view } of editors.splice(0)) {
    view.destroy();
    mount.remove();
  }
});

function createProductionEditor() {
  const mount = document.createElement('div');
  document.body.append(mount);
  const view = createEditor({
    domNode: mount,
    extensions: setupExtensions(new Logger('test', 'error')),
    store: createStore(),
  });
  editors.push({ mount, view });
  return view;
}

function typeText(view: EditorView, text: string) {
  for (const character of text) {
    const insertCharacter = () => view.state.tr.insertText(character);
    const handled = view.someProp('handleTextInput', (handler) =>
      handler(
        view,
        view.state.selection.from,
        view.state.selection.to,
        character,
        insertCharacter,
      ),
    );
    if (!handled) view.dispatch(insertCharacter());
  }
}

function pressKey(view: EditorView, key: string): boolean {
  const event = new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    key,
  });
  return Boolean(
    view.someProp('handleKeyDown', (handler) => handler(view, event)),
  );
}

describe('frontmatter input rule through production editor wiring', () => {
  it('immediate Backspace restores literal dashes after typing ---', () => {
    const view = createProductionEditor();

    typeText(view, '---');
    expect(view.state.doc.firstChild?.type.name).toBe('frontmatter');

    expect(pressKey(view, 'Backspace')).toBe(true);
    expect(view.state.doc.firstChild?.type.name).toBe('paragraph');
    expect(view.state.doc.firstChild?.textContent).toBe('---');
    expect(view.state.selection.$from.parent.type.name).toBe('paragraph');
  });
});
