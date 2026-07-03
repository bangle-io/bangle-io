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
});
