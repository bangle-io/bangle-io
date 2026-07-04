import {
  closeHistory,
  collection,
  dropPoint,
  type EditorView,
  Fragment,
  Plugin,
  PluginKey,
  type PMNode,
  Slice,
  setPriority,
  TextSelection,
  type Transaction,
} from '@bangle.io/prosemirror-plugins';

import type { StoredMarkdownAsset } from './asset-storage';

export type MarkdownAssetReference = {
  href: string;
  label: string;
  isImage: boolean;
};

export type AssetFilePluginConfig = {
  storeFiles: (
    view: EditorView,
    files: readonly File[],
    signal: AbortSignal,
  ) => Promise<StoredMarkdownAsset[]>;
  cleanupStoredFiles?: (assets: readonly StoredMarkdownAsset[]) => void;
  resolveAssetReference?: (
    view: EditorView,
    target: string,
  ) => MarkdownAssetReference | undefined;
};

const PROSEMIRROR_SLICE_TYPE = 'application/x-prosemirror-slice';
const ASSET_FILE_PLUGIN_PRIORITY = 10_000;
const ASSET_FILE_PLUGIN_KEY = new PluginKey<AssetFilePluginState>(
  'asset-file-drop-paste',
);

type AssetFilePluginState = {
  insertions: Map<number, number>;
};

type PendingInsertion = {
  abortController: AbortController;
  view: EditorView;
};

type AssetFilePluginMeta =
  | {
      type: 'add';
      id: number;
      position: number;
    }
  | {
      type: 'remove';
      id: number;
    };

function collectFiles(dataTransfer: DataTransfer): File[] {
  const files: File[] = [];
  const seen = new Set<string>();

  const addFile = (file: File) => {
    const key = `${file.name}\0${file.size}\0${file.type}\0${file.lastModified}`;
    if (seen.has(key)) {
      return;
    }
    files.push(file);
    seen.add(key);
  };

  for (const item of Array.from(dataTransfer.items ?? [])) {
    if (item.kind !== 'file') {
      continue;
    }
    const file = item.getAsFile();
    if (file) {
      addFile(file);
    }
  }

  for (const file of Array.from(dataTransfer.files ?? [])) {
    addFile(file);
  }

  return files;
}

function isInternalProseMirrorDrag(
  view: EditorView,
  dataTransfer: DataTransfer,
): boolean {
  return (
    view.dragging !== null ||
    Array.from(dataTransfer.types ?? []).includes(PROSEMIRROR_SLICE_TYPE)
  );
}

function getPlainText(dataTransfer: DataTransfer): string | undefined {
  if (!Array.from(dataTransfer.types ?? []).includes('text/plain')) {
    return undefined;
  }

  const text = dataTransfer.getData('text/plain').trim();
  if (!text || text.includes('\n') || text.includes('\r')) {
    return undefined;
  }

  return text;
}

function createAssetNodes(
  view: EditorView,
  assets: readonly MarkdownAssetReference[],
): PMNode[] {
  const { schema } = view.state;
  const imageType = schema.nodes.image;
  const linkType = schema.marks.link;
  const nodes: PMNode[] = [];

  for (const asset of assets) {
    if (asset.isImage && imageType) {
      nodes.push(
        imageType.create({
          src: asset.href,
          alt: asset.label,
        }),
      );
      continue;
    }

    if (!linkType) {
      nodes.push(schema.text(asset.label));
      continue;
    }
    nodes.push(
      schema.text(asset.label, [
        linkType.create({
          href: asset.href,
        }),
      ]),
    );
  }

  return nodes;
}

function insertAssetNodes(
  tr: Transaction,
  position: number,
  nodes: readonly PMNode[],
) {
  if (nodes.length === 0) {
    return tr;
  }

  const separatedNodes: PMNode[] = [];
  const hardBreak = tr.doc.type.schema.nodes.hard_break;
  for (const [index, node] of nodes.entries()) {
    if (index > 0 && hardBreak) {
      separatedNodes.push(hardBreak.create());
    }
    separatedNodes.push(node);
  }

  const slice = new Slice(Fragment.fromArray(separatedNodes), 0, 0);
  const insertPosition = dropPoint(tr.doc, position, slice) ?? position;
  const mappedPosition = tr.mapping.map(insertPosition);
  const docBeforeInsert = tr.doc;

  tr.replaceRange(mappedPosition, mappedPosition, slice);

  if (tr.doc.eq(docBeforeInsert)) {
    return tr;
  }

  let selectionPosition = tr.mapping.map(insertPosition);
  tr.mapping.maps.at(-1)?.forEach((_oldStart, _oldEnd, _newStart, newEnd) => {
    selectionPosition = newEnd;
  });

  return tr.setSelection(
    TextSelection.near(tr.doc.resolve(selectionPosition), -1),
  );
}

