import { BaseStorageProvider } from '@bangle.io/storage';

const STORAGE_PROVIDER_ERROR_KEY = '@BANGLE.IO/STORAGE_PROVIDER_ERROR';

export const storageProviderHelpers = {
  isStorageProviderError(error: unknown): boolean {
    return typeof this.getStorageProviderNameFromError(error) === 'string';
  },

  getStorageProviderNameFromError(error: unknown): string | undefined {
    if (
      error instanceof Error &&
      Object.prototype.hasOwnProperty.call(error, STORAGE_PROVIDER_ERROR_KEY)
    ) {
      const value = error[STORAGE_PROVIDER_ERROR_KEY];
      if (typeof value === 'string') {
        return value;
      }
    }
    return undefined;
  },

  markAsStorageProviderError(
    error: unknown,
    name: BaseStorageProvider['name'],
  ) {
    if (error instanceof Error) {
      error[STORAGE_PROVIDER_ERROR_KEY] = name;
    }
  },
};
