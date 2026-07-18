import type { FileTree as PierreFileTreeModel } from '@pierre/trees';
import { useCallback, useEffect, useEffectEvent, useRef } from 'react';

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
  activeFilePath,
  activeAncestorPaths,
  onDirectoryExpansionChange,
  onRevealPaths,
  onCollapseAll,
}: {
  model: PierreFileTreeModel;
  treePaths: readonly string[];
  directoryPaths: readonly string[];
  expandedPaths: readonly string[];
  activeFilePath: string | undefined;
  activeAncestorPaths: readonly string[];
  onDirectoryExpansionChange: (path: string, expanded: boolean) => void;
  onRevealPaths: (paths: readonly string[]) => void;
  onCollapseAll: (keepExpandedPaths: readonly string[]) => void;
}) {
  // The active file's ancestors are a reveal impulse, not pinned state: they
  // are folded into the projection only until they have been applied once for
  // the current active file (and persisted through onRevealPaths). After that
  // the durable expandedPaths alone drive the model, so a user's collapse of
  // an active ancestor sticks instead of being resurrected — and the model can
  // never drift away from the durable state it reports into.
  //
  // The impulse is keyed by the active file, not just its ancestor chain:
  // navigating to a sibling note in the same (user-collapsed) directory must
  // re-arm it so the projection expands in the same commit, before the tree's
  // selection effect issues its one-shot scroll — Pierre drops scroll requests
  // for rows that are still hidden.
  const revealSignature = [activeFilePath ?? '', ...activeAncestorPaths].join(
    '\0',
  );
  const appliedRevealSignatureRef = useRef<string | null>(null);

  const getProjectionPaths = useCallback(
    (): readonly string[] =>
      appliedRevealSignatureRef.current === revealSignature
        ? expandedPaths
        : [...new Set([...expandedPaths, ...activeAncestorPaths])],
    [activeAncestorPaths, expandedPaths, revealSignature],
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
        initialExpandedPaths: getProjectionPaths(),
      });
    });
  });

  useEffect(() => {
    resetModelPaths(treePaths);
  }, [treePaths]);

  useEffect(() => {
    applyExpandedPaths(getProjectionPaths());
    appliedRevealSignatureRef.current = revealSignature;
  }, [applyExpandedPaths, getProjectionPaths, revealSignature]);

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
