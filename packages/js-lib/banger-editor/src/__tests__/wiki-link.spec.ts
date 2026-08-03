// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { setupBase } from '../base';
import { setupCode } from '../code';
import { setupCodeBlock } from '../code-block';
import { resolve } from '../common';
import { setupLink } from '../link';
import { setupParagraph } from '../paragraph';
import {
  EditorState,
  EditorView,
  type Mark,
  Schema,
  TextSelection,
} from '../pm';
import { setupWikiLink, type WikiLinkConfig } from '../wiki-link';

const editors: EditorView[] = [];

afterEach(() => {
  for (const view of editors.splice(0)) {
    if (!view.isDestroyed) {
      view.destroy();
    }
  }
  document.body.replaceChildren();
});

function createWikiEditor({
  config,
  initialContext,
  initialMark,
  selectionOffset,
  initialText = '',
}: {
  config?: WikiLinkConfig;
  initialContext?: 'code-block';
  initialMark?: 'code' | 'link';
  selectionOffset?: number;
  initialText?: string;
} = {}) {
  const wikiLink = setupWikiLink(config);
  const extensions = [
    setupBase(),
    setupParagraph(),
    setupCode(),
    setupCodeBlock(),
    setupLink(),
    wikiLink,
  ];
  const resolved = resolve(extensions);
  const schema = new Schema({
    nodes: resolved.nodes,
    marks: resolved.marks,
  });
  const paragraph = schema.nodes.paragraph;
  if (!paragraph) throw new Error('paragraph node missing from test schema');
  const marks: Mark[] = [];
  if (initialMark === 'code') {
    const mark = schema.marks.code;
    if (!mark) throw new Error('Expected code mark in test schema');
    marks.push(mark.create());
  } else if (initialMark === 'link') {
    const mark = schema.marks.link;
    if (!mark) throw new Error('Expected link mark in test schema');
    marks.push(mark.create({ href: 'https://example.com', title: null }));
  }
  const contentNode =
    initialContext === 'code-block'
      ? schema.nodes.code_block?.create(
          null,
          initialText ? schema.text(initialText) : undefined,
        )
      : paragraph.create(
          null,
          initialText ? schema.text(initialText, marks) : undefined,
        );
  if (!contentNode) throw new Error('code block node missing from test schema');
  const doc = schema.node('doc', null, [contentNode]);
  const mount = document.createElement('div');
  document.body.append(mount);
  const view = new EditorView(
    { mount },
    {
      state: EditorState.create({
        doc,
        schema,
        selection: TextSelection.create(
          doc,
          (selectionOffset ?? initialText.length) + 1,
        ),
        plugins: resolved.resolvePlugins({ schema }),
      }),
    },
  );
  if (marks.length) {
    view.dispatch(view.state.tr.setStoredMarks(marks));
  }
  editors.push(view);
  return { view, wikiLink };
}

function typeText(view: EditorView, text: string) {
  for (const character of text) {
    let handled = false;
    view.someProp('handleTextInput', (handler) => {
      if (
        handler(
          view,
          view.state.selection.from,
          view.state.selection.to,
          character,
          () => view.state.tr,
        )
      ) {
        handled = true;
        return true;
      }
      return undefined;
    });
    if (!handled) {
      view.dispatch(view.state.tr.insertText(character));
    }
  }
}

function wikiLinkNodes(view: EditorView) {
  const links: Array<{ label: string | null; target: string }> = [];
  view.state.doc.descendants((node) => {
    if (node.type.name === 'wiki_link') {
      links.push(node.attrs as { label: string | null; target: string });
    }
  });
  return links;
}

