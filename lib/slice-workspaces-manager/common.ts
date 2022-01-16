import { WorkspaceType } from '@bangle.io/constants';
import {
  ApplicationStore,
  SliceKey,
  SliceSideEffect,
} from '@bangle.io/create-store';
import type { WorkspaceInfo } from '@bangle.io/shared-types';

export const WORKSPACE_KEY = 'workspaces/2';

export const HELP_FS_WORKSPACE_TYPE = 'helpfs';
export const HELP_FS_WORKSPACE_NAME = 'bangle-help';
export const HELP_FS_INDEX_FILE_NAME = 'getting started.md';
export const HELP_FS_INDEX_WS_PATH = `${HELP_FS_WORKSPACE_NAME}:${HELP_FS_INDEX_FILE_NAME}`;

export { WorkspaceType } from '@bangle.io/constants';

export type { WorkspaceInfo };

export const helpFSWorkspaceInfo: WorkspaceInfo = {
  metadata: {
    allowLocalChanges: true,
  },
  name: HELP_FS_WORKSPACE_NAME,
  type: WorkspaceType.helpfs,
  lastModified: Date.now(),
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
>('slice-workspaces-manager');

export type SideEffect = SliceSideEffect<
  WorkspacesSliceState,
  WorkspacesSliceAction
>;

export type WorkspacesAppStore = ApplicationStore<
  WorkspacesSliceState,
  WorkspacesSliceAction
>;

export type WorkspacesDispatchType = WorkspacesAppStore['dispatch'];
