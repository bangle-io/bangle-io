import {
  ApplicationStore,
  SliceKey,
  SliceSideEffect,
} from '@bangle.io/create-store';

export const WORKSPACE_KEY = 'workspaces/2';

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

export const helpFSWorkspaceInfo: WorkspaceInfo = {
  metadata: {
    allowLocalChanges: true,
  },
  name: HELP_FS_WORKSPACE_NAME,
  type: WorkspaceType.helpfs,
  lastModified: Date.now(),
};

export type WorkspaceInfo =
  | {
      name: string;
      type: WorkspaceType;
      deleted?: boolean;
      lastModified: number;
      metadata: {
        [k: string]: any;
      };
    }
  | {
      name: string;
      type: WorkspaceType.nativefs;
      deleted?: boolean;
      lastModified: number;
      metadata: {
        rootDirHandle: any;
        [k: string]: any;
      };
    };

export type WorkspaceInfoReg = {
  [wsName: string]: WorkspaceInfo;
};

export const workspacesSliceInitialState: WorkspacesSliceState = {
  pendingWorkspaceInfos: undefined,
  workspaceInfos: undefined,
};

export interface WorkspacesSliceState {
  workspaceInfos: WorkspaceInfoReg | undefined;
  pendingWorkspaceInfos: Promise<WorkspaceInfo[]> | undefined;
}

export type WorkspacesSliceAction = {
  name: 'action::@bangle.io/slice-workspaces-manager:set-workspace-infos';
  value: { workspaceInfos: WorkspaceInfoReg };
};

export const workspacesSliceKey = new SliceKey<
  WorkspacesSliceState,
  WorkspacesSliceAction
>('workspaces-slice');

export type SideEffect = SliceSideEffect<
  WorkspacesSliceState,
  WorkspacesSliceAction
>;

export type WorkspacesAppStore = ApplicationStore<
  WorkspacesSliceState,
  WorkspacesSliceAction
>;

export type WorkspacesDispatchType = WorkspacesAppStore['dispatch'];
