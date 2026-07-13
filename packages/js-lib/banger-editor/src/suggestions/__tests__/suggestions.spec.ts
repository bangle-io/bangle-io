// @vitest-environment jsdom

import { createStore } from 'jotai';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { setupBase } from '../../base';
import { collection, resolve } from '../../common';
import { setupLink } from '../../link';
import { setupParagraph } from '../../paragraph';
import {
  EditorState,
  EditorView,
  Fragment,
  Schema,
  TextSelection,
} from '../../pm';
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
});
const dateSuggestions = setupSuggestions({
  providerId: 'date-picker',
  markName: 'date_suggestion',
  trigger: '$date',
  markClassName: 'date',
  installKeymap: false,
});
const resolved = resolve([
  collection({ id: 'test-store' }),
  setupBase(),
  setupParagraph(),
  setupLink(),
  slashSuggestions,
  wikiSuggestions,
  dateSuggestions,
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
      setupLink(),
      slashSuggestions,
      wikiSuggestions,
      dateSuggestions,
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

function createPlainEditor({
  text,
  store,
}: {
  text: string;
  store: ReturnType<typeof createStore>;
}) {
  const doc = schema.node('doc', null, [
    schema.node('paragraph', null, text ? [schema.text(text)] : undefined),
  ]);
  const mount = document.createElement('div');
  document.body.append(mount);
  const state = EditorState.create({
    doc,
    schema,
    selection: TextSelection.create(doc, text.length + 1),
    plugins: resolve([
      collection({
        id: 'test-store',
        plugin: { store: editorStore.storePlugin(store) },
      }),
      setupBase(),
      setupParagraph(),
      setupLink(),
      slashSuggestions,
      wikiSuggestions,
      dateSuggestions,
    ]).resolvePlugins({ schema }),
  });
  const view = new EditorView({ mount }, { state });
  editors.push(view);
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

function handleTextInput(
  view: EditorView,
  from: number,
  to: number,
  text: string,
) {
  let handled = false;
  view.someProp('handleTextInput', (handler) => {
    if (handler(view, from, to, text, () => view.state.tr)) {
      handled = true;
      return true;
    }
    return undefined;
  });
  return handled;
}

describe('suggestions provider state', () => {
  it('does not trigger wiki-link suggestions while typing inside a link', () => {
    const store = createStore();
    const plugins = resolve([
      collection({
        id: 'test-store',
        plugin: { store: editorStore.storePlugin(store) },
      }),
      setupBase(),
      setupParagraph(),
      setupLink(),
      wikiSuggestions,
    ]).resolvePlugins({ schema });
    const linkMark = schema.mark('link', {
      href: 'https://example.com',
      title: null,
    });
    const linkedDoc = schema.node('doc', null, [
      schema.node('paragraph', null, [schema.text('linked', [linkMark])]),
    ]);
    const mount = document.createElement('div');
    document.body.append(mount);
    const linkedView = new EditorView(
      { mount },
      {
        state: EditorState.create({
          doc: linkedDoc,
          schema,
          selection: TextSelection.create(linkedDoc, 4),
          plugins,
        }),
      },
    );
    editors.push(linkedView);

    expect(handleTextInput(linkedView, 4, 4, '[[')).toBe(false);

    const plainDoc = schema.node('doc', null, [
      schema.node('paragraph', null, [schema.text('plain ')]),
    ]);
    const plainMount = document.createElement('div');
    document.body.append(plainMount);
    const plainView = new EditorView(
      { mount: plainMount },
      {
        state: EditorState.create({
          doc: plainDoc,
          schema,
          selection: TextSelection.create(plainDoc, 7),
          plugins,
        }),
      },
    );
    editors.push(plainView);

    expect(handleTextInput(plainView, 7, 7, '[[')).toBe(true);
    expect(plainView.state.doc.textContent).toBe('plain [[');
  });

  it('keeps an active provider suggestion when another provider is inactive in the same editor view', () => {
    const store = createStore();
    const view = createEditor({
      text: '/',
      markName: 'slash_command',
      store,
    });

    expect(editorStore.get(view.state, $suggestions).get(view)).toMatchObject({
      markName: 'slash_command',
      text: '/',
    });
  });

  it('keeps typed slash query text in the active provider suggestion', () => {
    const store = createStore();
    const view = createPlainEditor({ text: '', store });

    expect(handleTextInput(view, 1, 1, '/')).toBe(true);
    view.dispatch(view.state.tr.insertText('date'));

    expect(view.state.doc.textContent).toBe('/date');
    expect(editorStore.get(view.state, $suggestions).get(view)).toMatchObject({
      markName: 'slash_command',
      text: '/date',
    });
  });

  it('activates a provider when its multi-char trigger is typed', () => {
    const store = createStore();
    const view = createPlainEditor({ text: '$dat', store });

    expect(handleTextInput(view, 5, 5, 'e')).toBe(true);

    expect(view.state.doc.textContent).toBe('$date');
    expect(editorStore.get(view.state, $suggestions).get(view)).toMatchObject({
      markName: 'date_suggestion',
      text: '$date',
      show: true,
    });
  });

  it('activates a provider when its trigger arrives as a single inserted chunk', () => {
    const store = createStore();
    const view = createPlainEditor({ text: 'note ', store });

    // Dictation/autocorrect can insert the whole trigger in one
    // handleTextInput call; the boundary character must survive.
    expect(handleTextInput(view, 6, 6, '$date')).toBe(true);

    expect(view.state.doc.textContent).toBe('note $date');
    expect(editorStore.get(view.state, $suggestions).get(view)).toMatchObject({
      markName: 'date_suggestion',
      text: '$date',
      show: true,
    });
  });

  it('activates when boundary and trigger arrive together in one chunk', () => {
    const store = createStore();
    const view = createPlainEditor({ text: 'note', store });

    // insertText/dictation can deliver " /" in a single handleTextInput
    // call, so the boundary character is part of the pending text rather
    // than the document. This used to build an inverted replace range that
    // corrupted structured nodes (e.g. split a table into an extra column).
    expect(handleTextInput(view, 5, 5, ' /')).toBe(true);

    expect(view.state.doc.textContent).toBe('note /');
    expect(editorStore.get(view.state, $suggestions).get(view)).toMatchObject({
      markName: 'slash_command',
      text: '/',
      show: true,
    });
  });

  it('hands off to another provider when the mark is swapped for its trigger text', () => {
    const store = createStore();
    const view = createPlainEditor({ text: '', store });

    expect(handleTextInput(view, 1, 1, '/')).toBe(true);
    view.dispatch(view.state.tr.insertText('date'));
    expect(editorStore.get(view.state, $suggestions).get(view)).toMatchObject({
      markName: 'slash_command',
      text: '/date',
    });

    // This is the contract the slash menu's "Date" item relies on: replacing
    // the slash mark with another provider's trigger text (carrying that
    // provider's mark) activates the other provider's suggestion.
    const mark = schema.mark('date_suggestion', { trigger: '$date' });
    slashSuggestions.command.replaceSuggestMarkWith({
      content: Fragment.from(schema.text('$date', [mark])),
    })(view.state, view.dispatch, view);

    expect(view.state.doc.textContent).toBe('$date');
    expect(editorStore.get(view.state, $suggestions).get(view)).toMatchObject({
      markName: 'date_suggestion',
      text: '$date',
      show: true,
    });

    // Committing the new provider replaces the trigger text with content and
    // ends the suggestion.
    dateSuggestions.command.replaceSuggestMarkWith({
      content: 'Jul 2, 2026',
    })(view.state, view.dispatch, view);

    expect(view.state.doc.textContent).toBe('Jul 2, 2026');
    expect(editorStore.get(view.state, $suggestions).get(view)).toBeUndefined();
  });

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

describe('openSuggestion', () => {
  it('inserts the trigger with the suggestion mark and activates the provider', () => {
    const store = createStore();
    const view = createPlainEditor({ text: '', store });

    const handled = slashSuggestions.command.openSuggestion()(
      view.state,
      view.dispatch,
      view,
    );

    expect(handled).toBe(true);
    expect(view.state.doc.textContent).toBe('/');
    const markType = schema.marks.slash_command;
    if (!markType) throw new Error('missing slash_command mark');
    expect(view.state.doc.rangeHasMark(1, 2, markType)).toBe(true);
    expect(editorStore.get(view.state, $suggestions).get(view)).toMatchObject({
      markName: 'slash_command',
      show: true,
      text: '/',
    });
  });

  it('does not open inside a link', () => {
    const store = createStore();
    const linkMark = schema.marks.link;
    if (!linkMark) throw new Error('missing link mark');
    const doc = schema.node('doc', null, [
      schema.node('paragraph', null, [
        schema.text('site', [linkMark.create({ href: 'https://example.com' })]),
      ]),
    ]);
    const mount = document.createElement('div');
    document.body.append(mount);
    const state = EditorState.create({
      doc,
      schema,
      selection: TextSelection.create(doc, 3),
      plugins: resolve([
        collection({
          id: 'test-store',
          plugin: { store: editorStore.storePlugin(store) },
        }),
        setupBase(),
        setupParagraph(),
        setupLink(),
        slashSuggestions,
        wikiSuggestions,
        dateSuggestions,
      ]).resolvePlugins({ schema }),
    });
    const view = new EditorView({ mount }, { state });
    editors.push(view);

    const handled = slashSuggestions.command.openSuggestion()(
      view.state,
      view.dispatch,
      view,
    );

    expect(handled).toBe(false);
    expect(view.state.doc.textContent).toBe('site');
  });

  it('does not open when the selection is not empty', () => {
    const store = createStore();
    const view = createPlainEditor({ text: 'hello', store });
    view.dispatch(
      view.state.tr.setSelection(TextSelection.create(view.state.doc, 1, 4)),
    );

    const handled = slashSuggestions.command.openSuggestion()(
      view.state,
      view.dispatch,
      view,
    );

    expect(handled).toBe(false);
    expect(view.state.doc.textContent).toBe('hello');
  });
});

describe('synthetic suggestions and composition', () => {
  it('Escape removes a synthetic trigger entirely', () => {
    const store = createStore();
    const view = createPlainEditor({ text: 'note', store });

    slashSuggestions.command.openSuggestion()(view.state, view.dispatch, view);
    expect(view.state.doc.textContent).toBe('note/');

    // The "+" button user never typed the "/": Escape must not leave it.
    expect(pressKey(view, 'Escape')).toBe(true);
    expect(view.state.doc.textContent).toBe('note');
    expect(editorStore.get(view.state, $suggestions).get(view)).toBeUndefined();
  });

  it('Escape keeps a typed trigger as plain text', () => {
    const store = createStore();
    const view = createPlainEditor({ text: 'note ', store });

    expect(handleTextInput(view, 6, 6, '/')).toBe(true);
    expect(view.state.doc.textContent).toBe('note /');

    expect(pressKey(view, 'Escape')).toBe(true);
    expect(view.state.doc.textContent).toBe('note /');
    expect(editorStore.get(view.state, $suggestions).get(view)).toBeUndefined();
  });

  it('ignores menu keys while an IME composition is active', () => {
    const store = createStore();
    const view = createEditor({ text: '/', markName: 'slash_command', store });
    const onSelect = vi.fn();
    editorStore.set(
      view.state,
      $suggestionUi,
      new Map<EditorView, SuggestionUiHandlers>([
        [view, { slash_command: { onSelect, optionCount: 3 } }],
      ]),
    );

    // Simulate the browser-IME boundary: EditorView.composing is a getter
    // fed by native composition events jsdom cannot produce.
    Object.defineProperty(view, 'composing', {
      configurable: true,
      get: () => true,
    });

    // Arrow keys navigate composition candidates, not the menu.
    pressKey(view, 'ArrowDown');
    pressKey(view, 'ArrowDown');
    expect(
      editorStore.get(view.state, $suggestions).get(view)?.selectedIndex,
    ).toBe(0);

    // Enter confirms the composition; it must not select the highlighted
    // item. (Other keymaps may still legitimately handle the key.)
    pressKey(view, 'Enter');
    expect(onSelect).not.toHaveBeenCalled();

    Reflect.deleteProperty(view, 'composing');
  });
});

describe('replaceSuggestMarkWith', () => {
  it('replaces a bare trigger with longer content and puts the caret after it', () => {
    const store = createStore();
    const view = createEditor({ text: '/', markName: 'slash_command', store });

    const dateMark = schema.marks.date_suggestion;
    if (!dateMark) throw new Error('missing date_suggestion mark');
    const fragment = Fragment.from(
      schema.text('$date', [dateMark.create({ trigger: '$date' })]),
    );

    // Regression: content longer than the replaced query used to double-map
    // the caret position past the end of the document and silently fail.
    const handled = slashSuggestions.command.replaceSuggestMarkWith({
      content: fragment,
    })(view.state, view.dispatch, view);

    expect(handled).toBe(true);
    expect(view.state.doc.textContent).toBe('$date');
    expect(view.state.selection.from).toBe(6);
  });
});
