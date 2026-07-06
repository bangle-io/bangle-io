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
import type { StoredMarkdownAsset } from '@bangle.io/service-core';

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
  insertions: Map<number, { from: number; to: number }>;
};

type PendingInsertion = {
  abortController: AbortController;
  view: EditorView;
};

type AssetFilePluginMeta =
  | {
      type: 'add';
      id: number;
      range: { from: number; to: number };
    }
  | {
      type: 'remove';
      id: number;
    };

function collectFiles(dataTransfer: DataTransfer): File[] {
  // `dataTransfer.items` (file entries) and `dataTransfer.files` are two
  // overlapping views of the *same* pasted/dropped payload, not two disjoint
  // sets. Merging them duplicated content: browsers materialize a distinct
  // `File` object for each view, and those objects can carry different
  // `lastModified` timestamps (stamped at slightly different sub-millisecond
  // moments), so any name/size/type/lastModified de-duplication is unreliable
  // and intermittently let the same image through twice — producing a second
  // image node. Read a single authoritative source instead, never a union.
  //
  // Prefer the typed `items` list; fall back to `files` when `items` yields no
  // file entries (older browsers and some clipboard paths only populate one).
  // Both should enumerate the same files, so pick whichever is more complete
  // rather than combining them.
  const fromItems: File[] = [];
  for (const item of Array.from(dataTransfer.items ?? [])) {
    if (item.kind !== 'file') {
      continue;
    }
    const file = item.getAsFile();
    if (file) {
      fromItems.push(file);
    }
  }

  const fromFiles = Array.from(dataTransfer.files ?? []);

  return fromItems.length >= fromFiles.length ? fromItems : fromFiles;
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

function insertOrReplaceRangeWithAssetNodes(
  tr: Transaction,
  range: { from: number; to: number },
  nodes: readonly PMNode[],
) {
  if (range.from === range.to) {
    return insertAssetNodes(tr, range.from, nodes);
  }
  return replaceRangeWithAssetNodes(tr, range.from, range.to, nodes);
}

function mapPendingRange(
  tr: Transaction,
  range: { from: number; to: number },
): { from: number; to: number } | undefined {
  if (range.from === range.to) {
    const mapped = tr.mapping.mapResult(range.from, 1);
    return mapped.deletedAcross
      ? undefined
      : { from: mapped.pos, to: mapped.pos };
  }

  let from = range.from;
  let to = range.to;
  for (const map of tr.mapping.maps) {
    let touched = false;
    map.forEach((oldStart, oldEnd) => {
      const insertionInsideRange =
        oldStart === oldEnd && oldStart > from && oldStart < to;
      const replacementOverlapsRange = oldStart < to && oldEnd > from;
      if (insertionInsideRange || replacementOverlapsRange) {
        touched = true;
      }
    });
    if (touched) {
      return undefined;
    }

    const mappedFrom = map.mapResult(from, 1);
    const mappedTo = map.mapResult(to, -1);
    if (mappedFrom.deletedAcross || mappedTo.deletedAcross) {
      return undefined;
    }
    from = mappedFrom.pos;
    to = mappedTo.pos;
    if (from > to) {
      return undefined;
    }
  }

  return { from, to };
}

function insertPlainTextAtRange(
  view: EditorView,
  range: { from: number; to: number },
  text: string,
): { from: number; to: number } | undefined {
  const textNode = view.state.schema.text(text);
  const slice = new Slice(Fragment.from(textNode), 0, 0);
  const insertPosition =
    range.from === range.to
      ? (dropPoint(view.state.doc, range.from, slice) ?? range.from)
      : range.from;
  const tr = view.state.tr;
  const mappedPosition = tr.mapping.map(insertPosition);
  const docBeforeInsert = tr.doc;

  tr.replaceRange(mappedPosition, tr.mapping.map(range.to), slice);

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

    const range = ASSET_FILE_PLUGIN_KEY.getState(view.state)?.insertions.get(
      insertionId,
    );
    if (!range) {
      pendingInsertions.delete(insertionId);
      config.cleanupStoredFiles?.(assets);
      return;
    }

    pendingInsertions.delete(insertionId);
    const tr = insertOrReplaceRangeWithAssetNodes(
      view.state.tr.setMeta(ASSET_FILE_PLUGIN_KEY, {
        type: 'remove',
        id: insertionId,
      } satisfies AssetFilePluginMeta),
      range,
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

  function startPendingInsertion(
    view: EditorView,
    range: { from: number; to: number },
  ): number {
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
        range,
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

  function handleFilesAtRange(
    view: EditorView,
    files: readonly File[],
    range: { from: number; to: number },
  ): boolean {
    if (files.length === 0) {
      return false;
    }

    const insertionId = startPendingInsertion(view, range);
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
    range: { from: number; to: number },
  ): boolean {
    if (!target) {
      return false;
    }

    const asset = config.resolveAssetReference?.(view, target);
    if (!asset) {
      return false;
    }

    const inserted = insertPlainTextAtRange(view, range, target);
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
                const insertions = new Map<
                  number,
                  { from: number; to: number }
                >();
                for (const [id, range] of value.insertions) {
                  const mapped = mapPendingRange(tr, range);
                  if (mapped) {
                    insertions.set(id, mapped);
                  }
                }

                const meta = tr.getMeta(ASSET_FILE_PLUGIN_KEY) as
                  | AssetFilePluginMeta
                  | undefined;
                if (meta?.type === 'add') {
                  insertions.set(meta.id, meta.range);
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
                      {
                        from: coordinates?.pos ?? view.state.selection.from,
                        to: coordinates?.pos ?? view.state.selection.from,
                      },
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
                  const position =
                    coordinates?.pos ?? view.state.selection.from;
                  handleFilesAtRange(view, files, {
                    from: position,
                    to: position,
                  });
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
                    {
                      from: view.state.selection.from,
                      to: view.state.selection.to,
                    },
                  );
                  if (handled) {
                    claimFileEvent(event);
                  }
                  return handled;
                }

                claimFileEvent(event);
                handleFilesAtRange(view, files, {
                  from: view.state.selection.from,
                  to: view.state.selection.to,
                });
                return true;
              },
            },
          }),
          ASSET_FILE_PLUGIN_PRIORITY,
        ),
    },
  });
}
