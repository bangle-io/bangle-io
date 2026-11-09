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
  it('mounts plugin-provided math and direct image NodeViews together', () => {
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
      defaultContent: '![alt](https://example.com/image.png) and $x + 1$',
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
  });
});
