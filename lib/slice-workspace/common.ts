import type { ApplicationStore, ExtractAction } from '@bangle.io/create-store';
import { SliceKey } from '@bangle.io/create-store';
import type { WorkspaceInfo } from '@bangle.io/shared-types';
import type { OpenedWsPaths } from '@bangle.io/ws-path';

import type { WorkspaceSliceState } from './workspace-slice-state';

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
      value: {};
    }
  | {
      name: 'action::@bangle.io/slice-workspace:set-cached-workspace-info';
      value: {
        workspaceInfo?: WorkspaceInfo;
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
