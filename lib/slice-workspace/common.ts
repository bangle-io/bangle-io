import {
  ApplicationStore,
  ExtractAction,
  SliceKey,
  SliceSideEffect,
} from '@bangle.io/create-store';
import { OpenedWsPaths } from '@bangle.io/ws-path';

import type { WorkspaceSliceState } from './workspace-slice-state';

export const workspaceSliceKey = new SliceKey<
  WorkspaceSliceState,
  WorkspaceSliceAction
>('slice-workspace');

export type SideEffect = SliceSideEffect<
  WorkspaceSliceState,
  WorkspaceSliceAction
>;

export type WorkspaceSliceAction =
  | {
      name: 'action::@bangle.io/slice-workspace:sync-page-location';
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
      name: 'action::@bangle.io/slice-workspace:set-pending-refresh-ws-paths';
      value: {
        pendingRefreshWsPaths: string | undefined;
      };
    };

export type ExtractWorkspaceSliceAction<
  ActionName extends WorkspaceSliceAction['name'],
> = ExtractAction<WorkspaceSliceAction, ActionName>;

export type WorkspaceDispatchType = ApplicationStore<
  WorkspaceSliceState,
  WorkspaceSliceAction
>['dispatch'];
