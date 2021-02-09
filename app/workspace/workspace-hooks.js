import { useHistory, useLocation, useParams } from 'react-router-dom';
import { useEffect, useState, useCallback } from 'react';
import { uuid } from '@bangle.dev/core/utils/js-utils';
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
  const { wsName } = useWorkspacePath();

  const [files, setFiles] = useState([]);

  const refreshFiles = useCallback(() => {
    if (wsName) {
      listAllFiles(wsName).then((items) => {
        setFiles(items);
      });
    }
  }, [wsName]);

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

  const deleteByDocName = useCallback(
    async (wsPathToDelete) => {
      await deleteFile(wsPathToDelete);
      if (wsPathToDelete === wsPath) {
        history.replace('/ws/' + wsName);
      }
    },
    [wsName, wsPath, history],
  );

  return deleteByDocName;
}

export function useWorkspaces() {
  const [workspaces, updateWorkspaces] = useState([]);
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
  }, []);

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

  return {
    workspaces,
    createWorkspace: createWorkspaceCb,
    deleteWorkspace: deleteWorkspaceCb,
  };
}

export function useWorkspacePath() {
  const { wsName } = useParams();
  const { pathname } = useLocation();
  const history = useHistory();

  const pushWsPath = useCallback(
    (wsPath) => {
      const { wsName, filePath } = resolvePath(wsPath);
      history.push(`/ws/${wsName}/${filePath}`);
    },
    [history],
  );

  const replaceWsPath = useCallback(
    (wsPath) => {
      const { wsName, filePath } = resolvePath(wsPath);
      history.replace(`/ws/${wsName}/${filePath}`);
    },
    [history],
  );

  if (!wsName) {
    return {};
  }

  const filePath = pathname.split('/').slice(3).join('/');
  let wsPath;
  let docName;

  if (filePath) {
    wsPath = wsName + ':' + filePath;
    ({ docName } = resolvePath(wsPath));
  }

  return {
    wsName,
    wsPath,
    docName,
    filePath,
    pushWsPath,
    replaceWsPath,
  };
}
