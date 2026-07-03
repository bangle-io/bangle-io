import {
  collection,
  type EditorView,
  Fragment,
  Plugin,
  PluginKey,
  type PMNode,
  safeInsert,
  setPriority,
  type Transaction,
} from '@bangle.io/prosemirror-plugins';

import type { StoredMarkdownAsset } from './asset-storage';

export type AssetFilePluginConfig = {
  storeFiles: (
    view: EditorView,
    files: readonly File[],
  ) => Promise<StoredMarkdownAsset[]>;
};

const PROSEMIRROR_SLICE_TYPE = 'application/x-prosemirror-slice';
const ASSET_FILE_PLUGIN_PRIORITY = 10_000;
const ASSET_FILE_PLUGIN_KEY = new PluginKey<AssetFilePluginState>(
  'asset-file-drop-paste',
);

type AssetFilePluginState = {
  insertions: Map<number, number>;
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
  const seen = new Set<File>();

  for (const item of Array.from(dataTransfer.items ?? [])) {
    if (item.kind !== 'file') {
      continue;
    }
    const file = item.getAsFile();
    if (file && !seen.has(file)) {
      files.push(file);
      seen.add(file);
    }
  }

  for (const file of Array.from(dataTransfer.files ?? [])) {
    if (!seen.has(file)) {
      files.push(file);
      seen.add(file);
    }
  }

  return files;
}

function isInternalProseMirrorDrag(dataTransfer: DataTransfer): boolean {
  return Array.from(dataTransfer.types ?? []).includes(PROSEMIRROR_SLICE_TYPE);
}

function createAssetNodes(
  view: EditorView,
  assets: readonly StoredMarkdownAsset[],
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

  return safeInsert(Fragment.fromArray(separatedNodes), position)(tr);
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
}: {
  view: EditorView;
  files: readonly File[];
  insertionId: number;
  config: AssetFilePluginConfig;
  isViewActive: (view: EditorView) => boolean;
}) {
  try {
    const assets = await config.storeFiles(view, files);
    if (!isViewActive(view)) {
      return;
    }

    const position = ASSET_FILE_PLUGIN_KEY.getState(view.state)?.insertions.get(
      insertionId,
    );
    if (position === undefined) {
      return;
    }

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

  function isViewActive(view: EditorView): boolean {
    return !view.isDestroyed && !destroyedViews.has(view);
  }

  function startPendingInsertion(view: EditorView, position: number): number {
    const insertionId = nextInsertionId;
    nextInsertionId += 1;
    view.dispatch(
      view.state.tr.setMeta(ASSET_FILE_PLUGIN_KEY, {
        type: 'add',
        id: insertionId,
        position,
      } satisfies AssetFilePluginMeta),
    );
    return insertionId;
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
    });
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
                destroy() {
                  destroyedViews.add(view);
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
                    isInternalProseMirrorDrag(dataTransfer)
                  ) {
                    return false;
                  }

                  const files = collectFiles(dataTransfer);
                  if (files.length === 0) {
                    return false;
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
                  return false;
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
