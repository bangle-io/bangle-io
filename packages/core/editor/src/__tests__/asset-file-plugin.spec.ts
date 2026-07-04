// @vitest-environment jsdom

import {
  EditorState,
  EditorView,
  history,
  Slice,
  schema,
  TextSelection,
  undo,
} from '@bangle.io/prosemirror-plugins';
import type { StoredMarkdownAsset } from '@bangle.io/service-core';
import { WsFilePath } from '@bangle.io/ws-path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  type MarkdownAssetReference,
  setupAssetFilePlugin,
} from '../asset-file-plugin';

function deferred<T>() {
  let resolve: (value: T) => void = () => {};
  let reject: (error: unknown) => void = () => {};
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function createView({
  cleanupStoredFiles,
  docText = 'Hello ',
  resolveAssetReference,
  selection,
  storeFiles,
}: {
  cleanupStoredFiles?: (assets: readonly StoredMarkdownAsset[]) => void;
  docText?: string;
  resolveAssetReference?: (
    view: EditorView,
    target: string,
  ) => MarkdownAssetReference | undefined;
  selection?: { from: number; to: number };
  storeFiles: (
    view: EditorView,
    files: readonly File[],
    signal: AbortSignal,
  ) => Promise<StoredMarkdownAsset[]>;
}) {
  const pluginFactory = setupAssetFilePlugin({
    cleanupStoredFiles,
    resolveAssetReference,
    storeFiles,
  }).plugin?.handleDropPasteFiles;
  if (!pluginFactory) {
    throw new Error('Expected asset file plugin factory');
  }

  const doc = schema.nodes.doc.create(null, [
    schema.nodes.paragraph.create(null, schema.text(docText)),
  ]);
  const state = EditorState.create({
    doc,
    selection: selection
      ? TextSelection.create(doc, selection.from, selection.to)
      : TextSelection.create(doc, doc.content.size - 1),
    plugins: [history(), pluginFactory()],
  });
  const mount = document.createElement('div');
  document.body.append(mount);
  const view = new EditorView({ mount }, { state });
  return { view, mount };
}

function dispatchPaste(view: EditorView, file: File, text?: string) {
  const event = {
    preventDefault: vi.fn(),
    clipboardData: {
      items: [
        {
          kind: 'file',
          getAsFile: () => file,
        },
      ],
      files: [file],
      types: text ? ['Files', 'text/plain'] : ['Files'],
      getData: (type: string) => (type === 'text/plain' ? text : ''),
    },
  } as unknown as ClipboardEvent;

  return view.someProp('handlePaste', (handler) =>
    handler(view, event, Slice.empty),
  );
}

function dispatchPasteText(view: EditorView, text: string) {
  const event = {
    preventDefault: vi.fn(),
    clipboardData: {
      items: [],
      files: [],
      types: ['text/plain'],
      getData: (type: string) => (type === 'text/plain' ? text : ''),
    },
  } as unknown as ClipboardEvent;

  return view.someProp('handlePaste', (handler) =>
    handler(view, event, Slice.empty),
  );
}

function dispatchDrop(
  view: EditorView,
  file: File,
  position: number,
  text?: string,
) {
  view.posAtCoords = vi.fn(() => ({ pos: position, inside: -1 }));
  const event = {
    clientX: 10,
    clientY: 10,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    stopImmediatePropagation: vi.fn(),
    dataTransfer: {
      items: [
        {
          kind: 'file',
          getAsFile: () => file,
        },
      ],
      files: [file],
      types: text ? ['Files', 'text/plain'] : ['Files'],
      getData: (type: string) => (type === 'text/plain' ? text : ''),
    },
  } as unknown as DragEvent;

  return view.someProp('handleDOMEvents', (handlers) =>
    handlers.drop?.(view, event),
  );
}

function dispatchDropText(view: EditorView, text: string, position: number) {
  view.posAtCoords = vi.fn(() => ({ pos: position, inside: -1 }));
  const event = {
    clientX: 10,
    clientY: 10,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    stopImmediatePropagation: vi.fn(),
    dataTransfer: {
      items: [],
      files: [],
      types: ['text/plain'],
      getData: (type: string) => (type === 'text/plain' ? text : ''),
    },
  } as unknown as DragEvent;

  return view.someProp('handleDOMEvents', (handlers) =>
    handlers.drop?.(view, event),
  );
}

afterEach(() => {
  document.body.replaceChildren();
});

describe('setupAssetFilePlugin', () => {
  it('maps delayed asset insertion through edits made while storage is pending', async () => {
    const stored = deferred<StoredMarkdownAsset[]>();
    const storeFiles = vi.fn(() => stored.promise);
    const { view } = createView({ storeFiles });

    expect(
      dispatchPaste(
        view,
        new File(['%PDF-1.4\n'], 'Doc.pdf', { type: 'application/pdf' }),
      ),
    ).toBe(true);

    view.dispatch(view.state.tr.insertText('typed '));
    stored.resolve([
      {
        file: new File(['%PDF-1.4\n'], 'Doc.pdf', {
          type: 'application/pdf',
        }),
        wsPath: WsFilePath.fromString('workspace:notes/assets/doc.pdf'),
        href: 'assets/doc.pdf',
        label: 'Doc.pdf',
        isImage: false,
      },
    ]);

    await vi.waitFor(() => {
      expect(view.state.doc.textContent).toBe('Hello typed Doc.pdf');
    });
    view.destroy();
  });

  it('replaces the selected range when pasting an asset file', async () => {
    const stored = deferred<StoredMarkdownAsset[]>();
    const storeFiles = vi.fn(() => stored.promise);
    const { view } = createView({
      docText: 'Hello replace-me',
      selection: { from: 7, to: 17 },
      storeFiles,
    });

    expect(
      dispatchPaste(
        view,
        new File(['%PDF-1.4\n'], 'Doc.pdf', { type: 'application/pdf' }),
      ),
    ).toBe(true);
    expect(view.state.doc.textContent).toBe('Hello replace-me');
    stored.resolve([
      {
        file: new File(['%PDF-1.4\n'], 'Doc.pdf', {
          type: 'application/pdf',
        }),
        wsPath: WsFilePath.fromString('workspace:notes/assets/doc.pdf'),
        href: 'assets/doc.pdf',
        label: 'Doc.pdf',
        isImage: false,
      },
    ]);

    await vi.waitFor(() => {
      expect(view.state.doc.textContent).toBe('Hello Doc.pdf');
    });
    view.destroy();
  });

  it('keeps selected text when pasted asset storage stores no files', async () => {
    const stored = deferred<StoredMarkdownAsset[]>();
    const storeFiles = vi.fn(() => stored.promise);
    const { view } = createView({
      docText: 'Hello replace-me',
      selection: { from: 7, to: 17 },
      storeFiles,
    });

    expect(
      dispatchPaste(
        view,
        new File(['%PDF-1.4\n'], 'Too-large.pdf', {
          type: 'application/pdf',
        }),
      ),
    ).toBe(true);
    expect(view.state.doc.textContent).toBe('Hello replace-me');

    stored.resolve([]);

    await vi.waitFor(() => {
      expect(view.state.doc.textContent).toBe('Hello replace-me');
    });
    view.destroy();
  });

  it('cancels selected-range asset insertion when the range changes before storage completes', async () => {
    const stored = deferred<StoredMarkdownAsset[]>();
    let signal: AbortSignal | undefined;
    const storeFiles = vi.fn(
      (
        _view: EditorView,
        _files: readonly File[],
        abortSignal: AbortSignal,
      ) => {
        signal = abortSignal;
        return stored.promise;
      },
    );
    const cleanupStoredFiles = vi.fn();
    const { view } = createView({
      cleanupStoredFiles,
      docText: 'Hello replace-me',
      selection: { from: 7, to: 17 },
      storeFiles,
    });

    expect(
      dispatchPaste(
        view,
        new File(['%PDF-1.4\n'], 'Doc.pdf', { type: 'application/pdf' }),
      ),
    ).toBe(true);
    view.dispatch(view.state.tr.insertText('typed'));
    expect(signal?.aborted).toBe(true);

    const storedAssets = [
      {
        file: new File(['%PDF-1.4\n'], 'Doc.pdf', {
          type: 'application/pdf',
        }),
        wsPath: WsFilePath.fromString('workspace:notes/assets/doc.pdf'),
        href: 'assets/doc.pdf',
        label: 'Doc.pdf',
        isImage: false,
      },
    ];
    stored.resolve(storedAssets);

    await vi.waitFor(() => {
      expect(cleanupStoredFiles).toHaveBeenCalledWith(storedAssets);
    });
    expect(view.state.doc.textContent).toBe('Hello typed');
    view.destroy();
  });

  it('does not dispatch delayed asset insertion after the view is destroyed', async () => {
    const stored = deferred<StoredMarkdownAsset[]>();
    let signal: AbortSignal | undefined;
    const storeFiles = vi.fn(
      (
        _view: EditorView,
        _files: readonly File[],
        abortSignal: AbortSignal,
      ) => {
        signal = abortSignal;
        return stored.promise;
      },
    );
    const cleanupStoredFiles = vi.fn();
    const { view } = createView({ cleanupStoredFiles, storeFiles });

    expect(
      dispatchPaste(
        view,
        new File(['%PDF-1.4\n'], 'Doc.pdf', { type: 'application/pdf' }),
      ),
    ).toBe(true);
    expect(signal?.aborted).toBe(false);
    view.destroy();
    expect(signal?.aborted).toBe(true);

    const storedAssets = [
      {
        file: new File(['%PDF-1.4\n'], 'Doc.pdf', {
          type: 'application/pdf',
        }),
        wsPath: WsFilePath.fromString('workspace:notes/assets/doc.pdf'),
        href: 'assets/doc.pdf',
        label: 'Doc.pdf',
        isImage: false,
      },
    ];
    stored.resolve(storedAssets);

    await vi.waitFor(() => {
      expect(cleanupStoredFiles).toHaveBeenCalledWith(storedAssets);
    });

    expect(view.state.doc.textContent).toBe('Hello ');
  });

  it('aborts and cleans up delayed asset insertion when the tracked position is deleted', async () => {
    const stored = deferred<StoredMarkdownAsset[]>();
    let signal: AbortSignal | undefined;
    const storeFiles = vi.fn(
      (
        _view: EditorView,
        _files: readonly File[],
        abortSignal: AbortSignal,
      ) => {
        signal = abortSignal;
        return stored.promise;
      },
    );
    const cleanupStoredFiles = vi.fn();
    const { view } = createView({ cleanupStoredFiles, storeFiles });

    expect(
      dispatchPaste(
        view,
        new File(['%PDF-1.4\n'], 'Doc.pdf', { type: 'application/pdf' }),
      ),
    ).toBe(true);
    expect(signal?.aborted).toBe(false);

    view.dispatch(view.state.tr.delete(0, view.state.doc.content.size));
    expect(signal?.aborted).toBe(true);

    const storedAssets = [
      {
        file: new File(['%PDF-1.4\n'], 'Doc.pdf', {
          type: 'application/pdf',
        }),
        wsPath: WsFilePath.fromString('workspace:notes/assets/doc.pdf'),
        href: 'assets/doc.pdf',
        label: 'Doc.pdf',
        isImage: false,
      },
    ];
    stored.resolve(storedAssets);

    await vi.waitFor(() => {
      expect(cleanupStoredFiles).toHaveBeenCalledWith(storedAssets);
    });
    expect(view.state.doc.textContent).not.toContain('Doc.pdf');
    view.destroy();
  });

  it('deduplicates the same pasted file reported through items and files', async () => {
    const stored = deferred<StoredMarkdownAsset[]>();
    const storeFiles = vi.fn(() => stored.promise);
    const { view } = createView({ storeFiles });
    const fileFromItem = new File(['image'], 'Photo.png', {
      type: 'image/png',
    });
    const fileFromFiles = new File(['image'], 'Photo.png', {
      type: 'image/png',
    });
    const event = {
      preventDefault: vi.fn(),
      clipboardData: {
        items: [
          {
            kind: 'file',
            getAsFile: () => fileFromItem,
          },
        ],
        files: [fileFromFiles],
        types: ['Files'],
        getData: () => '',
      },
    } as unknown as ClipboardEvent;

    expect(
      view.someProp('handlePaste', (handler) =>
        handler(view, event, Slice.empty),
      ),
    ).toBe(true);
    expect(storeFiles).toHaveBeenCalledWith(
      view,
      [fileFromItem],
      expect.any(AbortSignal),
    );

    stored.resolve([]);
    await vi.waitFor(() => {
      expect(view.state.doc.textContent).toBe('Hello ');
    });
    view.destroy();
  });

  it('inserts a dropped image at a document-boundary drop position', async () => {
    const stored = deferred<StoredMarkdownAsset[]>();
    const storeFiles = vi.fn(() => stored.promise);
    const { view } = createView({ storeFiles });

    expect(
      dispatchDrop(
        view,
        new File(['image'], 'Photo.jpg', { type: 'image/jpeg' }),
        0,
      ),
    ).toBe(true);

    stored.resolve([
      {
        file: new File(['image'], 'Photo.jpg', { type: 'image/jpeg' }),
        wsPath: WsFilePath.fromString('workspace:notes/assets/photo.jpg'),
        href: 'assets/photo.jpg',
        label: 'Photo.jpg',
        isImage: true,
      },
    ]);

    await vi.waitFor(() => {
      const firstNode = view.state.doc.firstChild?.firstChild;
      expect(firstNode?.type.name).toBe('image');
      expect(firstNode?.attrs).toMatchObject({
        src: 'assets/photo.jpg',
        alt: 'Photo.jpg',
      });
    });
    view.destroy();
  });

  it('inserts a dropped non-image asset as a link at a document-boundary drop position', async () => {
    const stored = deferred<StoredMarkdownAsset[]>();
    const storeFiles = vi.fn(() => stored.promise);
    const { view } = createView({ storeFiles });

    expect(
      dispatchDrop(
        view,
        new File(['%PDF-1.4\n'], 'Doc.pdf', { type: 'application/pdf' }),
        0,
      ),
    ).toBe(true);

    stored.resolve([
      {
        file: new File(['%PDF-1.4\n'], 'Doc.pdf', {
          type: 'application/pdf',
        }),
        wsPath: WsFilePath.fromString('workspace:notes/assets/doc.pdf'),
        href: 'assets/doc.pdf',
        label: 'Doc.pdf',
        isImage: false,
      },
    ]);

    await vi.waitFor(() => {
      const firstNode = view.state.doc.firstChild?.firstChild;
      expect(firstNode?.text).toBe('Doc.pdf');
      expect(firstNode?.marks[0]?.type.name).toBe('link');
      expect(firstNode?.marks[0]?.attrs.href).toBe('assets/doc.pdf');
    });
    view.destroy();
  });

  it('stores pasted files before considering plain-text asset references', async () => {
    const stored = deferred<StoredMarkdownAsset[]>();
    const storeFiles = vi.fn(() => stored.promise);
    const resolveAssetReference = vi.fn(
      (): MarkdownAssetReference | undefined => ({
        href: 'assets/existing.png',
        label: 'existing.png',
        isImage: true,
      }),
    );
    const { view } = createView({ resolveAssetReference, storeFiles });

    expect(
      dispatchPaste(
        view,
        new File(['image'], 'External.png', { type: 'image/png' }),
        'assets/existing.png',
      ),
    ).toBe(true);
    expect(resolveAssetReference).not.toHaveBeenCalled();

    stored.resolve([
      {
        file: new File(['image'], 'External.png', { type: 'image/png' }),
        wsPath: WsFilePath.fromString('workspace:notes/assets/external.png'),
        href: 'assets/external.png',
        label: 'External.png',
        isImage: true,
      },
    ]);

    await vi.waitFor(() => {
      const imageNode = view.state.doc.firstChild?.child(1);
      expect(imageNode?.type.name).toBe('image');
      expect(imageNode?.attrs).toMatchObject({
        src: 'assets/external.png',
        alt: 'External.png',
      });
    });
    view.destroy();
  });

  it('stores dropped files before considering plain-text asset references', async () => {
    const stored = deferred<StoredMarkdownAsset[]>();
    const storeFiles = vi.fn(() => stored.promise);
    const resolveAssetReference = vi.fn(
      (): MarkdownAssetReference | undefined => ({
        href: 'assets/existing.png',
        label: 'existing.png',
        isImage: true,
      }),
    );
    const { view } = createView({ resolveAssetReference, storeFiles });

    expect(
      dispatchDrop(
        view,
        new File(['%PDF-1.4\n'], 'External.pdf', {
          type: 'application/pdf',
        }),
        0,
        'assets/existing.png',
      ),
    ).toBe(true);
    expect(resolveAssetReference).not.toHaveBeenCalled();

    stored.resolve([
      {
        file: new File(['%PDF-1.4\n'], 'External.pdf', {
          type: 'application/pdf',
        }),
        wsPath: WsFilePath.fromString('workspace:notes/assets/external.pdf'),
        href: 'assets/external.pdf',
        label: 'External.pdf',
        isImage: false,
      },
    ]);

    await vi.waitFor(() => {
      const linkedText = view.state.doc.firstChild?.firstChild;
      expect(linkedText?.text).toBe('External.pdf');
      expect(linkedText?.marks[0]?.type.name).toBe('link');
      expect(linkedText?.marks[0]?.attrs.href).toBe('assets/external.pdf');
    });
    view.destroy();
  });

  it('pastes a resolved embeddable asset path as an image', () => {
    const storeFiles = vi.fn(async () => []);
    const resolveAssetReference = vi.fn(
      (
        _view: EditorView,
        target: string,
      ): MarkdownAssetReference | undefined =>
        target === 'assets/photo.png'
          ? {
              href: 'assets/photo.png',
              label: 'photo.png',
              isImage: true,
            }
          : undefined,
    );
    const { view } = createView({ resolveAssetReference, storeFiles });

    expect(dispatchPasteText(view, 'assets/photo.png')).toBe(true);

    const imageNode = view.state.doc.firstChild?.child(1);
    expect(imageNode?.type.name).toBe('image');
    expect(imageNode?.attrs).toMatchObject({
      src: 'assets/photo.png',
      alt: 'photo.png',
    });
    expect(storeFiles).not.toHaveBeenCalled();

    expect(undo(view.state, view.dispatch)).toBe(true);
    expect(view.state.doc.textContent).toBe('Hello assets/photo.png');
    view.destroy();
  });

  it('pastes a resolved non-embeddable workspace path as a link', () => {
    const storeFiles = vi.fn(async () => []);
    const resolveAssetReference = vi.fn(
      (
        _view: EditorView,
        target: string,
      ): MarkdownAssetReference | undefined =>
        target === 'assets/report.pdf'
          ? {
              href: 'assets/report.pdf',
              label: 'report.pdf',
              isImage: false,
            }
          : undefined,
    );
    const { view } = createView({ resolveAssetReference, storeFiles });

    expect(dispatchPasteText(view, 'assets/report.pdf')).toBe(true);

    const linkedText = view.state.doc.firstChild?.child(1);
    expect(linkedText?.text).toBe('report.pdf');
    expect(linkedText?.marks[0]?.type.name).toBe('link');
    expect(linkedText?.marks[0]?.attrs.href).toBe('assets/report.pdf');

    expect(undo(view.state, view.dispatch)).toBe(true);
    expect(view.state.doc.textContent).toBe('Hello assets/report.pdf');
    view.destroy();
  });

  it('replaces selected text when pasting a resolved workspace asset path', () => {
    const storeFiles = vi.fn(async () => []);
    const resolveAssetReference = vi.fn(
      (
        _view: EditorView,
        target: string,
      ): MarkdownAssetReference | undefined =>
        target === 'assets/report.pdf'
          ? {
              href: 'assets/report.pdf',
              label: 'report.pdf',
              isImage: false,
            }
          : undefined,
    );
    const { view } = createView({
      docText: 'Hello replace-me',
      resolveAssetReference,
      selection: { from: 7, to: 17 },
      storeFiles,
    });

    expect(dispatchPasteText(view, 'assets/report.pdf')).toBe(true);

    expect(view.state.doc.textContent).toBe('Hello report.pdf');
    const linkedText = view.state.doc.firstChild?.child(1);
    expect(linkedText?.text).toBe('report.pdf');
    expect(linkedText?.marks[0]?.type.name).toBe('link');
    expect(linkedText?.marks[0]?.attrs.href).toBe('assets/report.pdf');
    expect(storeFiles).not.toHaveBeenCalled();
    view.destroy();
  });

  it('drops a resolved embeddable asset path at the drop position', () => {
    const storeFiles = vi.fn(async () => []);
    const resolveAssetReference = vi.fn(
      (
        _view: EditorView,
        target: string,
      ): MarkdownAssetReference | undefined =>
        target === 'assets/photo.png'
          ? {
              href: 'assets/photo.png',
              label: 'photo.png',
              isImage: true,
            }
          : undefined,
    );
    const { view } = createView({ resolveAssetReference, storeFiles });

    expect(dispatchDropText(view, 'assets/photo.png', 0)).toBe(true);

    const imageNode = view.state.doc.firstChild?.firstChild;
    expect(imageNode?.type.name).toBe('image');
    expect(imageNode?.attrs.src).toBe('assets/photo.png');
    expect(storeFiles).not.toHaveBeenCalled();

    expect(undo(view.state, view.dispatch)).toBe(true);
    expect(view.state.doc.textContent.startsWith('assets/photo.png')).toBe(
      true,
    );
    view.destroy();
  });

  it('ignores internal ProseMirror text drops before resolving asset references', () => {
    const storeFiles = vi.fn(async () => []);
    const resolveAssetReference = vi.fn(
      (): MarkdownAssetReference | undefined => ({
        href: 'assets/photo.png',
        label: 'photo.png',
        isImage: true,
      }),
    );
    const { view } = createView({ resolveAssetReference, storeFiles });
    view.dragging = { slice: Slice.empty, move: true };

    expect(dispatchDropText(view, 'assets/photo.png', 0)).toBeFalsy();
    expect(resolveAssetReference).not.toHaveBeenCalled();
    expect(view.state.doc.textContent).toBe('Hello ');

    view.dragging = null;
    view.destroy();
  });

  it('ignores pasted unresolved asset paths', () => {
    const storeFiles = vi.fn(async () => []);
    const resolveAssetReference = vi.fn(() => undefined);
    const { view } = createView({ resolveAssetReference, storeFiles });

    expect(dispatchPasteText(view, 'assets/missing.png')).toBeFalsy();
    expect(view.state.doc.textContent).toBe('Hello ');
    view.destroy();
  });
});
