import { AppState } from '@bangle.io/create-store';
import { workspaceSliceKey } from '@bangle.io/slice-workspace';

export {
  createNote,
  createWorkspace,
  deleteNote,
  deleteWorkspace,
  getNote,
  getStorageProviderName,
  getStorageProviderOpts,
  getWorkspaceMetadata,
  getWsName,
  goToWorkspaceAuthRoute,
  pushWsPath,
  refreshWsPaths,
  updateWorkspaceMetadata,
  workspaceSliceKey,
  writeNote,
} from '@bangle.io/slice-workspace';

export function getWorkspaceState() {
  return (state: AppState) => workspaceSliceKey.getSliceStateAsserted(state);
}
