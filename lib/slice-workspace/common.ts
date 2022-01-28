import { BaseError } from '@bangle.io/base-error';
import {
  ApplicationStore,
  ExtractAction,
  SliceKey,
  SliceSideEffect,
} from '@bangle.io/create-store';
import { OpenedWsPaths } from '@bangle.io/ws-path';

import type {
  WorkspaceInfoReg,
  WorkspaceSliceState,
} from './workspace-slice-state';

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
      name: 'action::@bangle.io/slice-workspace:set-error';
      value: {
        error: BaseError | undefined;
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
