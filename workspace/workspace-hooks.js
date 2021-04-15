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
import {
  createFile,
  deleteFile,
  listAllFiles,
  renameFile,
} from './file-helpers';
import { checkWidescreen } from 'utils/index';
import { importGithubWorkspace } from './github-helpers';
import { FILE_NOT_FOUND_ERROR } from 'baby-fs';

const LOG = false;
let log = LOG ? console.log.bind(console, 'workspace/index') : () => {};

export function useGetWorkspaceFiles() {
  const { wsName, wsPermissionState } = useWorkspacePath();

  const [files, setFiles] = useState([]);
  const isDestroyed = useRef(false);

  const refreshFiles = useCallback(() => {
    if (
      wsName &&
      (wsPermissionState.type === 'ready' ||
        // TODO I am not happy with this error code check here
        // I feel this part of code shouldnt know so much about error and codes
        // Can we make the wsPermissionState accomodate the common 404 not found error.
        // allow listing of files if the current file is not found
        wsPermissionState.error?.code === FILE_NOT_FOUND_ERROR)
    ) {
      // TODO this is called like a million times
      // we need to fix this to only update based on known things
      // like renaming of file, delete etc.
      listAllFiles(wsName).then((items) => {
        if (!isDestroyed.current) {
          setFiles(items);
        }
      });
    }
    // TODO: look into this the one below is a quick fix as stale files are shown
    // when you switch a workspace but waiting on the permission page.
    if (wsName && wsPermissionState.type === 'permission') {
      if (!isDestroyed.current) {
        setFiles([]);
      }
    }
  }, [wsName, wsPermissionState]);

  useEffect(() => {
    refreshFiles();
  }, [refreshFiles]);

  useEffect(() => {
    return () => {
      isDestroyed.current = true;
    };
  }, []);

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

export function useRenameActiveFile() {
  const { wsName, wsPath, replaceWsPath } = useWorkspacePath();

  const renameFileCb = useCallback(
    async (newFilePath) => {
      if (!newFilePath.endsWith('.md')) {
        newFilePath += '.md';
      }

      const newWsPath = wsName + ':' + newFilePath;
      await renameFile(wsPath, newWsPath);
      replaceWsPath(newWsPath);
    },
    [wsName, wsPath, replaceWsPath],
  );

  return renameFileCb;
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
  const isDestroyed = useRef(false);

  const refreshWorkspaces = useCallback(() => {
    listWorkspaces().then((workspaces) => {
      if (!isDestroyed.current) {
        updateWorkspaces(workspaces);
      }
    });
  }, []);

  useEffect(() => {
    refreshWorkspaces();
    return () => {
      isDestroyed.current = true;
    };
  }, [refreshWorkspaces]);

  const createWorkspaceCb = useCallback(
    async (wsName, type, opts) => {
      await createWorkspace(wsName, type, opts);
      history.push(`/ws/${wsName}`);
    },
    [history],
  );

  const importWorkspaceFromGithubCb = useCallback(
    // can pass alternat wsName in the options
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
  const location = useLocation();
  const match = matchPath(location.pathname, {
    path: '/ws/:wsName',
    exact: false,
    strict: false,
  });

  const { wsName } = match?.params ?? {};
  const { secondaryWsPath } = location?.state ?? {};
  let wsPath;

  const filePath = locationToFilePath(location);
  if (filePath) {
    wsPath = wsName + ':' + filePath;
  }

  const history = useHistory();

  const pushWsPath = useCallback(
    (wsPath, newTab = false, secondary = false) => {
      const { wsName, filePath } = resolvePath(wsPath);
      const newPath = `/ws/${wsName}/${filePath}`;

      if (newTab) {
        window.open(newPath);
        return;
      }

      const isWidescreen = checkWidescreen();

      if (isWidescreen && secondary) {
        // replace is intentional as native history pop
        // for some reason isnt remembering the state.
        history.replace(history.location.pathname, {
          ...history.location.state,
          secondaryWsPath: wsPath,
        });
        return;
      }

      if (newPath === history.location.pathname) {
        return;
      }

      history.push(newPath, {
        ...history.location.state,
        secondaryWsPath: isWidescreen ? secondaryWsPath : null,
      });
    },
    [history, secondaryWsPath],
  );

  const replaceWsPath = useCallback(
    (wsPath) => {
      const { wsName, filePath } = resolvePath(wsPath);
      log('replaceWsPath', wsPath);

      history.replace({
        ...history.location,
        pathname: `/ws/${wsName}/${filePath}`,
      });
    },
    [history],
  );

  const setWsPermissionState = useCallback(
    (payload) => {
      log(
        'setWsPermissionState',
        payload,
        'existing state',
        history.location.state,
      );
      history.replace({
        ...history.location,
        state: { ...history.location.state, wsPermissionState: payload },
      });
    },
    [history],
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
    }

    history.push(newPath, {
      ...history.location.state,
      secondaryWsPath: null,
    });
  }, [history, wsPath, secondaryWsPath]);

  // the editor on side
  const removeSecondaryWsPath = useCallback(() => {
    log('removeSecondaryWsPath');
    history.replace(history.location.pathname, {
      ...history.location.state,
      secondaryWsPath: null,
    });
  }, [history]);

  // TODO should I add more safeguard for
  // workspacePerm.type == ready?
  if (!wsName) {
    return {
      wsName,
      wsPath: null,
      secondaryWsPath: null,
      filePath: null,
      pushWsPath,
      replaceWsPath,
      setWsPermissionState,
      removeSecondaryWsPath,
      removeWsPath,
      wsPermissionState: {},
    };
  }

  return {
    wsName,
    wsPath,
    secondaryWsPath,
    filePath,
    pushWsPath,
    replaceWsPath,
    setWsPermissionState,
    removeWsPath,
    removeSecondaryWsPath,
    wsPermissionState: location?.state?.wsPermissionState ?? {},
  };
}
