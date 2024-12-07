import { throwAppError } from '@bangle.io/base-utils';
import {
  assertSplitWsPath,
  filePathToWsPath,
  pathJoin,
} from '@bangle.io/ws-path';

export interface TreeItem {
  id: string;
  name: string;
  isDir: boolean;
  isOpen?: boolean;
  children?: TreeItem[];
  // only for files
  wsPath: string;
}

type SortComparator = (
  optA: { name: string; isDir: boolean },
  optB: { name: string; isDir: boolean },
) => number;

export function buildTree(
  wsPaths: string[],
  openPaths: string[] = [],
  comparator?: SortComparator,
): TreeItem[] {
  const filePaths = wsPaths.map((wsPath) => assertSplitWsPath(wsPath).filePath);
  const openFilePaths = new Set(
    openPaths.map((wsPath) => assertSplitWsPath(wsPath).filePath),
  );

  const wsName = wsPaths[0] ? assertSplitWsPath(wsPaths[0]).wsName : '';

  if (wsPaths.length > 0 && !wsName) {
    throwAppError('error::ws-path:invalid-ws-path', 'Invalid ws path', {
      invalidPath: wsPaths[0] || '<empty>',
    });
  }

  const root = new Map<string, any>();

  for (const filePath of filePaths) {
    const parts = filePath.split('/');
    let current = root;

    parts.forEach((part, index) => {
      if (!current.has(part)) {
        current.set(part, {
          children: new Map(),
          isDir: index < parts.length - 1,
        });
      }
      if (index < parts.length - 1) {
        current = current.get(part).children;
      }
    });
  }

  function isPathOpen(pathParts: string[]): boolean {
    const path = pathParts.join('/');
    return openFilePaths.has(path);
  }

  function hasOpenDescendant(pathParts: string[]): boolean {
    const currentPath = pathParts.join('/');
    for (const openPath of openFilePaths) {
      if (openPath === currentPath || openPath.startsWith(`${currentPath}/`)) {
        return true;
      }
    }
    return false;
  }

  function convertToTreeItem(
    map: Map<string, any>,
    pathParts: string[] = [],
  ): TreeItem[] {
    const items: TreeItem[] = [];

    const entries = Array.from(map.entries());

    entries.sort((a, b) => {
      const [nameA, valueA] = a;
      const [nameB, valueB] = b;

      const isDirA = valueA.isDir;
      const isDirB = valueB.isDir;

      if (comparator) {
        return comparator(
          { name: nameA, isDir: isDirA },
          { name: nameB, isDir: isDirB },
        );
      }
      // Default sort: directories before files, then alphabetically
      if (isDirA !== isDirB) {
        return isDirA ? -1 : 1;
      }
      return nameA.localeCompare(nameB);
    });

    for (const [name, value] of entries) {
      const newPathParts = [...pathParts, name];
      if (value.isDir) {
        const children = convertToTreeItem(value.children, newPathParts);
        const isOpen =
          isPathOpen(newPathParts) || hasOpenDescendant(newPathParts);

        const wsPath = filePathToWsPath({
          wsName,
          inputPath: pathJoin(...newPathParts),
        });
        items.push({
          id: wsPath,
          wsPath,
          name,
          isDir: true,
          children,
          ...(isOpen && children.length > 0 ? { isOpen: true } : {}),
        });
      } else {
        const wsPath = filePathToWsPath({
          wsName,
          inputPath: pathJoin(...newPathParts),
        });
        items.push({
          id: wsPath,
          name,
          isDir: false,
          wsPath,
        });
      }
    }

    return items;
  }

  return convertToTreeItem(root);
}
