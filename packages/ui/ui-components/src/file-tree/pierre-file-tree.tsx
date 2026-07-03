import { cn } from '@bangle.io/shadcn';
import type {
  ContextMenuItem,
  ContextMenuOpenContext,
  FileTreeDropContext,
  FileTreeDropResult,
  FileTree as PierreFileTreeModel,
} from '@pierre/trees';
import { FileTree, useFileTree } from '@pierre/trees/react';
import { FilePlus2, FolderPlus } from 'lucide-react';
import React, { useEffect, useMemo, useRef } from 'react';
import { BANGLE_PIERRE_FILE_TREE_ICONS } from './pierre-file-tree-icons';
import {
  type FileTreeEntry,
  type FileTreeEntryAction,
  normalizePierreDirectoryPath,
  normalizePierreFilePath,
} from './types';

// Tune the Pierre tree to read like the rest of the sidebar (the previous file
// tree): comfortable full-width rows with an icon + name, rounded hover/selected
// pills, and breathing room on the left instead of a cramped, edge-hugging list.
const TREE_UNSAFE_CSS = `
  :host {
    --trees-bg-override: transparent;
    --trees-fg-override: var(--sidebar-foreground);
    --trees-fg-muted-override: color-mix(in srgb, var(--sidebar-foreground) 55%, transparent);
    --trees-selected-bg-override: var(--sidebar-accent);
    --trees-selected-fg-override: var(--sidebar-accent-foreground);
    --trees-border-color-override: var(--sidebar-border);
    --trees-font-family-override: var(--font-sans);
    --trees-font-size-override: 13px;
    --trees-icon-width-override: 14px;
    --trees-border-radius-override: 6px;
    line-height: 1.3;
  }

  button[data-type='item'] {
    transition:
      background-color 120ms ease,
      color 120ms ease;
  }

  button[data-type='item'][data-item-selected] {
    font-weight: 600;
  }

  button[data-type='item'][data-item-type='file'] > [data-item-section='icon'] {
    display: none;
  }

  [data-icon-name='file-tree-icon-chevron'] {
    width: 12px;
    height: 12px;
    opacity: 0.7;
  }

  [data-type='context-menu-anchor'] {
    z-index: 40;
  }
`;

const CONTEXT_MENU_WIDTH = 176;
const CONTEXT_MENU_VIEWPORT_MARGIN = 8;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function getContextMenuStyle(
  context: ContextMenuOpenContext,
  actionCount: number,
): React.CSSProperties {
  if (typeof window === 'undefined') {
    return {};
  }

  const { anchorRect } = context;
  const estimatedMenuHeight = 42 + actionCount * 30;
  const maxLeft = Math.max(
    CONTEXT_MENU_VIEWPORT_MARGIN,
    window.innerWidth - CONTEXT_MENU_WIDTH - CONTEXT_MENU_VIEWPORT_MARGIN,
  );
  const maxTop = Math.max(
    CONTEXT_MENU_VIEWPORT_MARGIN,
    window.innerHeight - estimatedMenuHeight - CONTEXT_MENU_VIEWPORT_MARGIN,
  );
  // The menu is triggered two ways. The three-dot "Options" button anchors a
  // real rect (width > 0) at the row's right edge, so open left to keep the menu
  // on-screen. A right-click anchors a zero-width point at the cursor, so open
  // right from there unless that would overflow the viewport.
  const shouldOpenLeft =
    anchorRect.width > 0 ||
    anchorRect.right + CONTEXT_MENU_WIDTH + CONTEXT_MENU_VIEWPORT_MARGIN >
      window.innerWidth;
  const preferredLeft = shouldOpenLeft
    ? anchorRect.left - CONTEXT_MENU_WIDTH
    : anchorRect.right;

  return {
    left: clamp(preferredLeft, CONTEXT_MENU_VIEWPORT_MARGIN, maxLeft),
    position: 'fixed',
    top: clamp(anchorRect.top, CONTEXT_MENU_VIEWPORT_MARGIN, maxTop),
    width: CONTEXT_MENU_WIDTH,
  };
}

function basename(path: string): string {
  const normalized = normalizePierreDirectoryPath(path);
  const slashIndex = normalized.lastIndexOf('/');
  return slashIndex === -1 ? normalized : normalized.slice(slashIndex + 1);
}

function normalizeInputPath(path: string): string {
  return path.replace(/^\/+/, '').replace(/\/+$/, '');
}

function getParentDirectory(path: string): string | undefined {
  const slashIndex = path.lastIndexOf('/');
  if (slashIndex < 0) {
    return undefined;
  }

  return normalizePierreDirectoryPath(path.slice(0, slashIndex));
}

// Every ancestor directory id implied by a set of file paths. Directories are
// implicit in Bangle (they exist only through contained notes), so the tree's
// directory ids are the prefix paths of its files, e.g. `a/b/c.md` implies the
// directories `a` and `a/b`.
function collectAncestorDirectoryPaths(paths: readonly string[]): string[] {
  const directories = new Set<string>();

  for (const path of paths) {
    const segments = normalizeInputPath(path).split('/');
    segments.pop();

    let accumulated = '';
    for (const segment of segments) {
      accumulated = accumulated ? `${accumulated}/${segment}` : segment;
      directories.add(accumulated);
    }
  }

  return [...directories];
}

