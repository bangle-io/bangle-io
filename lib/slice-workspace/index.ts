export type { WorkspaceDispatchType, WorkspaceSliceAction } from './common';
export { workspaceSliceKey } from './common';
export { getLastWorkspaceUsed } from './last-seen-ws-name';
export {
  checkFileExists,
  createNote,
  deleteNote,
  getFile,
  getNote,
  goToWorkspaceHomeRoute,
  goToWsNameRoute,
  goToWsNameRouteNotFoundRoute,
  pushWsPath,
  refreshWsPaths,
  renameNote,
  saveFile,
  updateOpenedWsPaths,
} from './operations';
export { workspaceSlice } from './workspace-slice';
export type { WorkspaceSliceState } from './workspace-slice-state';
export type { WorkspaceContextType } from './WorkspaceContext';
export {
  useWorkspaceContext,
  WorkspaceContextProvider,
} from './WorkspaceContext';
