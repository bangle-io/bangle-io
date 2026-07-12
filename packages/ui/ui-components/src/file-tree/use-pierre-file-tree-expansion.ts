import type { FileTree as PierreFileTreeModel } from '@pierre/trees';
import { useCallback, useEffect, useEffectEvent, useMemo, useRef } from 'react';

function normalizePath(path: string): string {
  return path.replace(/^\/+/, '').replace(/\/+$/, '');
}

export function collectPierreDirectoryPaths(
  paths: readonly string[],
): string[] {
  const directories = new Set<string>();

  for (const path of paths) {
    const segments = normalizePath(path).split('/');
    segments.pop();

    let accumulated = '';
    for (const segment of segments) {
      accumulated = accumulated ? `${accumulated}/${segment}` : segment;
      directories.add(accumulated);
    }
  }

  return [...directories];
}

function readExpandedPaths(
  model: PierreFileTreeModel,
  directoryPaths: readonly string[],
): ReadonlySet<string> {
  return new Set(
    directoryPaths.filter((path) => {
      const item = model.getItem(path);
      return item !== null && 'isExpanded' in item && item.isExpanded();
    }),
  );
}

function setsEqual(left: ReadonlySet<string>, right: ReadonlySet<string>) {
  return left.size === right.size && [...left].every((path) => right.has(path));
}

export function usePierreFileTreeExpansion({
  model,
  treePaths,
  directoryPaths,
  expandedPaths,
  activeAncestorPaths,
  onDirectoryExpansionChange,
  onRevealPaths,
  onCollapseAll,
}: {
  model: PierreFileTreeModel;
  treePaths: readonly string[];
  directoryPaths: readonly string[];
  expandedPaths: readonly string[];
  activeAncestorPaths: readonly string[];
  onDirectoryExpansionChange: (path: string, expanded: boolean) => void;
  onRevealPaths: (paths: readonly string[]) => void;
  onCollapseAll: (keepExpandedPaths: readonly string[]) => void;
}) {
  const projectedExpandedPaths = useMemo(
    () => [...new Set([...expandedPaths, ...activeAncestorPaths])],
    [activeAncestorPaths, expandedPaths],
  );
  // Jotai owns durable expansion intent; Pierre is its imperative projection.
  // Controlled projections must never return through the subscription as user
  // expansion deltas.
  const isProjectingRef = useRef(false);
  const previousExpandedPathsRef = useRef<ReadonlySet<string>>(new Set());

  const projectWithoutReporting = useCallback(
    (apply: () => void) => {
      isProjectingRef.current = true;
      try {
        apply();
      } finally {
        previousExpandedPathsRef.current = readExpandedPaths(
          model,
          directoryPaths,
        );
        isProjectingRef.current = false;
      }
    },
    [directoryPaths, model],
  );

  const applyExpandedPaths = useCallback(
    (paths: readonly string[]) => {
      const nextExpandedPaths = new Set(paths);
      projectWithoutReporting(() => {
        for (const path of [...directoryPaths].reverse()) {
          const item = model.getItem(path);
          if (
            item !== null &&
            'isExpanded' in item &&
            item.isExpanded() &&
            !nextExpandedPaths.has(path)
          ) {
            item.collapse();
          }
        }
        for (const path of directoryPaths) {
          const item = model.getItem(path);
          if (
            item !== null &&
            'isExpanded' in item &&
            !item.isExpanded() &&
            nextExpandedPaths.has(path)
          ) {
            item.expand();
          }
        }
      });
    },
    [directoryPaths, model, projectWithoutReporting],
  );

  const resetModelPaths = useEffectEvent((nextTreePaths: readonly string[]) => {
    projectWithoutReporting(() => {
      model.resetPaths(nextTreePaths, {
        initialExpandedPaths: projectedExpandedPaths,
      });
    });
  });

  useEffect(() => {
    resetModelPaths(treePaths);
  }, [treePaths]);

  useEffect(() => {
    applyExpandedPaths(projectedExpandedPaths);
  }, [applyExpandedPaths, projectedExpandedPaths]);

  useEffect(() => {
    previousExpandedPathsRef.current = readExpandedPaths(model, directoryPaths);

    return model.subscribe(() => {
      if (isProjectingRef.current) {
        return;
      }

      const previous = previousExpandedPathsRef.current;
      const current = readExpandedPaths(model, directoryPaths);
      previousExpandedPathsRef.current = current;

      if (setsEqual(previous, current)) {
        return;
      }

      for (const path of new Set([...previous, ...current])) {
        if (previous.has(path) !== current.has(path)) {
          onDirectoryExpansionChange(path, current.has(path));
        }
      }
    });
  }, [directoryPaths, model, onDirectoryExpansionChange]);

  useEffect(() => {
    if (activeAncestorPaths.length > 0) {
      onRevealPaths(activeAncestorPaths);
    }
  }, [activeAncestorPaths, onRevealPaths]);

  const collapseAll = useCallback(() => {
    applyExpandedPaths(activeAncestorPaths);
    onCollapseAll(activeAncestorPaths);
  }, [activeAncestorPaths, applyExpandedPaths, onCollapseAll]);

  return collapseAll;
}
