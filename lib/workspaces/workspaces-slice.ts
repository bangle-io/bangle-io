import { Slice } from '@bangle.io/create-store';
import { assertActionType } from '@bangle.io/utils';

import {
  WorkspacesSliceAction,
  workspacesSliceInitialState,
  workspacesSliceKey,
  WorkspacesSliceState,
} from './common';
import { mergeWsInfoRegistries } from './helpers';
import {
  refreshWorkspacesEffect,
  saveWorkspaceInfoEffect,
} from './side-effects';

export function workspacesSlice() {
  assertActionType('@bangle.io/workspaces', {} as WorkspacesSliceAction);
  return new Slice<WorkspacesSliceState, WorkspacesSliceAction>({
    key: workspacesSliceKey,
    state: {
      init() {
        return workspacesSliceInitialState;
      },
      apply(action, state) {
        switch (action.name) {
          case 'action::@bangle.io/workspaces:set-workspace-infos': {
            const existingWsInfos = state.workspaceInfos || {};

            const newWsInfos = mergeWsInfoRegistries(
              existingWsInfos,
              action.value.workspaceInfos,
            );

            return {
              ...state,
              workspaceInfos: newWsInfos,
            };
          }

          default: {
            return state;
          }
        }
      },
    },
    sideEffect: [refreshWorkspacesEffect, saveWorkspaceInfoEffect],
  });
}
