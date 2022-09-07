import { Slice, SliceKey } from '@bangle.io/create-store';
import { extensionRegistrySliceKey } from '@bangle.io/extension-registry';
import type { WorkspaceSliceState } from '@bangle.io/slice-workspace';
import { getWsName, workspaceSliceKey } from '@bangle.io/slice-workspace';

const storageProviderErrorKey = new SliceKey('storage-provider-error-slice');

export function storageProviderErrorSlice() {
  return new Slice({
    key: storageProviderErrorKey,
    sideEffect: [propagateStorageProviderErrors],
  });
}

// Forwards error to the correct storage provider handler.
// Note: this exists here rather than in slice-workspace
// because extensions and their slices are currently run in the main window thread
// and slice-workspace runs in the worker thread.
// If this setting changes this effect will cease to work.
const propagateStorageProviderErrors = storageProviderErrorKey.effect(() => {
  const seenErrors = new WeakSet<
    WorkspaceSliceState['storageProviderErrors'][0]
  >();

  return {
    update(store, prevState) {
      const storageProviderErrors = workspaceSliceKey.getValueIfChanged(
        'storageProviderErrors',
        store.state,
        prevState,
      );

      if (!storageProviderErrors) {
        return;
      }

      const wsName = getWsName()(store.state);

      for (const errorInfo of storageProviderErrors) {
        if (seenErrors.has(errorInfo)) {
          continue;
        }

        seenErrors.add(errorInfo);

        if (errorInfo.wsName !== wsName) {
          console.debug('Ignoring error for different workspace', errorInfo);
          continue;
        }

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
            `storageProvider "${errorInfo.workspaceType}" not found`,
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