// `resetPaths` re-seeds expansion from the tree's `initialExpansion` unless it
// is told otherwise, so a bare reset collapses every folder the user opened.
// Because Bangle drives the tree imperatively from Jotai state, any note
// create/move/rename/delete triggers a reset — capture the currently expanded
// directories first and hand them back so expansion survives the update.
function resetModelPathsPreservingExpansion(
  model: PierreFileTreeModel,
  nextPaths: readonly string[],
): void {
  const initialExpandedPaths = collectAncestorDirectoryPaths(nextPaths).filter(
    (directoryPath) => {
      const item = model.getItem(directoryPath);
      return item !== null && 'isExpanded' in item && item.isExpanded();
    },
  );

  model.resetPaths(nextPaths, { initialExpandedPaths });
}

function getDropDestinationDirectory(
  event: FileTreeDropContext | FileTreeDropResult,
): string | undefined {
  return event.target.kind === 'root' || !event.target.directoryPath
    ? undefined
    : normalizePierreDirectoryPath(event.target.directoryPath);
}

function toEntry(item: ContextMenuItem): FileTreeEntry {
  return {
    kind: item.kind,
    path:
      item.kind === 'directory'
        ? normalizePierreDirectoryPath(item.path)
        : normalizePierreFilePath(item.path),
  };
}

export interface PierreFileTreeProps {
  activePaths?: readonly string[];
  className?: string;
  filePaths: readonly string[];
  onCreateDirectory: (pathPrefix: string | undefined) => void;
  onCreateNote: (pathPrefix: string | undefined) => void;
  onMoveFile: (
    sourceRelativePath: string,
    destinationDirectory: string | undefined,
  ) => void;
  onOpenFile: (relativePath: string) => void;
  getActionsForEntry: (entry: FileTreeEntry) => readonly FileTreeEntryAction[];
}

