import { useHistory, useLocation, useParams } from 'react-router-dom';
import { useEffect, useState, useCallback, useRef } from 'react';
import { Node } from '@bangle.dev/core/prosemirror/model';
import { resolvePath } from 'bangle-io/app/workspace/path-helpers';
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
import { specRegistry } from '../editor/spec-sheet';
import { NATIVE_FS_FILE_NOT_FOUND_ERROR } from './nativefs-helpers';

export function useGetWorkspaceFiles() {
  const { wsName, wsPermissionState } = useWorkspacePath();

  const [files, setFiles] = useState([]);

  const refreshFiles = useCallback(() => {
    if (
      wsName &&
      (wsPermissionState.type === 'ready' ||
        // TODO I am not happy with this error code check here
        // I feel this part of code shouldnt know so much about error and codes
        // Can we make the wsPermissionState accomodate the common 404 not found error.
        // allow listing of files if the current file is not found
        wsPermissionState.error?.code === NATIVE_FS_FILE_NOT_FOUND_ERROR)
    ) {
      listAllFiles(wsName).then((items) => {
        setFiles(items);
      });
    }
  }, [wsName, wsPermissionState]);

  useEffect(() => {
    refreshFiles();
  }, [refreshFiles]);

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
  };
}

export function useWorkspacePath() {
  const { wsName } = useParams();
  const { pathname } = useLocation();
  const history = useHistory();

  const pushWsPath = useCallback(
    (wsPath, newTab = false) => {
      const { wsName, filePath } = resolvePath(wsPath);
      const newPath = `/ws/${wsName}/${filePath}`;

      if (newTab) {
        window.open(newPath);
        return;
      }
      // allow opening the same thing in new tab
      if (newPath === history.location.pathname) {
        return;
      }

      history.push({
        ...history.location,
        pathname: newPath,
      });
    },
    [history],
  );

  const replaceWsPath = useCallback(
    (wsPath) => {
      const { wsName, filePath } = resolvePath(wsPath);
      history.replace({
        ...history.location,
        pathname: `/ws/${wsName}/${filePath}`,
      });
    },
    [history],
  );

  const setWsPermissionState = useCallback(
    (payload) => {
      console.log('setting ws state', payload);
      history.replace({
        ...history.location,
        state: { ...history.location.state, wsPermissionState: payload },
      });
    },
    [history],
  );

  // TODO should I add more safeguard for
  // workspaceperm.type == ready?
  if (!wsName) {
    return {
      wsName,
      wsPath: null,
      filePath: null,
      pushWsPath,
      replaceWsPath,
      setWsPermissionState,
      wsPermissionState: {},
    };
  }

  const filePath = pathname.split('/').slice(3).join('/');
  let wsPath;

  if (filePath) {
    wsPath = wsName + ':' + filePath;
  }

  return {
    wsName,
    wsPath,
    filePath,
    pushWsPath,
    replaceWsPath,
    wsPermissionState: history.location?.state?.wsPermissionState ?? {},
    setWsPermissionState,
  };
}
