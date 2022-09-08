export type { WorkspaceDispatchType, WorkspaceSliceAction } from './common';
export { workspaceSliceKey } from './common';
export { WorkspaceError, WorkspaceErrorCode } from './errors';
export {
  checkFileExists,
  createNote,
  deleteNote,
  docToFile,
  getFile,
  getNote,
  getStorageProviderOpts,
  refreshWsPaths,
  renameNote,
  writeFile,
  writeNote,
} from './file-operations';
export {
  closeMiniEditor,
  closeOpenedEditor,
  getOpenedWsPaths,
  getWsName,
  goToLandingPage,
  goToWorkspaceAuthRoute,
  goToWorkspaceHomeRoute,
  goToWsNameRoute,
  goToWsNameRouteNotFoundRoute,
  pushWsPath,
  updateOpenedWsPaths,
} from './operations';
export { workspaceSlice, workspaceSliceInitialState } from './workspace-slice';
export type { WorkspaceSliceState } from './workspace-slice-state';
export type { WorkspaceContextType } from './WorkspaceContext';
export {
  useWorkspaceContext,
  WorkspaceContextProvider,
} from './WorkspaceContext';
export { createWorkspace, deleteWorkspace } from './workspaces-operations';
