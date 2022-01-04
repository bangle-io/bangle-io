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
>('workspace-slice');

export type SideEffect = SliceSideEffect<
  WorkspaceSliceState,
  WorkspaceSliceAction
>;

export type WorkspaceSliceAction =
  | {
      name: 'action::workspace-context:update-location';
      value: {
        wsName: string | undefined;
        openedWsPaths: OpenedWsPaths;
      };
    }
  | {
      name: 'action::workspace-context:update-recently-used-ws-paths';
      value: {
        // the workspace corresponding to the wsPaths
        wsName: string;
        recentlyUsedWsPaths: string[] | undefined;
      };
    }
  | {
      name: 'action::workspace-context:update-ws-paths';
      value: {
        // the workspace corresponding to the wsPaths
        wsName: string;
        wsPaths: string[] | undefined;
      };
    }
  | {
      name: 'action::workspace-context:set-pending-refresh-ws-paths';
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
