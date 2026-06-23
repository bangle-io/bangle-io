// @vitest-environment jsdom

import { createStore } from 'jotai';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { setupBase } from '../../base';
import { collection, resolve } from '../../common';
import { setupParagraph } from '../../paragraph';
import { EditorState, EditorView, Schema, TextSelection } from '../../pm';
import { store as editorStore } from '../../store';
import { setupSuggestions } from '../index';
import {
  $suggestions,
  $suggestionUi,
  type SuggestionUiHandlers,
} from '../plugin-suggestion';

const slashSuggestions = setupSuggestions({
  providerId: 'slash-command',
  markName: 'slash_command',
  trigger: '/',
  markClassName: 'slash',
});
const wikiSuggestions = setupSuggestions({
  providerId: 'wiki-link',
  markName: 'wiki_link_suggestion',
  trigger: '[[',
  markClassName: 'wiki',
  requireTriggerBoundary: false,
  installKeymap: false,
});
const resolved = resolve([
  collection({ id: 'test-store' }),
  setupBase(),
  setupParagraph(),
  slashSuggestions,
  wikiSuggestions,
]);
const schema = new Schema({
  nodes: resolved.nodes,
  marks: resolved.marks,
});
const editors: EditorView[] = [];

afterEach(() => {
  for (const view of editors.splice(0)) {
    if (!view.isDestroyed) {
      view.destroy();
    }
  }
  vi.restoreAllMocks();
  document.body.replaceChildren();
});

function createEditor({
  text,
  markName,
  store,
}: {
  text: string;
  markName: string;
  store: ReturnType<typeof createStore>;
}) {
  const mark = schema.mark(markName, {
    trigger: text.startsWith('[[') ? '[[' : '/',
  });
  const doc = schema.node('doc', null, [
    schema.node('paragraph', null, [schema.text(text, [mark])]),
  ]);
  const mount = document.createElement('div');
  document.body.append(mount);
  const state = EditorState.create({
    doc,
    schema,
    selection: TextSelection.create(doc, 1),
    plugins: resolve([
      collection({
        id: 'test-store',
        plugin: { store: editorStore.storePlugin(store) },
      }),
      setupBase(),
      setupParagraph(),
      slashSuggestions,
      wikiSuggestions,
    ]).resolvePlugins({ schema }),
  });
  const view = new EditorView({ mount }, { state });
  editors.push(view);
  view.dispatch(
    view.state.tr.setSelection(
      TextSelection.create(view.state.doc, text.length + 1),
    ),
  );
  return view;
}

function pressKey(view: EditorView, key: string) {
  const event = new KeyboardEvent('keydown', { key, bubbles: true });
  let handled = false;
  view.someProp('handleKeyDown', (handler) => {
    if (handler(view, event)) {
      handled = true;
      return true;
    }
    return undefined;
  });
  return handled;
}

describe('suggestions provider state', () => {
  it('keeps active suggestions and enter handlers scoped to each editor view', () => {
    const store = createStore();
    const slashView = createEditor({
      text: '/',
      markName: 'slash_command',
      store,
    });
    const wikiView = createEditor({
      text: '[[Tar',
      markName: 'wiki_link_suggestion',
      store,
    });

    editorStore.set(
      slashView.state,
      $suggestions,
      new Map([
        [
          slashView,
          {
            markName: 'slash_command',
            trigger: '/',
            show: true,
            text: '/',
            position: 1,
            refresh: 0,
            anchorEl: () => null,
            selectedIndex: 0,
          },
        ],
        [
          wikiView,
          {
            markName: 'wiki_link_suggestion',
            trigger: '[[',
            show: true,
            text: '[[Tar',
            position: 1,
            refresh: 0,
            anchorEl: () => null,
            selectedIndex: 0,
          },
        ],
      ]),
    );

    const suggestions = editorStore.get(slashView.state, $suggestions);
    expect(suggestions.get(slashView)).toMatchObject({
      markName: 'slash_command',
      text: '/',
    });
    expect(suggestions.get(wikiView)).toMatchObject({
      markName: 'wiki_link_suggestion',
      text: '[[Tar',
    });

    const slashSelect = vi.fn();
    const wikiSelect = vi.fn();
    editorStore.set(
      slashView.state,
      $suggestionUi,
      new Map<EditorView, SuggestionUiHandlers>([
        [
          slashView,
          { slash_command: { onSelect: slashSelect, optionCount: 2 } },
        ],
        [
          wikiView,
          {
            wiki_link_suggestion: { onSelect: wikiSelect, optionCount: 2 },
          },
        ],
      ]),
    );

    expect(pressKey(wikiView, 'ArrowDown')).toBe(true);
    expect(
      editorStore.get(wikiView.state, $suggestions).get(wikiView)
        ?.selectedIndex,
    ).toBe(1);
    expect(
      editorStore.get(slashView.state, $suggestions).get(slashView)
        ?.selectedIndex,
    ).toBe(0);

    expect(pressKey(wikiView, 'ArrowDown')).toBe(true);
    expect(
      editorStore.get(wikiView.state, $suggestions).get(wikiView)
        ?.selectedIndex,
    ).toBe(1);

    expect(pressKey(wikiView, 'Enter')).toBe(true);
    expect(wikiSelect).toHaveBeenCalledTimes(1);
    expect(slashSelect).not.toHaveBeenCalled();
  });
});