describe('wiki-link', () => {
  it('trims surrounding target whitespace from its display text', () => {
    const extensions = [setupBase(), setupParagraph(), setupWikiLink()];
    const resolved = resolve(extensions);
    const schema = new Schema({
      nodes: resolved.nodes,
      marks: resolved.marks,
    });
    const wikiLinkNode = schema.nodes.wiki_link;
    if (!wikiLinkNode) {
      throw new Error('wiki_link node missing from test schema');
    }
    const doc = schema.node('doc', null, [
      schema.node('paragraph', null, [
        wikiLinkNode.create({ target: ' Existing.md ', label: null }),
      ]),
    ]);
    const mount = document.createElement('div');
    document.body.append(mount);
    const view = new EditorView(
      { mount },
      {
        state: EditorState.create({
          doc,
          schema,
          plugins: resolved.resolvePlugins({ schema }),
        }),
      },
    );
    editors.push(view);

    const link = view.dom.querySelector('[role="link"]');
    expect(link?.textContent).toBe('Existing');
    expect(link?.getAttribute('data-wiki-link')).toBe(' Existing.md ');
  });

  it('uses the configured unresolved aria label for unresolved decorations', () => {
    const extensions = [
      setupBase(),
      setupParagraph(),
      setupWikiLink({
        resolveTarget: () => false,
        unresolvedAriaLabel: ({ displayText }) =>
          `${displayText} (custom missing note)`,
      }),
    ];
    const resolved = resolve(extensions);
    const schema = new Schema({
      nodes: resolved.nodes,
      marks: resolved.marks,
    });
    const wikiLinkNode = schema.nodes.wiki_link;
    if (!wikiLinkNode) {
      throw new Error('wiki_link node missing from test schema');
    }
    const doc = schema.node('doc', null, [
      schema.node('paragraph', null, [
        wikiLinkNode.create({
          target: 'Missing',
          label: null,
        }),
      ]),
    ]);
    const mount = document.createElement('div');
    document.body.append(mount);
    const view = new EditorView(
      { mount },
      {
        state: EditorState.create({
          doc,
          schema,
          plugins: resolved.resolvePlugins({ schema }),
        }),
      },
    );
    editors.push(view);

    expect(
      view.dom.querySelector('[role="link"]')?.getAttribute('aria-label'),
    ).toBe('Missing (custom missing note)');
  });

  it('turns a typed alias into one atomic wiki-link node', () => {
    const { view } = createWikiEditor();

    typeText(view, '[[Target|Display label]]');

    expect(wikiLinkNodes(view)).toEqual([
      { label: 'Display label', target: 'Target' },
    ]);
    expect(view.state.doc.textContent).toBe('[[Target|Display label]]');
  });

  it('uses odd/even backslash parity and rejects code and Markdown-link contexts', () => {
    const odd = createWikiEditor();
    typeText(odd.view, String.raw`\[[Target]]`);
    expect(wikiLinkNodes(odd.view)).toEqual([]);

    const even = createWikiEditor();
    typeText(even.view, String.raw`\\[[Target]]`);
    expect(wikiLinkNodes(even.view)).toEqual([
      { label: null, target: 'Target' },
    ]);

    const code = createWikiEditor({
      initialContext: 'code-block',
      initialText: '[[Target]',
    });
    typeText(code.view, ']');
    expect(wikiLinkNodes(code.view)).toEqual([]);

    const markdownLink = createWikiEditor({
      initialMark: 'link',
      initialText: '[[Target]x',
      selectionOffset: '[[Target]'.length,
    });
    typeText(markdownLink.view, ']');
    expect(wikiLinkNodes(markdownLink.view)).toEqual([]);

    const inlineCode = createWikiEditor({
      initialMark: 'code',
      initialText: '[[Target]',
    });
    typeText(inlineCode.view, ']');
    expect(wikiLinkNodes(inlineCode.view)).toEqual([]);
  });

  it('activates exactly once from a focused link and refreshes unresolved decorations', () => {
    const onActivate = vi.fn();
    let resolved = false;
    const { view, wikiLink } = createWikiEditor({
      config: {
        onActivate,
        resolveTarget: () => resolved,
      },
    });

    expect(
      wikiLink.command.insertWikiLink({ label: 'Go', target: 'Target' })(
        view.state,
        view.dispatch,
        view,
      ),
    ).toBe(true);
    const link = view.dom.querySelector<HTMLElement>('[role="link"]');
    if (!link) throw new Error('Expected rendered wiki link');
    expect(link.classList.contains('wiki-link-unresolved')).toBe(true);

    link.focus();
    link.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        key: 'Enter',
      }),
    );
    expect(onActivate).toHaveBeenCalledExactlyOnceWith(view, {
      label: 'Go',
      target: 'Target',
    });

    resolved = true;
    view.dispatch(view.state.tr.setMeta('wiki-link-targets-changed', true));
    expect(link.classList.contains('wiki-link-unresolved')).toBe(false);
  });
});
