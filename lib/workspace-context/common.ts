import {
  ApplicationStore,
  SliceKey,
  SliceSideEffect,
} from '@bangle.io/create-store';

import type { WorkspaceSliceState } from './slice-state';

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
        locationSearchQuery: string | undefined;
        locationPathname: string | undefined;
      };
    }
  | {
      name: 'action::workspace-context:update-recently-used-ws-paths';
      value: string[] | undefined;
    }
  | {
      name: 'action::workspace-context:update-ws-paths';
      value: string[] | undefined;
    };

export type WorkspaceDispatchType = ApplicationStore<
  WorkspaceSliceState,
  WorkspaceSliceAction
>['dispatch'];
