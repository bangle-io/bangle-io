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

window.WorkspacesInfo = WorkspacesInfo;
window.IndexDbWorkspace = IndexDbWorkspace;
window.pathHelpers = pathHelpers;
window.schema = specRegistry.schema;
window.getFile = getFile;
window.getFiles = getFiles;

export async function getDoc(wsPath) {
  return (await getFile(wsPath))?.doc;
}

export async function saveDoc(wsPath, doc) {
  const { docName, wsName } = pathHelpers.resolve(wsPath);

  const docJson = doc.toJSON();

  const workspace = await getWorkspace(wsName);

  const workspaceFile = workspace.getFile(docName);

  if (workspaceFile) {
    await workspaceFile.updateDoc(docJson);
    return;
  }
}

export async function getFile(wsPath = 'test3:dslkqk') {
  pathHelpers.validPath(wsPath);
  const { docName, wsName, filePath } = pathHelpers.resolve(wsPath);
  const workspace = await getWorkspace(wsName);

  if (!workspace.hasFile(filePath)) {
    console.log({ docName, workspace });
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

const cache = new Map();
export async function getWorkspaceInfoCached(wsName) {
  const promise = getWorkspaceInfo(wsName).then((result) => {
    cache.set(wsName, result);
  });

  if (!cache.has(wsName)) {
    await promise;
  }
  return cache.get(wsName);
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
  const {
    editorManagerState: { wsName },
  } = useContext(EditorManagerContext);
  const [files, setFiles] = useState([]);

  const refreshFiles = useCallback(() => {
    getFiles(wsName).then((items) => {
      setFiles(items);
    });
  }, [wsName]);

  useEffect(() => {
    refreshFiles();
  }, [refreshFiles]);

  return [files, refreshFiles];
}

// TODO does it really need to be a hook
export function useCreateNewFile() {
  const {
    editorManagerState: { wsName },
    dispatch,
  } = useContext(EditorManagerContext);

  const createNewFile = useCallback(async () => {
    const docName = uuid(6);
    const workspace = await getWorkspace(wsName);
    const newFile = await workspace.createFile(docName, null);
    workspace.linkFile(newFile);
    dispatch({
      type: 'WORKSPACE/OPEN_WS_PATH',
      wsPath: workspace.name + ':' + newFile.docName,
    });
  }, [dispatch, wsName]);

  return createNewFile;
}

export function useDeleteByDocName() {
  const {
    editorManagerState: { wsName, openedDocs },
    dispatch,
  } = useContext(EditorManagerContext);

  const deleteByDocName = useCallback(
    async (docName) => {
      let workspace = await getWorkspace(wsName);
      const workspaceFile = workspace.getFile(docName);
      if (workspaceFile) {
        await workspaceFile.delete();
        workspace = workspace.unlinkFile(workspaceFile);

        const newFiles = openedDocs.filter(({ wsPath }) =>
          workspace.files.find((w) => w.wsPath === wsPath),
        );
        dispatch({
          type: 'WORKSPACE/CLOSE_DOC',
          openedDocs: newFiles,
        });
      }
    },
    [wsName, dispatch, openedDocs],
  );

  return deleteByDocName;
}

export function useWorkspaces() {
  const { dispatch } = useContext(EditorManagerContext);
  // Array<string>
  const [workspaces, updateWorkspaces] = useState([]);
  const refreshWorkspaceList = useCallback(() => {
    WorkspacesInfo.list().then((workspaces) => {
      updateWorkspaces(workspaces.map((w) => w.name));
    });
  }, []);

  const openWorkspace = useCallback(
    async (wsName, autoOpenFile = false) => {
      dispatch({
        type: 'WORKSPACE/OPEN',
        wsName,
      });

      if (autoOpenFile) {
        const permission = await wsQueryPermission(wsName);
        try {
          if (!permission) {
            dispatch({
              type: 'WORKSPACE/IS_PERMISSION_PROMPT_ACTIVE',
              value: true,
            });
          }

          const files = await getFiles(wsName);
          if (files[0]) {
            dispatch({
              type: 'WORKSPACE/OPEN_WS_PATH',
              wsPath: wsName + ':' + files[0].docName,
            });
          }
        } catch (err) {
          if (err.name === 'NoPermissionError') {
            console.error(err);
          }
        }
        if (!permission) {
          dispatch({
            type: 'WORKSPACE/IS_PERMISSION_PROMPT_ACTIVE',
            value: false,
          });
        }
      }
    },
    [dispatch],
  );

  useEffect(() => {
    refreshWorkspaceList();
  }, [refreshWorkspaceList]);

  return {
    workspaces,
    refreshWorkspaceList,
    openWorkspace,
  };
}

export function useWorkspacePermission() {
  const {
    editorManagerState: { wsName, wsIsPermissionPromptActive },
  } = useContext(EditorManagerContext);
  const [permission, setPermission] = useState();

  useEffect(() => {
    setPermission(undefined);
    wsQueryPermission(wsName).then((result) => {
      setPermission(result ? 'granted' : 'rejected');
    });
  }, [wsName, wsIsPermissionPromptActive]);

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
  }, [wsName, permission]);

  return [permission, requestPermission];
}
