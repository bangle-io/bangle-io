import { Slice } from '@bangle.io/create-store';
import { extensionRegistrySliceKey } from '@bangle.io/extension-registry';
import { assertActionName } from '@bangle.io/utils';

import type { StorageProviderErrorInfo } from './common';
import { errorMap, storageProviderSliceKey } from './common';

export function storageProviderSlice() {
  assertActionName(
    '@bangle.io/slice-storage-provider',
    storageProviderSliceKey,
  );

  return new Slice({
    key: storageProviderSliceKey,
    onError: (error, store) => {
      const storageProviderErrorDetails = errorMap.get(error);

      if (storageProviderErrorDetails) {
        const serializedError =
          storageProviderErrorDetails.provider.serializeError(error);

        if (serializedError) {
          store.dispatch({
            name: 'action::@bangle.io/slice-storage-provider:set-storage-provider-error',
            value: {
              serializedError: serializedError,
              wsName: storageProviderErrorDetails.wsName,
              uid: storageProviderErrorDetails.uid,
              workspaceType: storageProviderErrorDetails.workspaceType,
            },
          });

          return true;
        } else {
          return false;
        }
      }

      return false;
    },
    state: {
      init() {
        return {
          errors: [],
        };
      },
      apply(action, state) {
        switch (action.name) {
          case 'action::@bangle.io/slice-storage-provider:set-storage-provider-error': {
            return {
              ...state,
              errors: [action.value, ...state.errors] // only keep few entries
                .slice(0, 5),
            };
          }

          default: {
            return state;
          }
        }
      },
    },
    actions: {
      'action::@bangle.io/slice-storage-provider:set-storage-provider-error': (
        actionName,
      ) => {
        return storageProviderSliceKey.actionSerializer(
          actionName,
          (action) => {
            return {
              serializedError: action.value.serializedError,
              wsName: action.value.wsName,
              uid: action.value.uid,
              workspaceType: action.value.workspaceType,
            };
          },
          (obj) => {
            return {
              serializedError: obj.serializedError,
              wsName: obj.wsName,
              uid: obj.uid,
              workspaceType: obj.workspaceType,
            };
          },
        );
      },
    },
    sideEffect: [propagateStorageProviderErrors],
  });
}

// Forwards error to the correct storage provider handler.
// Note: this exists here rather than in slice-workspace
// because extensions and their slices are currently run in the main window thread
// and slice-workspace runs in the worker thread.
// If this setting changes this effect will cease to work.
const propagateStorageProviderErrors = storageProviderSliceKey.effect(() => {
  const seenErrors = new WeakSet<StorageProviderErrorInfo>();

  return {
    update(store, prevState) {
      const storageProviderErrors = storageProviderSliceKey.getValueIfChanged(
        'errors',
        store.state,
        prevState,
      );

      if (!storageProviderErrors) {
        return;
      }

      for (const errorInfo of storageProviderErrors) {
        if (seenErrors.has(errorInfo)) {
          continue;
        }

        seenErrors.add(errorInfo);

        const { extensionRegistry } =
          extensionRegistrySliceKey.getSliceStateAsserted(store.state);

        const storageProvider = extensionRegistry.getStorageProvider(
          errorInfo.workspaceType,
        );

        const handler = extensionRegistry.getOnStorageErrorHandlers(
          errorInfo.workspaceType,
        );

        if (!handler || !storageProvider) {
          console.error(
            `Unable to handle error, storageProvider "${errorInfo.workspaceType}" not found`,
          );
          console.log(errorInfo);

          continue;
        }

        const error = storageProvider?.parseError(errorInfo.serializedError);

        if (error instanceof Error) {
          const handled = handler(error, store);

          if (!handled) {
            console.warn(
              `Unhandled storage error: ${error.message} for workspace type "${errorInfo.workspaceType}"`,
            );
          }
        } else {
          console.warn(
            `Unable to parse error "${errorInfo.uid}" for workspace type "${errorInfo.workspaceType}"`,
          );
          console.log(errorInfo);
        }
      }
    },
  };
});
