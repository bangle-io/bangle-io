export const HELP_FS_WORKSPACE_TYPE = 'helpfs';
export const HELP_FS_WORKSPACE_NAME = 'bangle-help';
export const HELP_FS_INDEX_FILE_NAME = 'getting started.md';

export const HELP_FS_INDEX_WS_PATH = `${HELP_FS_WORKSPACE_NAME}:${HELP_FS_INDEX_FILE_NAME}`;

export enum WorkspaceType {
  browser = 'browser',
  nativefs = 'nativefs',
  githubReadFs = 'github-read-fs',
  helpfs = 'helpfs',
}
export const helpFSWorkspaceInfo = {
  metadata: {
    allowLocalChanges: true,
  },
  name: HELP_FS_WORKSPACE_NAME,
  type: WorkspaceType.helpfs,
};

export interface WorkspaceInfo {
  name: string;
  type: WorkspaceType;
  metadata: {
    [k: string]: any;
  };
}
