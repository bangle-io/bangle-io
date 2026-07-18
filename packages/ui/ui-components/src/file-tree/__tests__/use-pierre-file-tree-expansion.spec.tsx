// @vitest-environment happy-dom
import { FileTree } from '@pierre/trees';
import { act, render } from '@testing-library/react';
import React, { useCallback, useMemo, useState } from 'react';
import { describe, expect, it } from 'vitest';
import {
  collectPierreDirectoryPaths,
  usePierreFileTreeExpansion,
} from '../use-pierre-file-tree-expansion';

// The repro tree from the reported bug: every directory has a sibling so
// Pierre does not flatten the chain, plus a root-level note to navigate to.
const TREE_PATHS = [
  'archived/misc/note-3.md',
  'archived/nimbus-admin/docs/note-4.md',
  'archived/nimbus-admin/tasks/note-2.md',
  'archived/nimbus-admin/tasks/note-2b.md',
  'note-1.md',
] as const;

const ALL_DIRECTORIES = [
  'archived',
  'archived/misc',
  'archived/nimbus-admin',
  'archived/nimbus-admin/docs',
  'archived/nimbus-admin/tasks',
] as const;

const NESTED_NOTE = 'archived/nimbus-admin/tasks/note-2.md';
const SIBLING_NOTE = 'archived/nimbus-admin/tasks/note-2b.md';
const ROOT_NOTE = 'note-1.md';

interface HarnessStore {
  expandedPaths: readonly string[];
  expansionEvents: Array<{ path: string; expanded: boolean }>;
  revealEvents: Array<readonly string[]>;
  collapseAllEvents: Array<readonly string[]>;
  collapseAll: () => void;
  setExpandedPaths: (paths: readonly string[]) => void;
}

function activeAncestorsOf(activePath: string | undefined): readonly string[] {
  return activePath ? collectPierreDirectoryPaths([activePath]) : [];
}

// Owns the durable expansion list the way the workbench service does. The
// handlers mirror reduceFileTreeExpansion in @bangle.io/service-core
// ('set-directory' collapse strips the path and its descendants, 'reveal'
// unions, 'collapse-all' replaces), which the ui workspace cannot import.
function Harness({
  model,
  treePaths,
  activePath,
  persistReveals,
  store,
}: {
  model: FileTree;
  treePaths: readonly string[];
  activePath: string | undefined;
  persistReveals: boolean;
  store: HarnessStore;
}) {
  const [expandedPaths, setExpandedPaths] = useState<readonly string[]>(
    store.expandedPaths,
  );
  store.expandedPaths = expandedPaths;
  store.setExpandedPaths = setExpandedPaths;

  const directoryPaths = useMemo(
    () => collectPierreDirectoryPaths(treePaths),
    [treePaths],
  );
  const activeAncestorPaths = useMemo(
    () => activeAncestorsOf(activePath),
    [activePath],
  );

  const onDirectoryExpansionChange = useCallback(
    (path: string, expanded: boolean) => {
      store.expansionEvents.push({ expanded, path });
      setExpandedPaths((previous) =>
        expanded
          ? [...new Set([...previous, path])]
          : previous.filter(
              (candidate) =>
                candidate !== path && !candidate.startsWith(`${path}/`),
            ),
      );
    },
    [store],
  );

  const onRevealPaths = useCallback(
    (paths: readonly string[]) => {
      store.revealEvents.push(paths);
      if (persistReveals) {
        setExpandedPaths((previous) => [...new Set([...previous, ...paths])]);
      }
    },
    [persistReveals, store],
  );

  const onCollapseAll = useCallback(
    (keepExpandedPaths: readonly string[]) => {
      store.collapseAllEvents.push(keepExpandedPaths);
      setExpandedPaths([...new Set(keepExpandedPaths)]);
    },
    [store],
  );

  store.collapseAll = usePierreFileTreeExpansion({
    activeAncestorPaths,
    activeFilePath: activePath,
    directoryPaths,
    expandedPaths,
    model,
    onCollapseAll,
    onDirectoryExpansionChange,
    onRevealPaths,
    treePaths,
  });

  return null;
}

function mountHarness({
  treePaths = TREE_PATHS,
  activePath,
  initialExpandedPaths,
  persistReveals = true,
}: {
  treePaths?: readonly string[];
  activePath: string | undefined;
  initialExpandedPaths: readonly string[];
  persistReveals?: boolean;
}) {
  const store: HarnessStore = {
    collapseAll: () => {
      throw new Error('collapseAll not wired yet');
    },
    collapseAllEvents: [],
    expandedPaths: initialExpandedPaths,
    expansionEvents: [],
    revealEvents: [],
    setExpandedPaths: () => {
      throw new Error('setExpandedPaths not wired yet');
    },
  };

  // Mirrors how PierreFileTree seeds useFileTree.
  const model = new FileTree({
    flattenEmptyDirectories: true,
    initialExpandedPaths: [
      ...new Set([...initialExpandedPaths, ...activeAncestorsOf(activePath)]),
    ],
    initialExpansion: 'closed',
    paths: treePaths,
  });

  let currentTreePaths = treePaths;
  const view = render(
    <Harness
      activePath={activePath}
      model={model}
      persistReveals={persistReveals}
      store={store}
      treePaths={currentTreePaths}
    />,
  );

  const rerenderWith = (next: {
    activePath: string | undefined;
    treePaths?: readonly string[];
  }) => {
    currentTreePaths = next.treePaths ?? currentTreePaths;
    view.rerender(
      <Harness
        activePath={next.activePath}
        model={model}
        persistReveals={persistReveals}
        store={store}
        treePaths={currentTreePaths}
      />,
    );
  };

  return { model, rerenderWith, store };
}

