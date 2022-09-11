import {
  getOpenedWsPaths,
  workspaceSliceKey,
} from '@bangle.io/slice-workspace';

import { SYNC_ENTRIES, workspaceOpenedDocInfoKey } from './common';

export const syncWithOpenedWsPathsEffect = workspaceOpenedDocInfoKey.effect(
  () => {
    return {
      async update(store, prevState) {
        const openedWsPaths = getOpenedWsPaths()(
          workspaceSliceKey.getState(store.state),
        );

        const prevOpenedWsPaths = getOpenedWsPaths()(
          workspaceSliceKey.getState(prevState),
        );

        if (
          openedWsPaths === prevOpenedWsPaths &&
          !workspaceOpenedDocInfoKey.valueChanged(
            'openedFiles',
            store.state,
            prevState,
          )
        ) {
          return;
        }

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
  },
);
