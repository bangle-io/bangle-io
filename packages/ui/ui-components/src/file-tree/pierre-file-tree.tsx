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
import {
  type FileTreeEntry,
  type FileTreeEntryAction,
  normalizePierreDirectoryPath,
  normalizePierreFilePath,
} from './types';

const TREE_UNSAFE_CSS = `
  :host {
    --trees-bg-override: transparent;
    --trees-fg-override: var(--sidebar-foreground);
    --trees-selected-bg-override: var(--sidebar-accent);
    --trees-hover-bg-override: color-mix(in srgb, var(--sidebar-accent) 72%, transparent);
    --trees-border-color-override: var(--sidebar-border);
    --trees-font-family-override: var(--font-sans);
    --trees-font-size-override: 12px;
    line-height: 1.25;
  }

  button[data-type='item'] {
    border-radius: 4px;
    min-height: 23px;
    transition:
      background-color 120ms ease,
      color 120ms ease;
  }

  button[data-type='item'][data-item-selected] {
    font-weight: 600;
    box-shadow: inset 2px 0 0 var(--sidebar-primary);
  }

  button[data-type='item'][data-item-type='file'] > [data-item-section='icon'] {
    display: none;
  }

  [data-type='context-menu-anchor'] {
    z-index: 40;
  }
`;

const MAX_VISIBLE_TREE_ROWS = 14;
const MIN_TREE_ROWS = 1;
const CONTEXT_MENU_WIDTH = 176;
const CONTEXT_MENU_VIEWPORT_MARGIN = 8;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function getTreeRowCount(paths: readonly string[]): number {
  const directoryPaths = new Set<string>();

  for (const path of paths) {
    const segments = normalizeInputPath(path).split('/').filter(Boolean);
    let directoryPath = '';

    for (const segment of segments.slice(0, -1)) {
      directoryPath = directoryPath ? `${directoryPath}/${segment}` : segment;
      directoryPaths.add(directoryPath);
    }
  }

  return paths.length + directoryPaths.size;
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
  isTruncated?: boolean;
  onCreateDirectory: (pathPrefix: string | undefined) => void;
  onCreateNote: (pathPrefix: string | undefined) => void;
  onMoveFile: (
    sourceRelativePath: string,
    destinationDirectory: string | undefined,
  ) => void;
  onOpenFile: (relativePath: string) => void;
  onShowMore: () => void;
  getActionsForEntry: (entry: FileTreeEntry) => readonly FileTreeEntryAction[];
}

