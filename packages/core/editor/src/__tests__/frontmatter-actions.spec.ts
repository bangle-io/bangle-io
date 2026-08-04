// @vitest-environment jsdom

import {
  EditorState,
  EditorView,
  resolve,
  Schema,
  setupBase,
  setupFrontmatter,
  setupHistory,
  setupParagraph,
  undo,
} from '@bangle.io/prosemirror-plugins';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setupFrontmatterActions } from '../frontmatter-actions';

const editors: Array<{ mount: HTMLElement; view: EditorView }> = [];

beforeEach(() => {
  vi.stubGlobal('t', {
    app: {
      editor: {
        frontmatter: {
          delete: 'Delete',
          deleteLabel: 'Delete frontmatter',
        },
      },
    },
  });
});

afterEach(() => {
  for (const { mount, view } of editors.splice(0)) {
    if (!view.isDestroyed) {
      view.destroy();
    }
    mount.remove();
  }
  document.body.replaceChildren();
  vi.unstubAllGlobals();
});

function createEditor(frontmatterText: string | undefined) {
  const frontmatter = setupFrontmatter();
  const extensions = [
    setupBase({ docContent: 'frontmatter? block+' }),
    setupParagraph(),
    setupHistory(),
    frontmatter,
    setupFrontmatterActions({
      deleteFrontmatter: frontmatter.command.deleteFrontmatter,
    }),
  ];
  const resolved = resolve(extensions);
  const schema = new Schema({ nodes: resolved.nodes, marks: resolved.marks });
  const frontmatterNode = schema.nodes.frontmatter;
  const paragraph = schema.nodes.paragraph;
  if (!frontmatterNode || !paragraph) {
    throw new Error('Expected frontmatter and paragraph nodes');
  }
  const nodes =
    frontmatterText === undefined
      ? [paragraph.create(null, schema.text('body'))]
      : [
          frontmatterNode.create(
            null,
            frontmatterText ? schema.text(frontmatterText) : undefined,
          ),
          paragraph.create(null, schema.text('body')),
        ];
  const mount = document.createElement('div');
  document.body.append(mount);
  const view = new EditorView(
    { mount },
    {
      state: EditorState.create({
        doc: schema.node('doc', null, nodes),
        schema,
        plugins: resolved.resolvePlugins({ schema }),
      }),
    },
  );
  Object.defineProperty(view, 'scrollToSelection', {
    configurable: true,
    value: () => undefined,
  });
  editors.push({ mount, view });
  return { mount, view };
}

function requiredElement<T extends Element>(
  root: ParentNode,
  selector: string,
) {
  const element = root.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Expected ${selector}`);
  }
  return element;
}

describe('frontmatter action widget', () => {
  it('is accessible editor chrome and isolates delete, undo, and reappearance per editor', () => {
    const withoutFrontmatter = createEditor(undefined);
    const first = createEditor('title: first');
    const second = createEditor('title: second');

    expect(
      withoutFrontmatter.mount.querySelectorAll(
        '.prosemirror-frontmatter-actions-widget',
      ),
    ).toHaveLength(0);
    expect(
      first.mount.querySelectorAll('.prosemirror-frontmatter-actions-widget'),
    ).toHaveLength(1);
    expect(
      second.mount.querySelectorAll('.prosemirror-frontmatter-actions-widget'),
    ).toHaveLength(1);

    const widget = requiredElement<HTMLElement>(
      first.mount,
      '.prosemirror-frontmatter-actions-widget',
    );
    const deleteButton = requiredElement<HTMLButtonElement>(
      widget,
      '.prosemirror-block-delete-button',
    );
    expect(widget.dataset.editorChrome).toBe('true');
    expect(widget.contentEditable).toBe('false');
    expect(deleteButton.getAttribute('aria-label')).toBe('Delete frontmatter');
    expect(deleteButton.tabIndex).toBe(0);

    const widgetDesc = (
      widget as HTMLElement & {
        pmViewDesc?: { stopEvent?: (event: Event) => boolean };
      }
    ).pmViewDesc;
    expect(
      widgetDesc?.stopEvent?.(
        new MouseEvent('mousedown', { bubbles: true, cancelable: true }),
      ),
    ).toBe(true);
    expect(
      widgetDesc?.stopEvent?.(
        new KeyboardEvent('keydown', { bubbles: true, cancelable: true }),
      ),
    ).toBe(true);

    const click = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
    });
    deleteButton.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(true);
    expect(first.view.state.doc.firstChild?.type.name).toBe('paragraph');
    expect(first.view.hasFocus()).toBe(true);
    expect(second.view.state.doc.firstChild?.type.name).toBe('frontmatter');
    expect(
      second.mount.querySelectorAll('.prosemirror-frontmatter-actions-widget'),
    ).toHaveLength(1);

    expect(undo(first.view.state, first.view.dispatch)).toBe(true);
    expect(first.view.state.doc.firstChild?.type.name).toBe('frontmatter');
    expect(
      first.mount.querySelectorAll('.prosemirror-frontmatter-actions-widget'),
    ).toHaveLength(1);

    const restoredDelete = requiredElement<HTMLButtonElement>(
      first.mount,
      '.prosemirror-block-delete-button',
    );
    restoredDelete.focus();
    const enter = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: 'Enter',
    });
    restoredDelete.dispatchEvent(enter);
    expect(enter.defaultPrevented).toBe(true);
    expect(first.view.state.doc.firstChild?.type.name).toBe('paragraph');
    expect(first.view.hasFocus()).toBe(true);

    expect(undo(first.view.state, first.view.dispatch)).toBe(true);
    expect(
      first.mount.querySelectorAll('.prosemirror-frontmatter-actions-widget'),
    ).toHaveLength(1);
  });
});
