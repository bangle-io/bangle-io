import { useCallback } from 'react';
import {
  useGetWorkspaceFiles,
  useWorkspacePath,
} from 'bangle-io/app/workspace/workspace-hooks';
import { resolvePath } from 'bangle-io/app/workspace/path-helpers';

const LOG = false;

let log = LOG ? console.log.bind(console, 'play/file-palette') : () => {};

export function useFilePalette({ query = '' }) {
  const { pushWsPath } = useWorkspacePath();
  const [files] = useGetWorkspaceFiles();
  const executeItem = useCallback(
    (item) => {
      pushWsPath(item.data);
    },
    [pushWsPath],
  );

  const wsPaths = getItems({ query, files });

  return {
    executeItem,
    items: wsPaths.map((wsPath) => {
      return {
        uid: wsPath,
        title: resolvePath(wsPath).filePath,
        data: wsPath,
      };
    }),
  };
}

function getItems({ query, files }) {
  if (!query) {
    return files;
  }
  return files.filter((file) => {
    const title = file;
    return strMatch(title, query);
  });
}

function strMatch(a, b) {
  b = b.toLocaleLowerCase();
  if (Array.isArray(a)) {
    return a.filter(Boolean).some((str) => strMatch(str, b));
  }

  a = a.toLocaleLowerCase();
  return a.includes(b) || b.includes(a);
}
