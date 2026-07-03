// @vitest-environment jsdom

import {
  DecorationSet,
  type EditorView,
  type PMNode,
} from '@bangle.io/prosemirror-plugins';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createLocalImageNodeView } from '../local-image-node-view';

const originalCreateObjectUrl = URL.createObjectURL;
const originalRevokeObjectUrl = URL.revokeObjectURL;
const imageType = { name: 'image' };

function imageNode(src: string): PMNode {
  return {
    attrs: { src, alt: 'Alt text', title: null },
    type: imageType,
  } as unknown as PMNode;
}

function view(): EditorView {
  return { isDestroyed: false } as EditorView;
}

function createNodeView({
  src,
  readFile,
  editorView = view(),
}: {
  src: string;
  readFile: (wsPath: string) => Promise<File | undefined>;
  editorView?: EditorView;
}) {
  const nodeViewConstructor = createLocalImageNodeView({
    currentWsPath: 'workspace:notes/current.md',
    fileSystem: { readFile },
  });
  return nodeViewConstructor(
    imageNode(src),
    editorView,
    () => 0,
    [],
    DecorationSet.empty,
  );
}

afterEach(() => {
  URL.createObjectURL = originalCreateObjectUrl;
  URL.revokeObjectURL = originalRevokeObjectUrl;
});

describe('createLocalImageNodeView', () => {
  it('reads local image assets into object URLs and revokes them on destroy', async () => {
    URL.createObjectURL = vi.fn(() => 'blob:local-image');
    URL.revokeObjectURL = vi.fn();
    const file = new File(['image'], 'image.png', { type: 'image/png' });
    const readFile = vi.fn().mockResolvedValue(file);
    const nodeView = createNodeView({ src: 'assets/image.png', readFile });

    await vi.waitFor(() => {
      expect(nodeView.dom.getAttribute('src')).toBe('blob:local-image');
    });

    expect(readFile).toHaveBeenCalledWith('workspace:notes/assets/image.png');
    nodeView.destroy?.();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:local-image');
  });

  it('marks unreadable local images as broken without mutating the document', async () => {
    URL.createObjectURL = vi.fn();
    URL.revokeObjectURL = vi.fn();
    const nodeView = createNodeView({
      src: '../missing.png',
      readFile: vi.fn().mockResolvedValue(undefined),
    });

    await vi.waitFor(() => {
      expect(nodeView.dom.classList.contains('bangle-local-image-broken')).toBe(
        true,
      );
    });

    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('ignores stale local reads after the node updates to a direct image URL', async () => {
    URL.createObjectURL = vi.fn(() => 'blob:stale-local-image');
    URL.revokeObjectURL = vi.fn();
    let resolveRead: (file: File) => void = () => {};
    const readFile = vi.fn(
      () =>
        new Promise<File>((resolve) => {
          resolveRead = resolve;
        }),
    );
    const nodeView = createNodeView({
      src: 'assets/image.png',
      readFile,
    });

    nodeView.update?.(
      imageNode('https://example.com/image.png'),
      [],
      DecorationSet.empty,
    );
    resolveRead(new File(['image'], 'image.png', { type: 'image/png' }));

    await Promise.resolve();
    await Promise.resolve();

    expect(nodeView.dom.getAttribute('src')).toBe(
      'https://example.com/image.png',
    );
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('ignores local reads that resolve after destroy', async () => {
    URL.createObjectURL = vi.fn(() => 'blob:destroyed-local-image');
    URL.revokeObjectURL = vi.fn();
    const editorView = view();
    let resolveRead: (file: File) => void = () => {};
    const readFile = vi.fn(
      () =>
        new Promise<File>((resolve) => {
          resolveRead = resolve;
        }),
    );
    const nodeView = createNodeView({
      src: 'assets/image.png',
      readFile,
      editorView,
    });

    nodeView.destroy?.();
    resolveRead(new File(['image'], 'image.png', { type: 'image/png' }));

    await Promise.resolve();
    await Promise.resolve();

    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });
});