export function PierreFileTree({
  activePaths = [],
  className,
  filePaths,
  isTruncated = false,
  onCreateDirectory,
  onCreateNote,
  onMoveFile,
  onOpenFile,
  onShowMore,
  getActionsForEntry,
}: PierreFileTreeProps) {
  const filePathSet = useMemo(
    () => new Set(filePaths.map((path) => normalizeInputPath(path))),
    [filePaths],
  );
  const treePaths = useMemo(
    () =>
      [...filePathSet].sort((left, right) =>
        left.localeCompare(right, undefined, { sensitivity: 'base' }),
      ),
    [filePathSet],
  );
  const activeTreePaths = useMemo(
    () => activePaths.map((path) => normalizeInputPath(path)),
    [activePaths],
  );
  const fileCount = filePathSet.size;
  const visibleRowCount = Math.min(
    Math.max(getTreeRowCount(treePaths), MIN_TREE_ROWS),
    MAX_VISIBLE_TREE_ROWS,
  );
  const filePathSetRef = useRef<ReadonlySet<string>>(filePathSet);
  const modelRef = useRef<PierreFileTreeModel | null>(null);
  const onOpenFileRef = useRef(onOpenFile);
  const onMoveFileRef = useRef(onMoveFile);
  const selectedPathRef = useRef<string | null>(null);
  const treePathsRef = useRef<readonly string[]>(treePaths);
  filePathSetRef.current = filePathSet;
  onOpenFileRef.current = onOpenFile;
  onMoveFileRef.current = onMoveFile;
  treePathsRef.current = treePaths;

  const canDropFile = (event: FileTreeDropContext): boolean => {
    if (event.draggedPaths.length !== 1) {
      return false;
    }

    const sourcePath = normalizePierreFilePath(event.draggedPaths[0] || '');
    if (!filePathSetRef.current.has(sourcePath)) {
      return false;
    }

    const destinationDirectory = getDropDestinationDirectory(event);
    return (
      (destinationDirectory ?? '') !== (getParentDirectory(sourcePath) ?? '')
    );
  };

  const commitDurableDrop = (
    event: FileTreeDropContext | FileTreeDropResult,
  ): boolean => {
    const sourcePath = normalizePierreFilePath(event.draggedPaths[0] || '');

    if (
      event.draggedPaths.length !== 1 ||
      !filePathSetRef.current.has(sourcePath)
    ) {
      return false;
    }

    const destinationDirectory = getDropDestinationDirectory(event);

    if (
      (destinationDirectory ?? '') === (getParentDirectory(sourcePath) ?? '')
    ) {
      return false;
    }

    onMoveFileRef.current(sourcePath, destinationDirectory);
    return true;
  };

  const handleDropComplete = (event: FileTreeDropResult): void => {
    commitDurableDrop(event);
    modelRef.current?.resetPaths(treePathsRef.current);
  };

  const { model } = useFileTree({
    composition: {
      contextMenu: {
        buttonVisibility: 'when-needed',
        enabled: true,
        triggerMode: 'both',
      },
    },
    density: 'compact',
    dragAndDrop: {
      canDrag: (paths) =>
        paths.length === 1 &&
        filePathSetRef.current.has(normalizePierreFilePath(paths[0] || '')),
      canDrop: canDropFile,
      onDropComplete: handleDropComplete,
      onDropError: () => {
        modelRef.current?.resetPaths(treePathsRef.current);
      },
    },
    flattenEmptyDirectories: true,
    initialVisibleRowCount: visibleRowCount,
    initialExpansion: 1,
    onSelectionChange: (selectedPaths) => {
      const selectedPath = selectedPaths.at(-1);
      const normalizedPath = selectedPath
        ? normalizePierreFilePath(selectedPath)
        : undefined;

      if (normalizedPath && filePathSetRef.current.has(normalizedPath)) {
        onOpenFileRef.current(normalizedPath);
      }
    },
    paths: treePaths,
    search: false,
    unsafeCSS: TREE_UNSAFE_CSS,
  });
  modelRef.current = model;

  useEffect(() => {
    model.resetPaths(treePaths);
  }, [model, treePaths]);

  useEffect(() => {
    const nextSelectedPath = activeTreePaths.at(-1) ?? null;
    if (selectedPathRef.current === nextSelectedPath) {
      return;
    }

    const previousSelectedPath = selectedPathRef.current;
    selectedPathRef.current = nextSelectedPath;

    if (previousSelectedPath) {
      model.getItem(previousSelectedPath)?.deselect();
    }

    if (nextSelectedPath) {
      model.getItem(nextSelectedPath)?.select();
      model.scrollToPath(nextSelectedPath, { focus: false, offset: 'nearest' });
    }
  }, [activeTreePaths, model]);

  return (
    <div
      className={cn('flex min-h-0 flex-col', className)}
      data-testid="bangle-file-explorer"
    >
      <div className="relative flex min-h-0 flex-col overflow-visible">
        <div className="flex h-8 shrink-0 items-center gap-1 border-sidebar-border/70 border-b px-1.5">
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold text-[11px] text-sidebar-foreground uppercase">
              {t.app.components.appSidebar.filesLabel}
            </div>
            <div className="truncate text-[10px] text-sidebar-foreground/55">
              {t.app.components.appSidebar.noteCount({ count: fileCount })}
            </div>
          </div>
          <button
            type="button"
            className="inline-flex size-6 items-center justify-center rounded-sm text-sidebar-foreground/65 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            aria-label={t.app.components.appSidebar.newFileActionTitle}
            title={t.app.components.appSidebar.newFileActionTitle}
            onClick={() => onCreateNote(undefined)}
          >
            <FilePlus2 className="size-3.5" />
          </button>
          <button
            type="button"
            className="inline-flex size-6 items-center justify-center rounded-sm text-sidebar-foreground/65 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            aria-label={t.app.components.appSidebar.newFolderActionTitle}
            title={t.app.components.appSidebar.newFolderActionTitle}
            onClick={() => onCreateDirectory(undefined)}
          >
            <FolderPlus className="size-3.5" />
          </button>
        </div>
        <FileTree
          aria-label={t.app.components.appSidebar.fileTreeLabel}
          className="min-h-0 overflow-hidden pr-1 pl-0.5"
          model={model}
          style={{
            height: `${visibleRowCount * model.getItemHeight()}px`,
          }}
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
        {isTruncated && (
          <div className="border-sidebar-border/70 border-t p-1.5">
            <button
              type="button"
              className="w-full rounded-sm px-2 py-1.5 text-left text-sidebar-foreground/75 text-xs transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              onClick={onShowMore}
            >
              {t.app.components.appSidebar.showMoreButton}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
