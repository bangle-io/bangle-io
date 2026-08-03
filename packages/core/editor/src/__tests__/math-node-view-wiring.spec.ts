// @vitest-environment jsdom

import { Logger } from '@bangle.io/logger';
import type { NodeViewConstructor } from '@bangle.io/prosemirror-plugins';
import { createStore } from 'jotai';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { setupExtensions } from '../extensions';
import { createEditor } from '../pm-setup';

const views: Array<ReturnType<typeof createEditor>> = [];

afterEach(() => {
  for (const view of views) view.destroy();
  views.length = 0;
});

describe('math and direct NodeView wiring', () => {
  it('mounts bounded valid and invalid math NodeViews beside direct image views', () => {
    const imageNodeView = vi.fn<NodeViewConstructor>((node) => {
      const dom = document.createElement('img');
      dom.dataset.directImageView = 'true';
      dom.setAttribute('src', String(node.attrs.src));
      return { dom };
    });
    const mount = document.createElement('div');
    document.body.append(mount);
    const extensions = setupExtensions(new Logger('test', 'error'));
    const view = createEditor({
      defaultContent: [
        '![alt](https://example.com/image.png) and $x + 1$',
        String.raw`$$
\notacommand{
$$`,
        String.raw`$$
\rule{100em}{1em}
$$`,
        String.raw`$$
\def\loop{\loop}\loop
$$`,
        String.raw`$$
\href{javascript:alert(1)}{unsafe}
$$`,
      ].join('\n\n'),
      domNode: mount,
      extensions,
      nodeViews: { image: imageNodeView },
      store: createStore(),
    });
    views.push(view);

    expect(imageNodeView).toHaveBeenCalledOnce();
    expect(
      view.dom.querySelector('[data-direct-image-view="true"]'),
    ).not.toBeNull();
    expect(view.dom.querySelector('math-inline .katex')).not.toBeNull();
    expect(
      view.dom.querySelector(
        'math-inline math annotation[encoding="application/x-tex"]',
      )?.textContent,
    ).toBe('x + 1');
    const mathErrors = Array.from(
      view.dom.querySelectorAll<HTMLElement>('math-display .katex-error'),
    );
    expect(mathErrors).toContainEqual(
      expect.objectContaining({ textContent: String.raw`\notacommand{` }),
    );
    const expansionError = mathErrors.find(
      (error) => error.textContent === String.raw`\def\loop{\loop}\loop`,
    );
    // This expression is otherwise valid TeX. Its KaTeX error title proves
    // the production maxExpand limit, rather than an unsupported-command path,
    // rejected its recursive expansion.
    expect(expansionError?.getAttribute('title')).toContain(
      'Too many expansions',
    );
    // Production's maxSize of 20 clamps an excessive TeX rule rather than
    // allowing a single expression to claim arbitrary horizontal space.
    expect(
      view.dom.querySelector<HTMLElement>('math-display .mord.rule')?.style
        .borderRightWidth,
    ).toBe('20em');
    // The production renderer keeps KaTeX trust disabled, so TeX cannot turn
    // a javascript URL into an interactive link in the editor surface.
    expect(view.dom.querySelector('a[href^="javascript:"]')).toBeNull();
  });
});
