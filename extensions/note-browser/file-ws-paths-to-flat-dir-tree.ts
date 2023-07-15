import { splitWsPath } from '@bangle.io/ws-path';

/**
 * The name is sort of misleading in the sense that it doesnt return a tree
 * data structure
 * @param {*} wsFilePaths  - this must be file paths i.e. ending with a .md
 * @returns {{filesAndDirList, dirSet}} filesAndDirList string[] - a array of file and directory paths, ordered in a way
 *          the parent directory path comes before the file path.
 *          dirSet - a JS Set of directory path
 */
export function fileWsPathsToFlatDirTree(wsFilePaths: readonly string[]) {
  const dirSet = new Set<string>();
  const filePaths = wsFilePaths.map((f) => {
    return splitWsPath(f)[1];
  });

  filePaths.forEach((filePath) => {
    let str = filePath;
    let pos;
    while ((pos = str.lastIndexOf('/')) !== -1) {
      str = str.substring(0, pos);

      // if parent set has the str
      // it has already worked on this before
      // and we can safely skip it.
      if (dirSet.has(str)) {
        break;
      }
      dirSet.add(str);
    }
  });

  const compare = (a: string, b: string) => {
    const aSplit = a.split('/');
    const bSplit = b.split('/');
    const till = Math.min(aSplit.length, bSplit.length);

    for (let i = 0; i < till; i++) {
      const aSide = aSplit[i];
      const bSide = bSplit[i];

      if (aSide === bSide) {
        continue;
      }

      if (aSide && bSide && aSide !== bSide) {
        // A way to check if `a` is a file and we are on the last chunk of the path
        if (!dirSet.has(a) && aSplit[i + 1] === undefined) {
          return 1;
        }
        if (!dirSet.has(b) && bSplit[i + 1] === undefined) {
          return -1;
        }

        return aSide.localeCompare(bSide);
      }
    }

    return a.localeCompare(b);
  };

  return {
    dirSet,
    filesAndDirList: [...dirSet, ...filePaths].sort(compare),
  };
}
