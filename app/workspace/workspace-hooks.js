import { useHistory, useLocation, useParams } from 'react-router-dom';
import { useEffect, useState, useCallback } from 'react';
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

export function useGetWorkspaceFiles() {
  const { wsName, wsPermissionState } = useWorkspacePath();

  const [files, setFiles] = useState([]);

  const refreshFiles = useCallback(() => {
    if (wsName && wsPermissionState.type === 'ready') {
      listAllFiles(wsName).then((items) => {
        setFiles(items);
      });
    }
  }, [wsName, wsPermissionState.type]);

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

  useEffect(() => {
    let destroyed = false;
    listWorkspaces().then((workspaces) => {
      if (!destroyed) {
        updateWorkspaces(workspaces);
      }
    });
    return () => {
      destroyed = true;
    };
  }, [wsName]);

  const createWorkspaceCb = useCallback(
    async (wsName, type, opts) => {
      await createWorkspace(wsName, type, opts);
      history.push(`/ws/${wsName}`);
    },
    [history],
  );

  const deleteWorkspaceCb = useCallback(
    async (wsName) => {
      await deleteWorkspace(wsName);
      history.push(`/ws/`);
    },
    [history],
  );

  const switchWorkspaceCb = useCallback(
    async (wsName) => {
      history.push('/ws/' + wsName);
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
    (wsPath) => {
      const { wsName, filePath } = resolvePath(wsPath);
      const newPath = `/ws/${wsName}/${filePath}`;

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
