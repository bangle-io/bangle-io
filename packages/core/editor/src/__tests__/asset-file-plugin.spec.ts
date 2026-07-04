// @vitest-environment jsdom

import {
  EditorState,
  EditorView,
  Slice,
  schema,
  TextSelection,
} from '@bangle.io/prosemirror-plugins';
import { WsFilePath } from '@bangle.io/ws-path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { setupAssetFilePlugin } from '../asset-file-plugin';
import type { StoredMarkdownAsset } from '../asset-storage';

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
  storeFiles,
}: {
  storeFiles: (
    view: EditorView,
    files: readonly File[],
  ) => Promise<StoredMarkdownAsset[]>;
}) {
  const pluginFactory = setupAssetFilePlugin({ storeFiles }).plugin
    ?.handleDropPasteFiles;
  if (!pluginFactory) {
    throw new Error('Expected asset file plugin factory');
  }

  const doc = schema.nodes.doc.create(null, [
    schema.nodes.paragraph.create(null, schema.text('Hello ')),
  ]);
  const state = EditorState.create({
    doc,
    selection: TextSelection.create(doc, doc.content.size - 1),
    plugins: [pluginFactory()],
  });
  const mount = document.createElement('div');
  document.body.append(mount);
  const view = new EditorView({ mount }, { state });
  return { view, mount };
}

function dispatchPaste(view: EditorView, file: File) {
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
    },
  } as unknown as ClipboardEvent;

  return view.someProp('handlePaste', (handler) =>
    handler(view, event, Slice.empty),
  );
}

function dispatchDrop(view: EditorView, file: File, position: number) {
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
      types: ['Files'],
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

  it('does not dispatch delayed asset insertion after the view is destroyed', async () => {
    const stored = deferred<StoredMarkdownAsset[]>();
    const storeFiles = vi.fn(() => stored.promise);
    const { view } = createView({ storeFiles });

    expect(
      dispatchPaste(
        view,
        new File(['%PDF-1.4\n'], 'Doc.pdf', { type: 'application/pdf' }),
      ),
    ).toBe(true);
    view.destroy();

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

    await Promise.resolve();
    await Promise.resolve();

    expect(view.state.doc.textContent).toBe('Hello ');
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
});
