import { useHistory, matchPath, useLocation } from 'react-router-dom';
import { useEffect, useState, useCallback, useRef } from 'react';
import { Node } from '@bangle.dev/core/prosemirror/model';
import { specRegistry } from 'editor/index';

import { locationToFilePath, resolvePath } from './path-helpers';
import {
  createWorkspace,
  deleteWorkspace,
  listWorkspaces,
} from './workspace-helpers';
import { cachedListAllFiles, createFile, deleteFile } from './file-helpers';
import {
  checkWidescreen,
  serialExecuteQueue,
  useDestroyRef,
} from 'utils/index';
import { importGithubWorkspace } from './github-helpers';
const LOG = false;
let log = LOG ? console.log.bind(console, 'workspace/index') : () => {};

// Refresh hooks get bombarded with many concurrent
// requests and that defeats the point of caching
// as everyone tries to get the results. So this exists
// to help the first one do its thing, so that the others
// in queue can get the cached result.
const refreshFileQueue = serialExecuteQueue();

export function useGetCachedWorkspaceFiles() {
  const { wsName } = useWorkspacePath();
  const location = useLocation();
  const [files, setFiles] = useState(undefined);

  const destroyedRef = useDestroyRef();

  const refreshFiles = useCallback(() => {
    if (wsName) {
      // const t = Math.random();
      // console.time('refresh' + t);
      refreshFileQueue
        .add(() => cachedListAllFiles(wsName))
        .then((items) => {
          if (!destroyedRef.current) {
            setFiles(items);
            // console.timeEnd('refresh' + t);
          }
        })
        .catch((error) => {
          if (!destroyedRef.current) {
            setFiles(undefined);
          }
          throw error;
        });
    }
  }, [wsName, destroyedRef]);

  useEffect(() => {
    refreshFiles();
    // workspaceStatus is added here so that if permission
    // changes the files can be updated
  }, [refreshFiles, location.state?.workspaceStatus]);

  return [files, refreshFiles];
}

export function useCreateMdFile() {
  const { pushWsPath } = useWorkspacePath();

  const createNewMdFile = useCallback(
    async (
      wsPath,
      doc = Node.fromJSON(specRegistry.schema, {
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: {
              level: 1,
            },
            content: [
              {
                type: 'text',
                text: resolvePath(wsPath).fileName,
              },
            ],
          },
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Hello world!',
              },
            ],
          },
        ],
      }),
    ) => {
      await createFile(wsPath, doc);
      pushWsPath(wsPath);
    },
    [pushWsPath],
  );

  return createNewMdFile;
}

export function useDeleteFile() {
  const { wsName, wsPath } = useWorkspacePath();
  const history = useHistory();

  const deleteByWsPath = useCallback(
    async (wsPathToDelete) => {
      await deleteFile(wsPathToDelete);
      if (wsPathToDelete === wsPath) {
        history.replace('/ws/' + wsName);
      }
    },
    [wsName, wsPath, history],
  );

  return deleteByWsPath;
}

export function useWorkspaces() {
  const [workspaces, updateWorkspaces] = useState([]);
  const { wsName } = useWorkspacePath();
  const history = useHistory();
  const destroyedRef = useDestroyRef();

  const refreshWorkspaces = useCallback(() => {
    listWorkspaces().then((workspaces) => {
      if (!destroyedRef.current) {
        updateWorkspaces(workspaces);
      }
    });
  }, [destroyedRef]);

  const createWorkspaceCb = useCallback(
    async (wsName, type, opts) => {
      await createWorkspace(wsName, type, opts);
      history.push(`/ws/${wsName}`);
    },
    [history],
  );

  const importWorkspaceFromGithubCb = useCallback(
    // can pass alternate wsName in the options
    async (url, wsType, opts = {}) => {
      const wsName = await importGithubWorkspace(
        url,
        wsType,
        opts.wsName,
        opts.token,
      );

      await refreshWorkspaces();
      history.push(`/ws/${wsName}`);
    },
    [history, refreshWorkspaces],
  );

  const deleteWorkspaceCb = useCallback(
    async (targetWsName) => {
      await deleteWorkspace(targetWsName);
      if (targetWsName === wsName) {
        history.push(`/ws/`);
      } else {
        refreshWorkspaces();
      }
    },
    [history, wsName, refreshWorkspaces],
  );

  const switchWorkspaceCb = useCallback(
    async (wsName, newTab) => {
      const newPath = '/ws/' + wsName;
      if (newTab) {
        window.open(newPath);
        return;
      }
      history.push(newPath);
    },
    [history],
  );

  return {
    workspaces,
    createWorkspace: createWorkspaceCb,
    deleteWorkspace: deleteWorkspaceCb,
    switchWorkspace: switchWorkspaceCb,
    importWorkspaceFromGithub: importWorkspaceFromGithubCb,
  };
}

export function useWorkspacePath() {
  // I think history doesnt change when location changes
  // so it is a good idea to use useLocation instead of location
  const location = useLocation();
  const history = useHistory();

  const match = matchPath(location.pathname, {
    path: '/ws/:wsName',
    exact: false,
    strict: false,
  });

  const { wsName } = match?.params ?? {};
  const search = new URLSearchParams(location?.search);
  const secondaryWsPath = search.get('secondary') ?? undefined;
  let wsPath;
  const filePath = locationToFilePath(location);
  if (filePath) {
    wsPath = wsName + ':' + filePath;
  }

  const pushWsPath = useCallback(
    (wsPath, newTab = false, secondary = false) => {
      const { wsName, filePath } = resolvePath(wsPath);
      const newPath = `/ws/${wsName}/${filePath}`;
      if (newTab) {
        window.open(newPath);
        return;
      }

      const isWidescreen = checkWidescreen();
      const newSearch = new URLSearchParams(location?.search);

      if (isWidescreen && secondary) {
        // replace is intentional as native history pop
        // for some reason isnt remembering the state.
        if (isWidescreen) {
          newSearch.set('secondary', wsPath);
        } else {
          newSearch.delete('secondary');
        }
        history.replace({
          ...location,
          search: newSearch.toString(),
        });
        return;
      }

      if (newPath === location.pathname && !secondary) {
        return;
      }
      history.push({
        ...location,
        pathname: newPath,
        search: newSearch.toString(),
      });
    },
    [history, location],
  );

  const replaceWsPath = useCallback(
    (wsPath) => {
      const { wsName, filePath } = resolvePath(wsPath);
      log('replaceWsPath', wsPath);

      history.replace({
        ...location,
        pathname: `/ws/${wsName}/${filePath}`,
      });
    },
    [history, location],
  );

  // removes the currently active wsPath
  const removeWsPath = useCallback(() => {
    if (!wsPath) {
      return;
    }

    let newPath = null;

    // transition any secondary to main
    if (secondaryWsPath) {
      const { wsName, filePath } = resolvePath(secondaryWsPath);
      newPath = `/ws/${wsName}/${filePath}`;
    } else {
      newPath = `/ws/${wsName}`;
    }

    history.push(newPath);
  }, [history, wsPath, wsName, secondaryWsPath]);

  // the editor on side
  const removeSecondaryWsPath = useCallback(() => {
    log('removeSecondaryWsPath');
    const newSearch = new URLSearchParams(location?.search);
    newSearch.delete('secondary');
    history.replace({
      ...location,
      search: newSearch.toString(),
    });
  }, [history, location]);

  return {
    wsName,
    wsPath,
    secondaryWsPath,
    filePath,
    pushWsPath,
    replaceWsPath,
    removeWsPath,
    removeSecondaryWsPath,
  };
}
