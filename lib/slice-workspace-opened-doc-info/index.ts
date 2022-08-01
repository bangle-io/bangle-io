export type { OpenedFile } from './common';
export { workspaceOpenedDocInfoKey } from './common';
export {
  getOpenedDocInfo,
  updateCurrentDiskSha,
  updateDocInfo,
  updateLastKnownDiskSha,
  updateShas,
} from './operations';
export { workspaceOpenedDocInfoSlice } from './slice-workspace-opened-doc-info';
