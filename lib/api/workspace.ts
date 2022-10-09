import type { AppState } from '@bangle.io/create-store';
import { workspaceSliceKey } from '@bangle.io/slice-workspace';

export {
  closeMiniEditor,
  closeOpenedEditor,
  createNote,
  createWorkspace,
  deleteNote,
  deleteWorkspace,
  getNote,
  getOpenedWsPaths,
  getWsName,
  goToWorkspaceAuthRoute,
  pushWsPath,
  refreshWsPaths,
  updateOpenedWsPaths,
  workspaceSliceKey,
  writeNote,
} from '@bangle.io/slice-workspace';
export {
  readAllWorkspacesInfo,
  readWorkspaceInfo,
  readWorkspaceMetadata,
} from '@bangle.io/workspace-info';
export function getWorkspaceState() {
  return (state: AppState) => workspaceSliceKey.getSliceStateAsserted(state);
}
