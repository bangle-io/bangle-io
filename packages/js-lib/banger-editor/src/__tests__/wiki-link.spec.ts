// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';
import { setupBase } from '../base';
import { resolve } from '../common';
import { setupParagraph } from '../paragraph';
import { EditorState, EditorView, Schema } from '../pm';
import { setupWikiLink } from '../wiki-link';

const editors: EditorView[] = [];

afterEach(() => {
  for (const view of editors.splice(0)) {
    if (!view.isDestroyed) {
      view.destroy();
    }
  }
  document.body.replaceChildren();
});

describe('wiki-link', () => {
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
});
