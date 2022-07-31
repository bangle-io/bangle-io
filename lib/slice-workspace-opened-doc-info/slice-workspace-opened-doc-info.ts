import { Slice } from '@bangle.io/create-store';
import {
  getOpenedWsPaths,
  workspaceSliceKey,
} from '@bangle.io/slice-workspace';
import { assertActionName } from '@bangle.io/utils';

import type { OpenedFile } from './common';
import {
  BULK_UPDATE_SHAS,
  SYNC_ENTRIES,
  UPDATE_ENTRY,
  workspaceOpenedDocInfoKey,
} from './common';

export function workspaceOpenedDocInfoSlice() {
  assertActionName(
    '@bangle.io/slice-workspace-opened-doc-info',
    workspaceOpenedDocInfoKey,
  );

  return new Slice({
    key: workspaceOpenedDocInfoKey,
    state: {
      init() {
        return {
          openedFiles: {},
        };
      },
      apply(action, state) {
        switch (action.name) {
          case SYNC_ENTRIES: {
            const { removals, additions } = action.value;

            if (removals.length === 0 && additions.length === 0) {
              return state;
            }

            const newOpenedFiles = { ...state.openedFiles };
            removals.forEach((wsPath) => {
              delete newOpenedFiles[wsPath];
            });
            additions.forEach((wsPath) => {
              newOpenedFiles[wsPath] = {
                wsPath,
                pendingWrite: false,
              };
            });

            return {
              ...state,
              openedFiles: newOpenedFiles,
            };
          }

          case UPDATE_ENTRY: {
            const { openedFiles } = state;

            const entry = openedFiles[action.value.wsPath];

            if (!entry) {
              return state;
            }

            // do a merge of entry updating any that was provided
            const newEntry: OpenedFile = {
              ...entry,
              ...action.value.info,
            };

            const newOpenedFiles = {
              ...openedFiles,
              [action.value.wsPath]: newEntry,
            };

            return {
              ...state,
              openedFiles: newOpenedFiles,
            };
          }

          case BULK_UPDATE_SHAS: {
            const { openedFiles } = state;

            const { data } = action.value;

            if (data.length === 0) {
              return state;
            }

            const newOpenedFiles = { ...openedFiles };

            for (const { wsPath, ...info } of data) {
              const entry = newOpenedFiles[wsPath];

              if (!entry) {
                continue;
              }

              newOpenedFiles[wsPath] = {
                ...entry,
                ...info,
                currentDiskShaTimestamp: Date.now(),
              };
            }

            return {
              ...state,
              openedFiles: newOpenedFiles,
            };
          }
        }

        return state;
      },
    },
    actions: {
      [SYNC_ENTRIES]: (actionName) => {
        return workspaceOpenedDocInfoKey.actionSerializer(
          actionName,
          (action) => ({
            additions: action.value.additions,
            removals: action.value.removals,
          }),
          (serialVal) => ({
            additions: serialVal.additions,
            removals: serialVal.removals,
          }),
        );
      },
      [UPDATE_ENTRY]: (actionName) => {
        return workspaceOpenedDocInfoKey.actionSerializer(
          actionName,
          (action) => ({
            wsPath: action.value.wsPath,
            info: action.value.info,
          }),
          (serialVal) => ({
            wsPath: serialVal.wsPath,
            info: serialVal.info,
          }),
        );
      },
      [BULK_UPDATE_SHAS]: (actionName) => {
        return workspaceOpenedDocInfoKey.actionSerializer(
          actionName,
          (action) => ({
            data: action.value.data,
          }),
          (serialVal) => ({
            data: serialVal.data,
          }),
        );
      },
    },
    sideEffect: [syncWithOpenedWsPathsEffect],
  });
}

const syncWithOpenedWsPathsEffect = workspaceOpenedDocInfoKey.effect(() => {
  return {
    async update(store) {
      const openedWsPaths = getOpenedWsPaths()(
        workspaceSliceKey.getState(store.state),
      );

      const { openedFiles } = workspaceOpenedDocInfoKey.getSliceStateAsserted(
        store.state,
      );

      let additions: string[] = [];
      let removals: string[] = [];

      // cleanup data that is not opened anymore and does not have a pending write
      Object.entries(openedFiles).forEach(([wsPath, val]) => {
        if (!openedWsPaths.has(wsPath) && !val.pendingWrite) {
          removals.push(wsPath);
        }
      });

      // add new data
      openedWsPaths.getWsPaths().forEach((wsPath) => {
        if (!openedFiles[wsPath]) {
          additions.push(wsPath);
        }
      });

      if (additions.length > 0 || removals.length > 0) {
        store.dispatch({
          name: SYNC_ENTRIES,
          value: {
            additions,
            removals,
          },
        });
      }
    },
  };
});
