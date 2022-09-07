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
  getStorageProviderOpts,
  getWsName,
  goToWorkspaceAuthRoute,
  pushWsPath,
  refreshWsPaths,
  workspaceSliceKey,
  writeNote,
} from '@bangle.io/slice-workspace';
export {
  readWorkspaceInfo,
  readWorkspaceMetadata,
} from '@bangle.io/workspace-info';
export function getWorkspaceState() {
  return (state: AppState) => workspaceSliceKey.getSliceStateAsserted(state);
}
