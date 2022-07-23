import { Slice } from '@bangle.io/create-store';
import { assertActionName } from '@bangle.io/utils';

import { workspaceOpenedDocInfoKey } from './common';

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
          apple: '',
          banana: 0,
        };
      },
      apply(action, state) {
        switch (action.name) {
          case 'action::@bangle.io/slice-workspace-opened-doc-info:update-apple': {
            return {
              ...state,
              apple: action.value.apple,
            };
          }

          case 'action::@bangle.io/slice-workspace-opened-doc-info:update-banana': {
            return {
              ...state,
            };
          }

          default: {
            return state;
          }
        }
      },
    },
    actions: {
      'action::@bangle.io/slice-workspace-opened-doc-info:update-apple': (
        actionName,
      ) => {
        return workspaceOpenedDocInfoKey.actionSerializer(
          actionName,
          (action) => ({
            apple: action.value.apple,
          }),
          (serialVal) => ({
            apple: serialVal.apple,
          }),
        );
      },
      'action::@bangle.io/slice-workspace-opened-doc-info:update-banana': (
        actionName,
      ) => {
        return workspaceOpenedDocInfoKey.actionSerializer(
          actionName,
          (action) => ({
            banana: action.value.banana,
          }),
          (serialVal) => ({
            banana: serialVal.banana,
          }),
        );
      },
    },
    sideEffect: [mySideEffect],
  });
}

const mySideEffect = workspaceOpenedDocInfoKey.effect(() => {
  return {
    deferredUpdate(store, signal) {
      const { apple } = workspaceOpenedDocInfoKey.getSliceStateAsserted(
        store.state,
      );
      console.log('I am working yo workspaceOpenedDocInfo', apple);
    },
    update(store, prevState) {},
  };
});
