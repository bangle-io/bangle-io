import { useContext, useEffect, useState, useCallback } from 'react';
import { specRegistry } from '../editor/spec-sheet';
import { IndexDbWorkspace } from '../workspace/workspace';
import { WorkspacesInfo } from '../workspace/workspaces-info';
import { EditorManagerContext } from './EditorManager';
import { uuid } from '@bangle.dev/core/utils/js-utils';
import {
  hasPermissions,
  requestPermission as requestFilePermission,
} from '../workspace/native-fs-driver';
import { useHistory, useLocation, useParams } from 'react-router-dom';

const pathValidRegex = /^[0-9a-zA-Z_\-. /:]+$/;
const last = (arr) => arr[arr.length - 1];

export const pathHelpers = {
  validPath(wsPath) {
    if (
      !pathValidRegex.test(wsPath) ||
      wsPath.split('/').some((r) => r.length === 0)
    ) {
      console.log(wsPath);
      throw new Error('Invalid path ' + wsPath);
    }

    if ((wsPath.match(/:/g) || []).length !== 1) {
      throw new Error('Path must have only 1 :');
    }
  },

  resolve(wsPath) {
    const [wsName, filePath] = wsPath.split(':');

    const docName = last(filePath.split('/'));

    return {
      wsName,
      docName,
      filePath,
    };
  },
};

export async function getDoc(wsPath) {
  return (await getFile(wsPath))?.doc;
}

export async function saveDoc(wsPath, doc) {
  const { wsName, filePath } = pathHelpers.resolve(wsPath);
  const docJson = doc.toJSON();
  const workspace = await getWorkspace(wsName);
  const workspaceFile = workspace.getFile(filePath);
  if (workspaceFile) {
    await workspaceFile.updateDoc(docJson);
    return;
  }
}

export async function getFile(wsPath = 'test3:dslkqk') {
  pathHelpers.validPath(wsPath);
  const { wsName, filePath } = pathHelpers.resolve(wsPath);
  const workspace = await getWorkspace(wsName);

  if (!workspace.hasFile(filePath)) {
    throw new Error('File not found in workspace');
  }

  return workspace.getFile(filePath);
}

export async function getFiles(wsName = 'test3') {
  console.time('getFiles');

  const workspace = await getWorkspace(wsName);
  console.timeEnd('getFiles');
  return workspace.files;
}

export async function getWorkspaceInfo(wsName) {
  const availableWorkspacesInfo = await WorkspacesInfo.list();
  const workspaceInfo = availableWorkspacesInfo.find(
    ({ name }) => name === wsName,
  );
  return workspaceInfo;
}

export async function getWorkspace(wsName) {
  const workspaceInfo = await getWorkspaceInfo(wsName);
  return IndexDbWorkspace.openExistingWorkspace(
    workspaceInfo,
    specRegistry.schema,
  );
}

async function wsQueryPermission(wsName) {
  const workspaceInfo = await getWorkspaceInfo(wsName);
  if (!workspaceInfo.metadata.dirHandle) {
    return true;
  }
  const result = Boolean(
    await hasPermissions(workspaceInfo.metadata.dirHandle),
  );

  return result;
}

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
      const { wsName, filePath } = pathHelpers.resolve(wsPath);
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
    ({ docName } = pathHelpers.resolve(wsPath));
  }

  return {
    wsName,
    wsPath,
    docName,
    filePath,
    pushWsPath,
  };
}