function readExpandedDirectories(
  model: FileTree,
  directoryPaths: readonly string[],
): string[] {
  return directoryPaths
    .filter((path) => {
      const item = model.getItem(path);
      return item !== null && 'isExpanded' in item && item.isExpanded();
    })
    .sort();
}

function userToggleDirectory(
  model: FileTree,
  path: string,
  expanded: boolean,
): void {
  act(() => {
    const item = model.getItem(path);
    if (item === null || !('isExpanded' in item)) {
      throw new Error(`Expected a directory handle for ${path}`);
    }
    if (expanded) {
      item.expand();
    } else {
      item.collapse();
    }
  });
}

describe('usePierreFileTreeExpansion', () => {
  it('reveals and persists the ancestors of the active file on mount', () => {
    const { model, store } = mountHarness({
      activePath: NESTED_NOTE,
      initialExpandedPaths: [],
    });

    expect(store.revealEvents).toEqual([
      ['archived', 'archived/nimbus-admin', 'archived/nimbus-admin/tasks'],
    ]);
    expect([...store.expandedPaths].sort()).toEqual([
      'archived',
      'archived/nimbus-admin',
      'archived/nimbus-admin/tasks',
    ]);
    expect(readExpandedDirectories(model, ALL_DIRECTORIES)).toEqual([
      'archived',
      'archived/nimbus-admin',
      'archived/nimbus-admin/tasks',
    ]);
  });

  it('keeps an active-file ancestor collapsed after the user collapses it', () => {
    const { model, store } = mountHarness({
      activePath: NESTED_NOTE,
      initialExpandedPaths: ALL_DIRECTORIES,
    });

    userToggleDirectory(model, 'archived/nimbus-admin', false);

    expect(store.expansionEvents).toEqual([
      { expanded: false, path: 'archived/nimbus-admin' },
    ]);
    expect(readExpandedDirectories(model, ALL_DIRECTORIES)).toEqual([
      'archived',
      'archived/misc',
    ]);
  });

  it('keeps the whole chain collapsed when ancestors collapse bottom-up', () => {
    const { model } = mountHarness({
      activePath: NESTED_NOTE,
      initialExpandedPaths: ALL_DIRECTORIES,
    });

    userToggleDirectory(model, 'archived/nimbus-admin/tasks', false);
    userToggleDirectory(model, 'archived/nimbus-admin', false);
    userToggleDirectory(model, 'archived', false);

    expect(readExpandedDirectories(model, ALL_DIRECTORIES)).toEqual([]);
  });

  it('never lets the model expansion diverge from the durable state', () => {
    const { model, store } = mountHarness({
      activePath: NESTED_NOTE,
      initialExpandedPaths: ALL_DIRECTORIES,
    });

    userToggleDirectory(model, 'archived', false);

    expect(readExpandedDirectories(model, ALL_DIRECTORIES)).toEqual(
      [...store.expandedPaths].sort(),
    );
  });

  it('keeps unrelated expanded directories intact when navigating away after a collapse', () => {
    const { model, rerenderWith } = mountHarness({
      activePath: NESTED_NOTE,
      initialExpandedPaths: ALL_DIRECTORIES,
    });

    userToggleDirectory(model, 'archived/nimbus-admin', false);
    rerenderWith({ activePath: ROOT_NOTE });

    expect(readExpandedDirectories(model, ALL_DIRECTORIES)).toEqual([
      'archived',
      'archived/misc',
    ]);
  });

  it('reveals and persists ancestors when navigating into a collapsed directory', () => {
    const { model, rerenderWith, store } = mountHarness({
      activePath: ROOT_NOTE,
      initialExpandedPaths: [],
    });

    expect(readExpandedDirectories(model, ALL_DIRECTORIES)).toEqual([]);

    rerenderWith({ activePath: NESTED_NOTE });

    expect(store.revealEvents).toEqual([
      ['archived', 'archived/nimbus-admin', 'archived/nimbus-admin/tasks'],
    ]);
    expect(readExpandedDirectories(model, ALL_DIRECTORIES)).toEqual([
      'archived',
      'archived/nimbus-admin',
      'archived/nimbus-admin/tasks',
    ]);
  });

  it('re-arms the reveal for a sibling note in the same collapsed directory', () => {
    // Reveals are recorded but NOT persisted here: the expansion must come
    // from the projection impulse itself in the navigation commit. The tree's
    // selection effect issues a one-shot scrollToPath in that same commit and
    // Pierre drops scroll requests for hidden rows, so waiting for the durable
    // reveal round-trip would leave the newly active note off-screen.
    const { model, rerenderWith } = mountHarness({
      activePath: NESTED_NOTE,
      initialExpandedPaths: ALL_DIRECTORIES,
      persistReveals: false,
    });

    userToggleDirectory(model, 'archived/nimbus-admin', false);
    rerenderWith({ activePath: SIBLING_NOTE });

    expect(readExpandedDirectories(model, ALL_DIRECTORIES)).toEqual([
      'archived',
      'archived/misc',
      'archived/nimbus-admin',
      'archived/nimbus-admin/tasks',
    ]);
  });

  it('re-reveals a collapsed ancestor chain when navigating back to the note', () => {
    const { model, rerenderWith } = mountHarness({
      activePath: NESTED_NOTE,
      initialExpandedPaths: ALL_DIRECTORIES,
    });

    userToggleDirectory(model, 'archived', false);
    rerenderWith({ activePath: ROOT_NOTE });
    rerenderWith({ activePath: NESTED_NOTE });

    expect(readExpandedDirectories(model, ALL_DIRECTORIES)).toEqual([
      'archived',
      'archived/nimbus-admin',
      'archived/nimbus-admin/tasks',
    ]);
  });

  it('collapse-all keeps only the active ancestors expanded and reports them', () => {
    const { model, store } = mountHarness({
      activePath: NESTED_NOTE,
      initialExpandedPaths: ALL_DIRECTORIES,
    });

    act(() => {
      store.collapseAll();
    });

    expect(store.collapseAllEvents).toEqual([
      ['archived', 'archived/nimbus-admin', 'archived/nimbus-admin/tasks'],
    ]);
    expect(readExpandedDirectories(model, ALL_DIRECTORIES)).toEqual([
      'archived',
      'archived/nimbus-admin',
      'archived/nimbus-admin/tasks',
    ]);
  });

  it('collapses active ancestors when the durable state drops them externally', () => {
    // Simulates the same workspace open in another tab collapsing 'archived'
    // (the atom is cross-tab synced): the projection must follow the durable
    // state even though the ancestors belong to this tab's active file.
    const { model, store } = mountHarness({
      activePath: NESTED_NOTE,
      initialExpandedPaths: ALL_DIRECTORIES,
    });

    act(() => {
      store.setExpandedPaths([]);
    });

    // No user gesture happened in this tab, so nothing should be reported.
    expect(store.expansionEvents).toEqual([]);
    expect(readExpandedDirectories(model, ALL_DIRECTORIES)).toEqual([]);
  });

  it('keeps a user-collapsed ancestor collapsed across a tree paths reset', () => {
    const { model, rerenderWith } = mountHarness({
      activePath: NESTED_NOTE,
      initialExpandedPaths: ALL_DIRECTORIES,
    });

    userToggleDirectory(model, 'archived/nimbus-admin', false);
    // A note created elsewhere re-drives model.resetPaths with the new list.
    rerenderWith({
      activePath: NESTED_NOTE,
      treePaths: [...TREE_PATHS, 'note-5.md'],
    });

    expect(readExpandedDirectories(model, ALL_DIRECTORIES)).toEqual([
      'archived',
      'archived/misc',
    ]);
  });

  it('reports a user re-expand and persists it', () => {
    const { model, store } = mountHarness({
      activePath: NESTED_NOTE,
      initialExpandedPaths: ALL_DIRECTORIES,
    });

    userToggleDirectory(model, 'archived/nimbus-admin', false);
    userToggleDirectory(model, 'archived/nimbus-admin', true);

    expect(store.expansionEvents).toEqual([
      { expanded: false, path: 'archived/nimbus-admin' },
      { expanded: true, path: 'archived/nimbus-admin' },
    ]);
    // Descendants were durably dropped by the collapse, so the directory
    // re-opens with its children closed.
    expect(readExpandedDirectories(model, ALL_DIRECTORIES)).toEqual([
      'archived',
      'archived/misc',
      'archived/nimbus-admin',
    ]);
  });

  it('keeps a flattened single-child chain collapsed after the user collapses it', () => {
    // With flattenEmptyDirectories, a single-child chain renders as one row
    // ('archived / nimbus-admin / tasks') whose collapse toggles the leaf.
    const flattenedTreePaths = [
      'archived/nimbus-admin/tasks/note-2.md',
      'note-1.md',
    ];
    const flattenedDirectories = [
      'archived',
      'archived/nimbus-admin',
      'archived/nimbus-admin/tasks',
    ];
    const { model } = mountHarness({
      activePath: NESTED_NOTE,
      initialExpandedPaths: flattenedDirectories,
      treePaths: flattenedTreePaths,
    });

    userToggleDirectory(model, 'archived/nimbus-admin/tasks', false);

    const item = model.getItem('archived/nimbus-admin/tasks');
    expect(item !== null && 'isExpanded' in item && item.isExpanded()).toBe(
      false,
    );
  });
});
