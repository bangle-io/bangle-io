import {
  HELP_FS_WORKSPACE_NAME,
  WorkspaceTypeHelp,
} from '@bangle.io/constants';
import type {
  ApplicationStore,
  ExtractAction,
  SliceSideEffect,
} from '@bangle.io/create-store';
import { SliceKey } from '@bangle.io/create-store';
import type { WorkspaceInfo } from '@bangle.io/shared-types';
import type { OpenedWsPaths } from '@bangle.io/ws-path';

import type {
  WorkspaceInfoReg,
  WorkspaceSliceState,
} from './workspace-slice-state';

let cachedHelpFs: WorkspaceInfo | undefined = undefined;

export const helpFSWorkspaceInfo = (): WorkspaceInfo => {
  if (!cachedHelpFs) {
    cachedHelpFs = {
      deleted: false,
      metadata: {
        allowLocalChanges: true,
      },
      name: HELP_FS_WORKSPACE_NAME,
      type: WorkspaceTypeHelp,
      lastModified: Date.now(),
    };
  }

  return cachedHelpFs;
};

export const workspaceSliceKey = new SliceKey<
  WorkspaceSliceState,
  WorkspaceSliceAction
>('slice-workspace');

export type WorkspaceSliceAction =
  | {
      name: 'action::@bangle.io/slice-workspace:set-opened-workspace';
      value: {
        wsName: string | undefined;
        openedWsPaths: OpenedWsPaths;
      };
    }
  | {
      name: 'action::@bangle.io/slice-workspace:update-recently-used-ws-paths';
      value: {
        // the workspace corresponding to the wsPaths
        wsName: string;
        recentlyUsedWsPaths: string[] | undefined;
      };
    }
  | {
      name: 'action::@bangle.io/slice-workspace:update-ws-paths';
      value: {
        // the workspace corresponding to the wsPaths
        wsName: string;
        wsPaths: string[] | undefined;
      };
    }
  | {
      name: 'action::@bangle.io/slice-workspace:refresh-ws-paths';
      // TODO : quick fix to keep typescript and serialization happy
      value?: undefined;
    }
  | {
      name: 'action::@bangle.io/slice-workspace:set-workspace-infos';
      value: {
        workspacesInfo: WorkspaceInfoReg;
      };
    }
  | {
      name: 'action::@bangle.io/slice-workspace:set-cached-workspace-info';
      value: {
        workspaceInfo?: WorkspaceInfo;
      };
    }
  | {
      name: 'action::@bangle.io/slice-workspace:set-error';
      value: {
        error: Error | undefined;
      };
    };

export type WorkspaceAppStore = ApplicationStore<
  WorkspaceSliceState,
  WorkspaceSliceAction
>;

export type ExtractWorkspaceSliceAction<
  ActionName extends WorkspaceSliceAction['name'],
> = ExtractAction<WorkspaceSliceAction, ActionName>;

export type WorkspaceDispatchType = WorkspaceAppStore['dispatch'];
