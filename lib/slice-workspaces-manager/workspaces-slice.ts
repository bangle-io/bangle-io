import { ExtractAction, Slice } from '@bangle.io/create-store';
import { assertActionName } from '@bangle.io/utils';

import {
  WorkspacesSliceAction,
  workspacesSliceInitialState,
  workspacesSliceKey,
  WorkspacesSliceState,
} from './common';
import { mergeWsInfoRegistries } from './helpers';
import { refreshWorkspacesEffect } from './side-effects';

export function workspacesSlice() {
  assertActionName('@bangle.io/slice-workspaces-manager', workspacesSliceKey);
  return new Slice<WorkspacesSliceState, WorkspacesSliceAction>({
    key: workspacesSliceKey,
    state: {
      init() {
        return workspacesSliceInitialState;
      },
      apply(action, state) {
        switch (action.name) {
          case 'action::@bangle.io/slice-workspaces-manager:set-workspace-infos': {
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
    actions: {
      'action::@bangle.io/slice-workspaces-manager:set-workspace-infos': (
        actionName,
      ) => {
        const toJSON = (
          action: ExtractAction<WorkspacesSliceAction, typeof actionName>,
        ) => {
          return action.value;
        };
        const fromJSON = (obj: ReturnType<typeof toJSON>) => {
          return obj;
        };

        return {
          toJSON,
          fromJSON,
        };
      },
    },
    sideEffect: [refreshWorkspacesEffect],
  });
}
