import { specRegistry } from '../editor/spec-sheet';
import { IndexDbWorkspace } from '../workspace/workspace';
import { WorkspacesInfo } from '../workspace/workspaces-info';

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

export async function getFile(wsPath = 'bangle-61:8o4fja') {
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
