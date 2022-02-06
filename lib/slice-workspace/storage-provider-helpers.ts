import { BaseStorageProvider } from '@bangle.io/storage';

const STORAGE_PROVIDER_ERROR_PREFIX =
  '@bangle.io/slice-workspace:storage-provider-error:';

export const storageProviderHelpers = {
  isStorageProviderError(error: unknown): boolean {
    return typeof this.getStorageProviderNameFromError(error) === 'string';
  },

  getStorageProviderNameFromError(error: unknown): string | undefined {
    if (
      error instanceof Error &&
      error.thrower?.startsWith(STORAGE_PROVIDER_ERROR_PREFIX)
    ) {
      return error.thrower.split(STORAGE_PROVIDER_ERROR_PREFIX)[1];
    }
    return undefined;
  },

  markAsStorageProviderError(
    error: unknown,
    name: BaseStorageProvider['name'],
  ) {
    if (!(error instanceof Error)) {
      return;
    }

    if (
      storageProviderHelpers.getStorageProviderNameFromError(error) === name
    ) {
      return;
    }

    if (error.thrower) {
      console.warn(`${error.name} already has a thrower: ${error.thrower}`);
    }

    error.thrower = STORAGE_PROVIDER_ERROR_PREFIX + name;
  },
};
