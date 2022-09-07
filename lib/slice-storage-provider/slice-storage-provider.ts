import { Slice } from '@bangle.io/create-store';
import { assertActionName } from '@bangle.io/utils';

import { storageProviderKey } from './common';

export function storageProviderSlice() {
  assertActionName('@bangle.io/slice-storage-provider', storageProviderKey);

  return new Slice({
    key: storageProviderKey,
    state: {
      init() {
        return {
          apple: '',
          banana: 0,
        };
      },
      apply(action, state) {
        switch (action.name) {
          case 'action::@bangle.io/slice-storage-provider:update-apple': {
            return {
              ...state,
              apple: action.value.apple,
            };
          }

          case 'action::@bangle.io/slice-storage-provider:update-banana': {
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
      'action::@bangle.io/slice-storage-provider:update-apple': (
        actionName,
      ) => {
        return storageProviderKey.actionSerializer(
          actionName,
          (action) => ({
            apple: action.value.apple,
          }),
          (serialVal) => ({
            apple: serialVal.apple,
          }),
        );
      },
      'action::@bangle.io/slice-storage-provider:update-banana': (
        actionName,
      ) => {
        return storageProviderKey.actionSerializer(
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

const mySideEffect = storageProviderKey.effect(() => {
  return {
    deferredUpdate(store, signal) {
      const { apple } = storageProviderKey.getSliceStateAsserted(store.state);
      console.log('I am working yo storageProvider', apple);
    },
    update(store, prevState) {},
  };
});