export function PierreFileTree({
  activePaths = [],
  className,
  filePaths,
  onCreateDirectory,
  onCreateNote,
  onMoveFile,
  onOpenFile,
  getActionsForEntry,
}: PierreFileTreeProps) {
  const rawTreePaths = useMemo(
    () =>
      [...new Set(filePaths.map((path) => normalizeInputPath(path)))].sort(
        (left, right) =>
          left.localeCompare(right, undefined, { sensitivity: 'base' }),
      ),
    [filePaths],
  );
  const treePathSignature = rawTreePaths.join('\0');
  const stableTreePathsRef = useRef<{
    paths: readonly string[];
    signature: string;
  } | null>(null);

  if (stableTreePathsRef.current?.signature !== treePathSignature) {
    stableTreePathsRef.current = {
      paths: rawTreePaths,
      signature: treePathSignature,
    };
  }

  const treePaths = stableTreePathsRef.current?.paths ?? rawTreePaths;
  const filePathSet = useMemo(() => new Set(treePaths), [treePaths]);
  const activeTreePaths = useMemo(
    () => activePaths.map((path) => normalizeInputPath(path)),
    [activePaths],
  );
  const filePathSetRef = useRef<ReadonlySet<string>>(filePathSet);
  const modelRef = useRef<PierreFileTreeModel | null>(null);
  const onOpenFileRef = useRef(onOpenFile);
  const onMoveFileRef = useRef(onMoveFile);
  const pendingUserOpenPathRef = useRef<string | null>(null);
  const selectedPathRef = useRef<string | null>(null);
  const treePathsRef = useRef<readonly string[]>(treePaths);
  filePathSetRef.current = filePathSet;
  onOpenFileRef.current = onOpenFile;
  onMoveFileRef.current = onMoveFile;
  treePathsRef.current = treePaths;

  // Single source of truth for "is this drop a real move?": exactly one dragged
  // file we know about, landing in a directory other than its current parent.
  // Returns the resolved move, or null when the drop should be ignored.
  const resolveDropMove = (
    event: FileTreeDropContext | FileTreeDropResult,
  ): {
    sourcePath: string;
    destinationDirectory: string | undefined;
  } | null => {
    if (event.draggedPaths.length !== 1) {
      return null;
    }

    const sourcePath = normalizePierreFilePath(event.draggedPaths[0] || '');
    if (!filePathSetRef.current.has(sourcePath)) {
      return null;
    }

    const destinationDirectory = getDropDestinationDirectory(event);
    if (
      (destinationDirectory ?? '') === (getParentDirectory(sourcePath) ?? '')
    ) {
      return null;
    }

    return { destinationDirectory, sourcePath };
  };

  const canDropFile = (event: FileTreeDropContext): boolean =>
    resolveDropMove(event) !== null;

  const commitDurableDrop = (
    event: FileTreeDropContext | FileTreeDropResult,
  ): boolean => {
    const move = resolveDropMove(event);
    if (!move) {
      return false;
    }

    onMoveFileRef.current(move.sourcePath, move.destinationDirectory);
    return true;
  };

  const handleDropComplete = (event: FileTreeDropResult): void => {
    commitDurableDrop(event);
    if (modelRef.current) {
      resetModelPathsPreservingExpansion(
        modelRef.current,
        treePathsRef.current,
      );
    }
  };

  const { model } = useFileTree({
    composition: {
      contextMenu: {
        buttonVisibility: 'when-needed',
        enabled: true,
        triggerMode: 'both',
      },
    },
    density: 'default',
    icons: BANGLE_PIERRE_FILE_TREE_ICONS,
    dragAndDrop: {
      canDrag: (paths) =>
        paths.length === 1 &&
        filePathSetRef.current.has(normalizePierreFilePath(paths[0] || '')),
      canDrop: canDropFile,
      onDropComplete: handleDropComplete,
      onDropError: () => {
        if (modelRef.current) {
          resetModelPathsPreservingExpansion(
            modelRef.current,
            treePathsRef.current,
          );
        }
      },
    },
    flattenEmptyDirectories: true,
    initialExpansion: 1,
    onSelectionChange: (selectedPaths) => {
      const selectedPath = selectedPaths.at(-1);
      const normalizedPath = selectedPath
        ? normalizePierreFilePath(selectedPath)
        : undefined;

      if (normalizedPath && filePathSetRef.current.has(normalizedPath)) {
        pendingUserOpenPathRef.current = normalizedPath;
        onOpenFileRef.current(normalizedPath);
      }
    },
    paths: treePaths,
    search: false,
    unsafeCSS: TREE_UNSAFE_CSS,
  });
  modelRef.current = model;

  useEffect(() => {
    resetModelPathsPreservingExpansion(model, treePaths);
  }, [model, treePaths]);

  useEffect(() => {
    const nextSelectedPath = activeTreePaths.at(-1) ?? null;
    const shouldPreserveScroll =
      pendingUserOpenPathRef.current === nextSelectedPath;

    if (selectedPathRef.current === nextSelectedPath) {
      if (shouldPreserveScroll) {
        pendingUserOpenPathRef.current = null;
      }
      return;
    }

    const previousSelectedPath = selectedPathRef.current;
    selectedPathRef.current = nextSelectedPath;

    if (previousSelectedPath) {
      model.getItem(previousSelectedPath)?.deselect();
    }

    if (nextSelectedPath) {
      model.getItem(nextSelectedPath)?.select();
      if (shouldPreserveScroll) {
        pendingUserOpenPathRef.current = null;
      } else {
        model.scrollToPath(nextSelectedPath, {
          focus: false,
          offset: 'nearest',
        });
      }
    }
  }, [activeTreePaths, model]);

  return (
    <div
      className={cn('flex min-h-0 flex-1 flex-col', className)}
      data-testid="bangle-file-explorer"
    >
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="group/files-header flex h-8 shrink-0 items-center gap-1 px-2">
          <span className="min-w-0 flex-1 truncate font-medium text-[11px] text-sidebar-foreground/55 uppercase tracking-wide">
            {t.app.components.appSidebar.filesLabel}
          </span>
          <button
            type="button"
            className="inline-flex size-6 items-center justify-center rounded-sm text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            aria-label={t.app.components.appSidebar.newFileActionTitle}
            title={t.app.components.appSidebar.newFileActionTitle}
            onClick={() => onCreateNote(undefined)}
          >
            <FilePlus2 className="size-3.5" />
          </button>
          <button
            type="button"
            className="inline-flex size-6 items-center justify-center rounded-sm text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            aria-label={t.app.components.appSidebar.newFolderActionTitle}
            title={t.app.components.appSidebar.newFolderActionTitle}
            onClick={() => onCreateDirectory(undefined)}
          >
            <FolderPlus className="size-3.5" />
          </button>
        </div>
        <FileTree
          aria-label={t.app.components.appSidebar.fileTreeLabel}
          className="min-h-0 flex-1 overflow-hidden"
          model={model}
          renderContextMenu={(item, context) => {
            const entry = toEntry(item);
            const actions = getActionsForEntry(entry);

            if (actions.length === 0) {
              return null;
            }

            return (
              <div
                className="z-50 overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-lg"
                data-file-tree-context-menu-root="true"
                style={getContextMenuStyle(context, actions.length)}
              >
                <div className="border-border/60 border-b px-2 py-1.5 font-medium text-muted-foreground text-xs">
                  <span className="block truncate">{basename(entry.path)}</span>
                </div>
                {actions.map(
                  ({ disabled, Icon, id, label, onClick, variant }) => (
                    <button
                      key={id}
                      type="button"
                      className={cn(
                        'mt-0.5 flex h-7 w-full items-center gap-2 rounded-sm px-2 text-left text-xs outline-none transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50',
                        variant === 'destructive' && 'text-destructive',
                      )}
                      disabled={disabled}
                      onClick={() => {
                        context.close({ restoreFocus: false });
                        onClick(entry);
                      }}
                    >
                      {Icon && <Icon className="size-4" />}
                      <span className="truncate">{label}</span>
                    </button>
                  ),
                )}
              </div>
            );
          }}
        />
      </div>
    </div>
  );
}