function replaceRangeWithAssetNodes(
  tr: Transaction,
  from: number,
  to: number,
  nodes: readonly PMNode[],
) {
  if (nodes.length === 0) {
    return tr;
  }

  const separatedNodes: PMNode[] = [];
  const hardBreak = tr.doc.type.schema.nodes.hard_break;
  for (const [index, node] of nodes.entries()) {
    if (index > 0 && hardBreak) {
      separatedNodes.push(hardBreak.create());
    }
    separatedNodes.push(node);
  }

  const slice = new Slice(Fragment.fromArray(separatedNodes), 0, 0);
  const docBeforeInsert = tr.doc;
  tr.replaceRange(from, to, slice);

  if (tr.doc.eq(docBeforeInsert)) {
    return tr;
  }

  let selectionPosition = from;
  tr.mapping.maps.at(-1)?.forEach((_oldStart, _oldEnd, _newStart, newEnd) => {
    selectionPosition = newEnd;
  });

  return tr.setSelection(
    TextSelection.near(tr.doc.resolve(selectionPosition), -1),
  );
}

function insertPlainTextAtPosition(
  view: EditorView,
  position: number,
  text: string,
): { from: number; to: number } | undefined {
  const textNode = view.state.schema.text(text);
  const slice = new Slice(Fragment.from(textNode), 0, 0);
  const insertPosition = dropPoint(view.state.doc, position, slice) ?? position;
  const tr = view.state.tr;
  const mappedPosition = tr.mapping.map(insertPosition);
  const docBeforeInsert = tr.doc;

  tr.replaceRange(mappedPosition, mappedPosition, slice);

  if (tr.doc.eq(docBeforeInsert)) {
    return undefined;
  }

  let from = mappedPosition;
  let to = mappedPosition;
  tr.mapping.maps.at(-1)?.forEach((_oldStart, _oldEnd, newStart, newEnd) => {
    from = newStart;
    to = newEnd;
  });

  view.dispatch(closeHistory(tr));
  return { from, to };
}

function claimFileEvent(event: ClipboardEvent | DragEvent) {
  event.preventDefault();
  event.stopPropagation?.();
  event.stopImmediatePropagation?.();
}

async function storeAndInsertFiles({
  view,
  files,
  insertionId,
  config,
  isViewActive,
  pendingInsertions,
}: {
  view: EditorView;
  files: readonly File[];
  insertionId: number;
  config: AssetFilePluginConfig;
  isViewActive: (view: EditorView) => boolean;
  pendingInsertions: Map<number, PendingInsertion>;
}) {
  try {
    const pending = pendingInsertions.get(insertionId);
    if (!pending) {
      return;
    }

    const assets = await config.storeFiles(
      view,
      files,
      pending.abortController.signal,
    );
    if (!isViewActive(view) || !pendingInsertions.has(insertionId)) {
      pendingInsertions.delete(insertionId);
      config.cleanupStoredFiles?.(assets);
      return;
    }

    const position = ASSET_FILE_PLUGIN_KEY.getState(view.state)?.insertions.get(
      insertionId,
    );
    if (position === undefined) {
      pendingInsertions.delete(insertionId);
      config.cleanupStoredFiles?.(assets);
      return;
    }

    pendingInsertions.delete(insertionId);
    const tr = insertAssetNodes(
      view.state.tr.setMeta(ASSET_FILE_PLUGIN_KEY, {
        type: 'remove',
        id: insertionId,
      } satisfies AssetFilePluginMeta),
      position,
      createAssetNodes(view, assets),
    );
    view.dispatch(tr);
  } catch {
    pendingInsertions.delete(insertionId);
    if (isViewActive(view)) {
      view.dispatch(
        view.state.tr.setMeta(ASSET_FILE_PLUGIN_KEY, {
          type: 'remove',
          id: insertionId,
        } satisfies AssetFilePluginMeta),
      );
    }
  }
}

