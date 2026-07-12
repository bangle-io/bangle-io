import { cn } from '@bangle.io/ui-misc';
import type {
  ContextMenuItem,
  ContextMenuOpenContext,
  FileTreeDropContext,
  FileTreeDropResult,
  FileTree as PierreFileTreeModel,
} from '@pierre/trees';
import { FileTree, useFileTree } from '@pierre/trees/react';
import { FilePlus2, FileText, FolderPlus, SquareMinus } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { BANGLE_PIERRE_FILE_TREE_ICONS } from './pierre-file-tree-icons';
import {
  type FileTreeEntry,
  type FileTreeEntryAction,
  normalizePierreDirectoryPath,
  normalizePierreFilePath,
  shouldOpenSelectedFile,
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

function setExpandedDirectories(
  model: PierreFileTreeModel,
  directoryPaths: readonly string[],
  expandedPaths: ReadonlySet<string>,
): void {
  const pathsToExpand = new Set(expandedPaths);
  for (const expandedPath of expandedPaths) {
    let parentPath = getParentDirectory(expandedPath);
    while (parentPath) {
      pathsToExpand.add(parentPath);
      parentPath = getParentDirectory(parentPath);
    }
  }

  // Collapse children before parents, then expand parents before children. This
  // keeps the operation deterministic even when the tree implementation skips
  // rendering descendants of a collapsed directory.
  for (const directoryPath of [...directoryPaths].reverse()) {
    const item = model.getItem(directoryPath);
    if (item && 'collapse' in item && !pathsToExpand.has(directoryPath)) {
      item.collapse();
    }
  }

  for (const directoryPath of directoryPaths) {
    const item = model.getItem(directoryPath);
    if (item && 'expand' in item && pathsToExpand.has(directoryPath)) {
      item.expand();
    }
  }
}

function getExpandedDirectoryPaths(
  model: PierreFileTreeModel,
  directoryPaths: readonly string[],
): string[] {
  return directoryPaths.filter((directoryPath) => {
    const item = model.getItem(directoryPath);
    return item !== null && 'isExpanded' in item && item.isExpanded();
  });
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
  if (event.target.kind === 'root' || !event.target.directoryPath) {
    return undefined;
  }

  const normalizedPath = normalizeInputPath(event.target.directoryPath);
  return normalizedPath
    ? normalizePierreDirectoryPath(normalizedPath)
    : undefined;
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

function toEntryFromPath(
  path: string,
  filePathSet: ReadonlySet<string>,
): FileTreeEntry | undefined {
  const normalizedPath = normalizeInputPath(path);

  if (!normalizedPath) {
    return undefined;
  }

  return filePathSet.has(normalizedPath)
    ? { kind: 'file', path: normalizePierreFilePath(normalizedPath) }
    : { kind: 'directory', path: normalizePierreDirectoryPath(normalizedPath) };
}

function getSelectedEntriesFromMountedTree(
  model: PierreFileTreeModel,
  filePathSet: ReadonlySet<string>,
): readonly FileTreeEntry[] {
  const selectedItems =
    model
      .getFileTreeContainer()
      ?.shadowRoot?.querySelectorAll<HTMLElement>(
        "button[data-type='item'][data-item-selected][data-item-path]",
      ) ?? [];

  return Array.from(selectedItems)
    .map((element) => {
      const path = element.dataset.itemPath;
      if (!path) {
        return undefined;
      }

      if (element.dataset.itemType === 'file') {
        return {
          kind: 'file' as const,
          path: normalizePierreFilePath(path),
        };
      }

      return toEntryFromPath(path, filePathSet);
    })
    .filter((entry): entry is FileTreeEntry => entry !== undefined);
}

function getSelectedEntriesFromModel(
  model: PierreFileTreeModel,
  filePathSet: ReadonlySet<string>,
): readonly FileTreeEntry[] {
  return model
    .getSelectedPaths()
    .map((path) => toEntryFromPath(path, filePathSet))
    .filter((entry): entry is FileTreeEntry => entry !== undefined);
}

function getCurrentSelectedEntries(
  model: PierreFileTreeModel,
  filePathSet: ReadonlySet<string>,
): readonly FileTreeEntry[] {
  const modelSelectedEntries = getSelectedEntriesFromModel(model, filePathSet);
  const mountedSelectedEntries = getSelectedEntriesFromMountedTree(
    model,
    filePathSet,
  );

  return mountedSelectedEntries.length > modelSelectedEntries.length
    ? mountedSelectedEntries
    : modelSelectedEntries;
}

export interface PierreFileTreeProps {
  activePaths?: readonly string[];
  className?: string;
  expandedPaths?: readonly string[];
  filePaths: readonly string[];
  onExpandedPathsChange: (expandedPaths: readonly string[]) => void;
  onCreateDirectory: (pathPrefix: string | undefined) => void;
  onCreateNote: (pathPrefix: string | undefined) => void;
  onMoveFile: (
    sourceRelativePath: string,
    destinationDirectory: string | undefined,
  ) => void;
  onOpenFile: (relativePath: string) => void;
  showNoteFilesOnly: boolean;
  onShowNoteFilesOnlyChange: (showNoteFilesOnly: boolean) => void;
  getActionsForEntry: (
    entry: FileTreeEntry,
    selectedEntries: readonly FileTreeEntry[],
  ) => readonly FileTreeEntryAction[];
}

export function PierreFileTree({
  activePaths = [],
  className,
  expandedPaths,
  filePaths,
  onExpandedPathsChange,
  onCreateDirectory,
  onCreateNote,
  onMoveFile,
  onOpenFile,
  showNoteFilesOnly,
  onShowNoteFilesOnlyChange,
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
  const activeTreePath = activeTreePaths.at(-1);
  const directoryPaths = useMemo(
    () => collectAncestorDirectoryPaths(treePaths),
    [treePaths],
  );
  const activeAncestorPaths = useMemo(
    () => collectAncestorDirectoryPaths(activeTreePath ? [activeTreePath] : []),
    [activeTreePath],
  );
  const directoryPathsRef = useRef(directoryPaths);
  const expandedPathsRef = useRef(expandedPaths);
  const onExpandedPathsChangeRef = useRef(onExpandedPathsChange);
  const suppressExpansionPersistenceRef = useRef(false);
  const lastReportedExpandedPathsSignatureRef = useRef<string | null>(null);
  const filePathSetRef = useRef<ReadonlySet<string>>(filePathSet);
  const modelRef = useRef<PierreFileTreeModel | null>(null);
  const contextMenuSelectedEntriesRef = useRef<readonly FileTreeEntry[]>([]);
  const dragSourcePathRef = useRef<string | null>(null);
  const onOpenFileRef = useRef(onOpenFile);
  const onMoveFileRef = useRef(onMoveFile);
  const pendingUserOpenPathRef = useRef<string | null>(null);
  const selectedPathRef = useRef<string | null>(null);
  const activeSelectedPathRef = useRef<string | null>(null);
  const suppressSelectionOpenRef = useRef(false);
  const suppressSelectionOpenTimerRef = useRef<number | undefined>(undefined);
  const treePathsRef = useRef<readonly string[]>(treePaths);
  const rootElementRef = useRef<HTMLDivElement | null>(null);
  filePathSetRef.current = filePathSet;
  onOpenFileRef.current = onOpenFile;
  onMoveFileRef.current = onMoveFile;
  treePathsRef.current = treePaths;
  directoryPathsRef.current = directoryPaths;
  expandedPathsRef.current = expandedPaths;
  onExpandedPathsChangeRef.current = onExpandedPathsChange;
  // The file the active route points at. Kept current on every render so
  // `onSelectionChange` can tell a genuine user open from a route-driven
  // re-select (see `shouldOpenSelectedFile`).
  activeSelectedPathRef.current = activeTreePath ?? null;

  const reportExpandedPaths = useCallback(
    (
      targetModel: PierreFileTreeModel,
      preserveUnavailablePaths = true,
    ): void => {
      if (suppressExpansionPersistenceRef.current) {
        return;
      }

      const currentDirectoryPaths = directoryPathsRef.current;
      const availableExpandedPaths = getExpandedDirectoryPaths(
        targetModel,
        currentDirectoryPaths,
      );
      const unavailableExpandedPaths = preserveUnavailablePaths
        ? (expandedPathsRef.current ?? []).filter(
            (path) => !currentDirectoryPaths.includes(path),
          )
        : [];
      const nextExpandedPaths = [
        ...availableExpandedPaths,
        ...unavailableExpandedPaths,
      ];
      const signature = nextExpandedPaths.join('\0');
      if (lastReportedExpandedPathsSignatureRef.current === signature) {
        return;
      }

      lastReportedExpandedPathsSignatureRef.current = signature;
      onExpandedPathsChangeRef.current(nextExpandedPaths);
    },
    [],
  );

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

  const resetSelectionOpenSuppression = (): void => {
    suppressSelectionOpenRef.current = false;
    if (suppressSelectionOpenTimerRef.current !== undefined) {
      window.clearTimeout(suppressSelectionOpenTimerRef.current);
      suppressSelectionOpenTimerRef.current = undefined;
    }
  };

  const resetDragAffordance = useCallback((): void => {
    dragSourcePathRef.current = null;
    rootElementRef.current?.removeAttribute('data-root-drop-active');
  }, []);

  const suppressSelectionOpenForDrag = (): void => {
    resetSelectionOpenSuppression();
    suppressSelectionOpenRef.current = true;
    suppressSelectionOpenTimerRef.current = window.setTimeout(() => {
      suppressSelectionOpenRef.current = false;
      suppressSelectionOpenTimerRef.current = undefined;
    }, 1500);
  };

  const canDragFile = (paths: readonly string[]): boolean => {
    const sourcePath = normalizePierreFilePath(paths[0] || '');
    const canDrag =
      paths.length === 1 && filePathSetRef.current.has(sourcePath);
    if (canDrag) {
      dragSourcePathRef.current = sourcePath;
      if (getParentDirectory(sourcePath) !== undefined) {
        rootElementRef.current?.setAttribute('data-root-drop-active', 'true');
      }
      suppressSelectionOpenForDrag();
    }
    return canDrag;
  };

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
    resetSelectionOpenSuppression();
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
        onOpen: () => {
          if (!modelRef.current) {
            contextMenuSelectedEntriesRef.current = [];
            return;
          }

          contextMenuSelectedEntriesRef.current = getCurrentSelectedEntries(
            modelRef.current,
            filePathSetRef.current,
          );
        },
        triggerMode: 'both',
      },
    },
    density: 'default',
    icons: BANGLE_PIERRE_FILE_TREE_ICONS,
    dragAndDrop: {
      canDrag: canDragFile,
      canDrop: canDropFile,
      onDropComplete: handleDropComplete,
      onDropError: (_error, event) => {
        resetSelectionOpenSuppression();
        // Pierre rejects a colliding drop inside its own optimistic store and
        // would otherwise drop the gesture with no feedback. Re-drive the
        // intended move through the durable move command so the owning service
        // reports the conflict (or performs the move) instead of the drop
        // silently vanishing.
        commitDurableDrop(event);
        resetDragAffordance();
        if (modelRef.current) {
          resetModelPathsPreservingExpansion(
            modelRef.current,
            treePathsRef.current,
          );
        }
      },
    },
    flattenEmptyDirectories: true,
    initialExpandedPaths: [
      ...new Set([...(expandedPaths ?? []), ...activeAncestorPaths]),
    ],
    initialExpansion: 'closed',
    onSelectionChange: (selectedPaths) => {
      const selectedPath = selectedPaths.at(-1);
      const normalizedPath = selectedPath
        ? normalizePierreFilePath(selectedPath)
        : undefined;

      const isKnownFilePath = Boolean(
        normalizedPath && filePathSetRef.current.has(normalizedPath),
      );
      if (!normalizedPath || !isKnownFilePath) {
        return;
      }

      if (suppressSelectionOpenRef.current) {
        return;
      }

      // Track the tree's live selection even when we choose not to open, so a
      // later user selection of a different file is still recognised.
      selectedPathRef.current = normalizedPath;

      if (
        !shouldOpenSelectedFile({
          selectedPath: normalizedPath,
          activeRoutePath: activeSelectedPathRef.current,
          isKnownFilePath,
        })
      ) {
        // Route-driven re-select (browser back/forward, links, command
        // navigation). Re-opening here would push a duplicate history entry and
        // wipe the forward stack.
        return;
      }

      pendingUserOpenPathRef.current = normalizedPath;
      onOpenFileRef.current(normalizedPath);
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
    if (treePaths.length === 0) {
      return;
    }

    if (activeTreePath && !filePathSet.has(activeTreePath)) {
      return;
    }

    const nextExpandedPaths = new Set([
      ...(expandedPaths ?? []),
      ...activeAncestorPaths,
    ]);
    suppressExpansionPersistenceRef.current = true;
    try {
      setExpandedDirectories(model, directoryPaths, nextExpandedPaths);
    } finally {
      suppressExpansionPersistenceRef.current = false;
    }
    reportExpandedPaths(model);

    if (!activeTreePath) {
      return;
    }

    const animationFrame = window.requestAnimationFrame(() => {
      model.scrollToPath(activeTreePath, {
        focus: false,
        offset: 'nearest',
      });
    });

    return () => window.cancelAnimationFrame(animationFrame);
  }, [
    activeAncestorPaths,
    activeTreePath,
    directoryPaths,
    expandedPaths,
    filePathSet,
    model,
    reportExpandedPaths,
    treePaths.length,
  ]);

  useEffect(() => {
    const unsubscribe = model.subscribe(() => reportExpandedPaths(model));
    reportExpandedPaths(model);
    return unsubscribe;
  }, [model, reportExpandedPaths]);

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

  useEffect(
    () => () => {
      suppressSelectionOpenRef.current = false;
      if (suppressSelectionOpenTimerRef.current !== undefined) {
        window.clearTimeout(suppressSelectionOpenTimerRef.current);
        suppressSelectionOpenTimerRef.current = undefined;
      }
    },
    [],
  );

  useEffect(() => {
    const handleDragEnd = () => {
      resetDragAffordance();
    };

    window.addEventListener('dragend', handleDragEnd);
    return () => {
      window.removeEventListener('dragend', handleDragEnd);
    };
  }, [resetDragAffordance]);

  const handleRootDrop = (event: React.DragEvent<HTMLButtonElement>): void => {
    const sourcePath = dragSourcePathRef.current;
    if (
      !rootElementRef.current?.hasAttribute('data-root-drop-active') ||
      !sourcePath
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    resetSelectionOpenSuppression();
    resetDragAffordance();

    if (getParentDirectory(sourcePath) !== undefined) {
      onMoveFileRef.current(sourcePath, undefined);
    }
  };

  const handleCollapseAllDirectories = (): void => {
    suppressExpansionPersistenceRef.current = true;
    try {
      setExpandedDirectories(
        model,
        directoryPaths,
        new Set(activeAncestorPaths),
      );
    } finally {
      suppressExpansionPersistenceRef.current = false;
    }
    reportExpandedPaths(model, false);

    if (activeTreePath) {
      window.requestAnimationFrame(() => {
        model.scrollToPath(activeTreePath, {
          focus: false,
          offset: 'nearest',
        });
      });
    }
  };

  return (
    <div
      ref={rootElementRef}
      className={cn(
        'group/root-drop relative flex min-h-0 flex-1 flex-col',
        className,
      )}
      data-testid="bangle-file-explorer"
    >
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="group/files-header flex h-8 shrink-0 items-center gap-1 px-2">
          <span className="min-w-0 flex-1 truncate font-medium text-[11px] text-sidebar-foreground/55 uppercase tracking-wide">
            {t.app.components.appSidebar.filesLabel}
          </span>
          <button
            type="button"
            className="inline-flex size-6 items-center justify-center rounded-sm text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-40"
            aria-label={
              t.app.components.appSidebar.collapseAllFoldersActionTitle
            }
            title={t.app.components.appSidebar.collapseAllFoldersActionTitle}
            disabled={directoryPaths.length === 0}
            onClick={handleCollapseAllDirectories}
          >
            <SquareMinus className="size-3.5" />
          </button>
          <button
            type="button"
            className={cn(
              'inline-flex size-6 items-center justify-center rounded-sm text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
              showNoteFilesOnly &&
                'bg-pop text-pop-foreground shadow-[0_0_0_1px_hsl(var(--BV-pop)_/_0.35),0_0_12px_hsl(var(--BV-pop)_/_0.28)] hover:bg-pop/90 hover:text-pop-foreground',
            )}
            aria-pressed={showNoteFilesOnly}
            aria-label={
              t.app.components.appSidebar.showNoteFilesOnlyActionTitle
            }
            title={t.app.components.appSidebar.showNoteFilesOnlyActionTitle}
            onClick={() => onShowNoteFilesOnlyChange(!showNoteFilesOnly)}
          >
            <FileText className="size-3.5" />
          </button>
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
        <button
          aria-label={t.app.components.appSidebar.moveToWorkspaceRootLabel}
          className="absolute top-1 right-2 left-2 z-30 hidden h-7 shrink-0 items-center justify-center rounded-sm border border-sidebar-border border-dashed bg-sidebar-accent/95 text-[11px] text-sidebar-accent-foreground shadow-xs transition-colors hover:border-sidebar-accent-foreground/60 hover:bg-sidebar-accent group-data-[root-drop-active=true]/root-drop:flex"
          type="button"
          onDragEnter={(event) => {
            event.preventDefault();
          }}
          onDragOver={(event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
          }}
          onDrop={handleRootDrop}
        >
          {t.app.components.appSidebar.moveToWorkspaceRootLabel}
        </button>
        <FileTree
          aria-label={t.app.components.appSidebar.fileTreeLabel}
          className="min-h-0 flex-1 overflow-hidden"
          model={model}
          onClick={() => {
            window.requestAnimationFrame(() => reportExpandedPaths(model));
          }}
          onKeyUp={() => {
            window.requestAnimationFrame(() => reportExpandedPaths(model));
          }}
          renderContextMenu={(item, context) => {
            const entry = toEntry(item);
            const selectedEntries =
              contextMenuSelectedEntriesRef.current.length > 0
                ? contextMenuSelectedEntriesRef.current
                : getCurrentSelectedEntries(model, filePathSetRef.current);
            const entryIsSelected = selectedEntries.some(
              (selectedEntry) =>
                selectedEntry.kind === entry.kind &&
                selectedEntry.path === entry.path,
            );
            const menuSelectedEntries =
              selectedEntries.length > 1 && entryIsSelected
                ? selectedEntries
                : [entry];
            const actions = getActionsForEntry(entry, menuSelectedEntries);

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
                        onClick({
                          entry,
                          selectedEntries: menuSelectedEntries,
                        });
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
