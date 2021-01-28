import { specRegistry } from '../editor/spec-sheet';
import { IndexDbWorkspace } from '../workspace/workspace';
import { hasPermissions } from '../workspace/native-fs-driver';
import { WorkspacesInfo } from '../workspace/workspaces-info';

const pathValidRegex = /^[0-9a-zA-Z_\-. /:]+$/;
const last = (arr) => arr[arr.length - 1];

export function validatePath(wsPath) {
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
}

export function resolvePath(wsPath) {
  const [wsName, filePath] = wsPath.split(':');

  const docName = last(filePath.split('/'));

  return {
    wsName,
    docName,
    filePath,
  };
}

export async function getDoc(wsPath) {
  return (await getFile(wsPath))?.doc;
}

export async function saveDoc(wsPath, doc) {
  const { wsName, filePath } = resolvePath(wsPath);
  const docJson = doc.toJSON();
  const workspace = await getWorkspace(wsName);
  const workspaceFile = workspace.getFile(filePath);
  if (workspaceFile) {
    await workspaceFile.updateDoc(docJson);
    return;
  }
}

export async function getFile(wsPath = 'test3:dslkqk') {
  validatePath(wsPath);
  const { wsName, filePath } = resolvePath(wsPath);
  const workspace = await getWorkspace(wsName);

  if (!workspace.hasFile(filePath)) {
    throw new Error('File not found in workspace');
  }

  return workspace.getFile(filePath);
}

export async function getFiles(wsName = 'test3') {
  const workspace = await getWorkspace(wsName);
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

export async function wsQueryPermission(wsName) {
  const workspaceInfo = await getWorkspaceInfo(wsName);
  if (!workspaceInfo.metadata.dirHandle) {
    return true;
  }
  const result = Boolean(
    await hasPermissions(workspaceInfo.metadata.dirHandle),
  );

  return result;
}