export function setupAssetFilePlugin(config: AssetFilePluginConfig) {
  let nextInsertionId = 1;
  const destroyedViews = new WeakSet<EditorView>();
  const pendingInsertions = new Map<number, PendingInsertion>();

  function isViewActive(view: EditorView): boolean {
    return !view.isDestroyed && !destroyedViews.has(view);
  }

  function startPendingInsertion(view: EditorView, position: number): number {
    const insertionId = nextInsertionId;
    nextInsertionId += 1;
    pendingInsertions.set(insertionId, {
      abortController: new AbortController(),
      view,
    });
    view.dispatch(
      view.state.tr.setMeta(ASSET_FILE_PLUGIN_KEY, {
        type: 'add',
        id: insertionId,
        position,
      } satisfies AssetFilePluginMeta),
    );
    return insertionId;
  }

  function cancelPendingInsertionsForView(view: EditorView): void {
    for (const [id, pending] of pendingInsertions) {
      if (pending.view !== view) {
        continue;
      }
      pending.abortController.abort();
      pendingInsertions.delete(id);
    }
  }

  function cancelAbandonedInsertionsForView(view: EditorView): void {
    const pluginState = ASSET_FILE_PLUGIN_KEY.getState(view.state);
    for (const [id, pending] of pendingInsertions) {
      if (pending.view !== view) {
        continue;
      }
      if (pluginState?.insertions.has(id)) {
        continue;
      }
      pending.abortController.abort();
      pendingInsertions.delete(id);
    }
  }

  function handleFilesAtPosition(
    view: EditorView,
    files: readonly File[],
    position: number,
  ): boolean {
    if (files.length === 0) {
      return false;
    }

    const insertionId = startPendingInsertion(view, position);
    void storeAndInsertFiles({
      view,
      files,
      insertionId,
      config,
      isViewActive,
      pendingInsertions,
    });
    return true;
  }

  function handleAssetReferenceAtPosition(
    view: EditorView,
    target: string | undefined,
    position: number,
  ): boolean {
    if (!target) {
      return false;
    }

    const asset = config.resolveAssetReference?.(view, target);
    if (!asset) {
      return false;
    }

    const inserted = insertPlainTextAtPosition(view, position, target);
    if (!inserted) {
      return false;
    }

    const tr = replaceRangeWithAssetNodes(
      view.state.tr,
      inserted.from,
      inserted.to,
      createAssetNodes(view, [asset]),
    );
    view.dispatch(closeHistory(tr));
    return true;
  }

  return collection({
    id: 'asset-file-plugin',
    plugin: {
      handleDropPasteFiles: () =>
        setPriority(
          new Plugin({
            key: ASSET_FILE_PLUGIN_KEY,
            state: {
              init: (): AssetFilePluginState => ({
                insertions: new Map(),
              }),
              apply(tr, value): AssetFilePluginState {
                const insertions = new Map<number, number>();
                for (const [id, position] of value.insertions) {
                  const mapped = tr.mapping.mapResult(position, 1);
                  if (!mapped.deletedAcross) {
                    insertions.set(id, mapped.pos);
                  }
                }

                const meta = tr.getMeta(ASSET_FILE_PLUGIN_KEY) as
                  | AssetFilePluginMeta
                  | undefined;
                if (meta?.type === 'add') {
                  insertions.set(meta.id, meta.position);
                }
                if (meta?.type === 'remove') {
                  insertions.delete(meta.id);
                }

                return { insertions };
              },
            },
            view(view) {
              return {
                update(view) {
                  cancelAbandonedInsertionsForView(view);
                },
                destroy() {
                  destroyedViews.add(view);
                  cancelPendingInsertionsForView(view);
                },
              };
            },
            props: {
              handleDOMEvents: {
                drop(view, rawEvent) {
                  const event = rawEvent as DragEvent;
                  const dataTransfer = event.dataTransfer;
                  if (
                    !dataTransfer ||
                    isInternalProseMirrorDrag(view, dataTransfer)
                  ) {
                    return false;
                  }

                  const files = collectFiles(dataTransfer);
                  if (files.length === 0) {
                    const coordinates = view.posAtCoords({
                      left: event.clientX,
                      top: event.clientY,
                    });
                    const handled = handleAssetReferenceAtPosition(
                      view,
                      getPlainText(dataTransfer),
                      coordinates?.pos ?? view.state.selection.from,
                    );
                    if (handled) {
                      claimFileEvent(event);
                    }
                    return handled;
                  }

                  claimFileEvent(event);
                  const coordinates = view.posAtCoords({
                    left: event.clientX,
                    top: event.clientY,
                  });
                  handleFilesAtPosition(
                    view,
                    files,
                    coordinates?.pos ?? view.state.selection.from,
                  );
                  return true;
                },
              },
              handlePaste(view, rawEvent) {
                const event = rawEvent as ClipboardEvent;
                const clipboardData = event.clipboardData;
                if (!clipboardData) {
                  return false;
                }

                const files = collectFiles(clipboardData);
                if (files.length === 0) {
                  const handled = handleAssetReferenceAtPosition(
                    view,
                    getPlainText(clipboardData),
                    view.state.selection.from,
                  );
                  if (handled) {
                    claimFileEvent(event);
                  }
                  return handled;
                }

                claimFileEvent(event);
                handleFilesAtPosition(view, files, view.state.selection.from);
                return true;
              },
            },
          }),
          ASSET_FILE_PLUGIN_PRIORITY,
        ),
    },
  });
}
