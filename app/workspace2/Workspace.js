import { useContext, useEffect, useState } from 'react';
import { specRegistry } from '../editor/spec-sheet';
import { IndexDbWorkspace } from '../workspace/workspace';
import { WorkspacesInfo } from '../workspace/workspaces-info';
import { EditorManagerContext } from './EditorManager';

const pathValidRegex = /^[0-9a-zA-Z_\-. /:]+$/;
const last = (arr) => arr[arr.length - 1];

const pathHelpers = {
  validPath(wsPath) {
    if (
      !pathValidRegex.test(wsPath) ||
      wsPath.split('/').some((r) => r.length === 0)
    ) {
      console.log(wsPath);
      throw new Error('Invalid path ' + wsPath);
    }

    if ((wsPath.match(/:/g) || []).length !== 1) {
      console.log(wsPath);
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
  const availableWorkspacesInfo = await WorkspacesInfo.list();
  const workspaceInfo = availableWorkspacesInfo.find(
    ({ name }) => name === wsName,
  );

  const workspace = await IndexDbWorkspace.openExistingWorkspace(
    workspaceInfo,
    specRegistry.schema,
  );

  const workspaceFile = workspace.getFile(docName);

  if (workspaceFile) {
    await workspaceFile.updateDoc(docJson);
    return;
  }
}

export async function getFile(wsPath = 'test3:0qioz1') {
  pathHelpers.validPath(wsPath);
  const { docName, wsName, filePath } = pathHelpers.resolve(wsPath);
  const availableWorkspacesInfo = await WorkspacesInfo.list();
  const workspaceInfo = availableWorkspacesInfo.find(
    ({ name }) => name === wsName,
  );
  const workspace = await IndexDbWorkspace.openExistingWorkspace(
    workspaceInfo,
    specRegistry.schema,
  );

  if (!workspace.hasFile(filePath)) {
    console.log({ docName, workspace });
    throw new Error('File not found in workspace');
  }

  return workspace.getFile(filePath);
}

export async function getFiles(wsName = 'test3') {
  const availableWorkspacesInfo = await WorkspacesInfo.list();
  const workspaceInfo = availableWorkspacesInfo.find(
    ({ name }) => name === wsName,
  );
  const workspace = await IndexDbWorkspace.openExistingWorkspace(
    workspaceInfo,
    specRegistry.schema,
  );

  return workspace.files;
}

export function useGetWorkspaceFiles() {
  const {
    editorManagerState: { wsName },
  } = useContext(EditorManagerContext);
  const [files, setFiles] = useState([]);

  useEffect(() => {
    getFiles(wsName).then((items) => {
      setFiles(items);
    });
  }, [wsName]);

  return files;
}
