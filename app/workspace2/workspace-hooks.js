import { useHistory, useLocation, useParams } from 'react-router-dom';
import { useEffect, useState, useCallback } from 'react';
import { uuid } from '@bangle.dev/core/utils/js-utils';
import { resolvePath } from 'bangle-io/app/workspace2/path-helpers';
import {
  createWorkspace,
  deleteWorkspace,
  listWorkspaces,
} from './workspace-helpers';
import { createFile, deleteFile, getFiles, renameFile } from './file-helpers';

export function useGetWorkspaceFiles() {
  const { wsName } = useWorkspaceDetails();

  const [files, setFiles] = useState([]);

  const refreshFiles = useCallback(() => {
    if (wsName) {
      getFiles(wsName).then((items) => {
        setFiles(items);
      });
    }
  }, [wsName]);

  useEffect(() => {
    refreshFiles();
  }, [refreshFiles]);
  return [files, refreshFiles];
}

export function useCreateFile() {
  const { wsName, pushWsPath } = useWorkspaceDetails();

  const createNewFile = useCallback(
    async (fileName = uuid(6)) => {
      const wsPath = wsName + ':' + fileName;
      await createFile(wsPath);
      pushWsPath(wsPath);
    },
    [wsName, pushWsPath],
  );

  return createNewFile;
}

export function useRenameActiveFile() {
  const { wsName, wsPath, pushWsPath } = useWorkspaceDetails();

  const renameFileCb = useCallback(
    async (newFilePath) => {
      const newWsPath = wsName + ':' + newFilePath;
      await renameFile(wsPath, newWsPath);
      pushWsPath(newWsPath);
    },
    [wsName, wsPath, pushWsPath],
  );

  return renameFileCb;
}

export function useDeleteFile() {
  const { wsName } = useWorkspaceDetails();
  const history = useHistory();

  const deleteByDocName = useCallback(
    async (wsPath) => {
      await deleteFile(wsPath);
      history.push('/ws/' + wsName);
    },
    [wsName, history],
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

export function useWorkspaceDetails() {
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
  };
}
