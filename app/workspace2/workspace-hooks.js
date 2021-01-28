import { useContext, useEffect, useState, useCallback } from 'react';

import { WorkspacesInfo } from '../workspace/workspaces-info';
import { EditorManagerContext } from './EditorManager';
import { uuid } from '@bangle.dev/core/utils/js-utils';
import { requestPermission as requestFilePermission } from '../workspace/native-fs-driver';
import { useHistory, useLocation, useParams } from 'react-router-dom';
import {
  getFiles,
  getWorkspace,
  getWorkspaceInfo,
  resolvePath,
  wsQueryPermission,
} from './workspace-helpers';

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

// TODO does it really need to be a hook
export function useCreateNewFile() {
  const { wsName, pushWsPath } = useWorkspaceDetails();

  const createNewFile = useCallback(async () => {
    const docName = uuid(6);
    const workspace = await getWorkspace(wsName);
    const newFile = await workspace.createFile(docName, null);
    workspace.linkFile(newFile);
    pushWsPath(workspace.name + ':' + newFile.docName);
  }, [wsName, pushWsPath]);

  return createNewFile;
}

export function useDeleteByDocName() {
  const { wsName } = useWorkspaceDetails();
  const history = useHistory();

  const deleteByDocName = useCallback(
    async (docName) => {
      let workspace = await getWorkspace(wsName);
      const workspaceFile = workspace.getFile(docName);
      if (workspaceFile) {
        await workspaceFile.delete();
        workspace = workspace.unlinkFile(workspaceFile);
        history.push('/ws/' + wsName);
      }
    },
    [wsName, history],
  );

  return deleteByDocName;
}

export function useWorkspaces() {
  const [workspaces, updateWorkspaces] = useState([]);
  const refreshWorkspaceList = useCallback(() => {
    WorkspacesInfo.list().then((workspaces) => {
      updateWorkspaces(workspaces.map((w) => w.name));
    });
  }, []);

  useEffect(() => {
    refreshWorkspaceList();
  }, [refreshWorkspaceList]);

  return {
    workspaces,
    refreshWorkspaceList,
  };
}

export function useWorkspacePermission() {
  const {
    editorManagerState: { wsPermission: permission },
    dispatch,
  } = useContext(EditorManagerContext);

  const { wsName } = useWorkspaceDetails();

  const setPermission = useCallback(
    (value) => {
      dispatch({
        type: 'WORKSPACE/PERMISSION',
        value,
      });
    },
    [dispatch],
  );

  useEffect(() => {
    setPermission(undefined);
    wsQueryPermission(wsName).then((result) => {
      setPermission(result ? 'granted' : 'rejected');
    });
  }, [setPermission, wsName]);

  const requestPermission = useCallback(async () => {
    if (permission === 'granted') {
      return true;
    }
    const workspaceInfo = await getWorkspaceInfo(wsName);
    if (!workspaceInfo.metadata.dirHandle) {
      setPermission('granted');
      return true;
    }
    const isGranted = await requestFilePermission(
      workspaceInfo.metadata.dirHandle,
    );
    if (isGranted) {
      setPermission('granted');
      return true;
    } else {
      setPermission('rejected');
      return false;
    }
  }, [wsName, permission, setPermission]);

  return [permission, requestPermission];
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
