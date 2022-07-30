import { CollabMessageBus } from '@bangle.dev/collab-comms';

import { Slice } from '@bangle.io/create-store';
import { assertActionName, shallowCompareArray } from '@bangle.io/utils';

import { workerSliceFromNaukarKey } from './common';
import { resetEditorEffect } from './effects';

export function resetEditorAtWsPath(wsPaths: string[]) {
  return workerSliceFromNaukarKey.op((state, dispatch) => {
    return dispatch({
      name: 'action::@bangle.io/worker-slice-from-naukar:reset-editor',
      value: {
        wsPaths,
      },
    });
  });
}

export function workerSliceFromNaukarSlice() {
  assertActionName(
    '@bangle.io/worker-slice-from-naukar',
    workerSliceFromNaukarKey,
  );

  return new Slice({
    key: workerSliceFromNaukarKey,
    state: {
      init() {
        return {
          wsPathsToReset: [],
          collabMessageBus: new CollabMessageBus({}),
          port: undefined,
        };
      },
      apply(action, sliceState) {
        switch (action.name) {
          case 'action::@bangle.io/worker-slice-from-naukar:reset-editor': {
            const { wsPathsToReset } = sliceState;

            const newWsPathsToReset = Array.from(
              new Set([...wsPathsToReset, ...action.value.wsPaths]),
            );

            if (shallowCompareArray(wsPathsToReset, newWsPathsToReset)) {
              return sliceState;
            }

            return {
              ...sliceState,
              wsPathsToReset: newWsPathsToReset,
            };
          }
          case 'action::@bangle.io/worker-slice-from-naukar:reset-editor-done': {
            const { wsPathsToReset } = sliceState;
            const newWsPathsToReset = wsPathsToReset.filter(
              (wsPath) => !action.value.wsPaths.includes(wsPath),
            );

            if (shallowCompareArray(wsPathsToReset, newWsPathsToReset)) {
              return sliceState;
            }

            return {
              ...sliceState,
              wsPathsToReset: newWsPathsToReset,
            };
          }
        }

        return sliceState;
      },
    },
    actions: {
      'action::@bangle.io/worker-slice-from-naukar:reset-editor': (
        actionName,
      ) => {
        return workerSliceFromNaukarKey.actionSerializer(
          actionName,
          (action) => ({
            wsPaths: action.value.wsPaths,
          }),
          (serialVal) => ({
            wsPaths: serialVal.wsPaths,
          }),
        );
      },
      'action::@bangle.io/worker-slice-from-naukar:reset-editor-done': (
        actionName,
      ) => {
        return workerSliceFromNaukarKey.actionSerializer(
          actionName,
          (action) => ({
            wsPaths: action.value.wsPaths,
          }),
          (serialVal) => ({
            wsPaths: serialVal.wsPaths,
          }),
        );
      },
    },
    sideEffect: [resetEditorEffect],
  });
}
