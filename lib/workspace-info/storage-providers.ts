import type { ExtensionRegistry } from '@bangle.io/shared-types';
import type { BaseStorageProvider, StorageOpts } from '@bangle.io/storage';

import {
  readWorkspaceMetadata,
  updateWorkspaceMetadata,
} from './workspace-info';

// TODO make this nominal type
type StorageProviderType = string;

const storageProviders: Record<string, StorageProviderConfig> = {};

interface StorageProviderConfig {
  provider: BaseStorageProvider;
  options: StorageOpts;
}

export function getStorageProviderObj(
  storageProvideType: StorageProviderType,
): StorageProviderConfig {
  const obj = storageProviders[storageProvideType];

  if (!obj) {
    throw new Error(`No storage provider found for type ${storageProvideType}`);
  }

  return obj;
}

export function registerStorageProvider(
  provider: BaseStorageProvider,
  specRegistry: ExtensionRegistry['specRegistry'],
) {
  const options: StorageOpts = {
    specRegistry: specRegistry,
    readWorkspaceMetadata: async (wsName: string) => {
      return (await readWorkspaceMetadata(wsName)) || {};
    },
    updateWorkspaceMetadata: async (wsName, metadata) => {
      await updateWorkspaceMetadata(wsName, () => metadata);
    },
  };

  storageProviders[provider.name] = {
    provider,
    options,
  };
}
