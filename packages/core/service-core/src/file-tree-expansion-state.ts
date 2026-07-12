export type FileTreeExpandedPathsByWorkspace = Record<
  string,
  readonly string[]
>;

export type FileTreeExpansionAction =
  | {
      type: 'set-directory';
      workspaceName: string;
      path: string;
      expanded: boolean;
    }
  | {
      type: 'reveal';
      workspaceName: string;
      paths: readonly string[];
    }
  | {
      type: 'collapse-all';
      workspaceName: string;
      keepExpandedPaths: readonly string[];
    };

function uniquePaths(paths: readonly string[]): readonly string[] {
  return [...new Set(paths)];
}

function pathsEqual(left: readonly string[], right: readonly string[]) {
  return (
    left.length === right.length &&
    left.every((path, index) => path === right[index])
  );
}

/** Applies one semantic file-tree expansion transition. */
export function reduceFileTreeExpansion(
  current: FileTreeExpandedPathsByWorkspace,
  action: FileTreeExpansionAction,
): FileTreeExpandedPathsByWorkspace {
  const currentPaths = Object.hasOwn(current, action.workspaceName)
    ? (current[action.workspaceName] ?? [])
    : [];
  let nextPaths: readonly string[];

  switch (action.type) {
    case 'set-directory':
      nextPaths = action.expanded
        ? uniquePaths([...currentPaths, action.path])
        : currentPaths.filter(
            (path) =>
              path !== action.path && !path.startsWith(`${action.path}/`),
          );
      break;
    case 'reveal':
      nextPaths = uniquePaths([...currentPaths, ...action.paths]);
      break;
    case 'collapse-all':
      nextPaths = uniquePaths(action.keepExpandedPaths);
      break;
  }

  return pathsEqual(currentPaths, nextPaths)
    ? current
    : { ...current, [action.workspaceName]: nextPaths };
}
