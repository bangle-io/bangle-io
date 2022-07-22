import { collabClient } from '@bangle.dev/collab-client';

import { dispatchEditorCommand } from '@bangle.io/slice-editor-manager';
import {
  getOpenedWsPaths,
  workspaceSliceKey,
} from '@bangle.io/slice-workspace';
import { assertNonWorkerGlobalScope } from '@bangle.io/utils';

import { workerSliceFromNaukarKey } from './common';

export const resetEditorEffect = workerSliceFromNaukarKey.effect(() => {
  // must be run in window context because we want this slice to carry out
  // side effects in main context
  assertNonWorkerGlobalScope();

  return {
    update(store, prevState) {
      const wsPathsToReset = workerSliceFromNaukarKey.getValueIfChanged(
        'wsPathsToReset',
        store.state,
        prevState,
      );

      if (!wsPathsToReset || wsPathsToReset.length === 0) {
        return;
      }

      const openedWsPaths = getOpenedWsPaths()(
        workspaceSliceKey.getState(store.state),
      );
      store.dispatch({
        name: 'action::@bangle.io/worker-slice-from-naukar:reset-editor-done',
        value: {
          wsPaths: wsPathsToReset,
        },
      });
      wsPathsToReset.forEach((wsPathToReset) => {
        openedWsPaths.forEachWsPath((wsPath, index) => {
          if (wsPathToReset === wsPath) {
            queueMicrotask(() => {
              console.warn('Resetting editor for wsPath:', wsPath);
              dispatchEditorCommand(
                index,
                collabClient.commands.hardResetClient(),
              )(store.state);
            });
          }
        });
      });
    },
  };
});
