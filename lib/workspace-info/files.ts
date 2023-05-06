import { readFileAsText as _readFileAsText } from '@bangle.io/baby-fs';
import type { ExtensionRegistry } from '@bangle.io/shared-types';
import type { BaseStorageProvider, StorageOpts } from '@bangle.io/storage';

import {
  readWorkspaceInfo,
  readWorkspaceMetadata,
  updateWorkspaceMetadata,
} from './workspace-info';

// TODO move this to nominal typing
type WsPath = string;
type StorageProviderType = string;

const storageProviders: Record<string, StorageProviderConfig> = {};

interface StorageProviderConfig {
  provider: BaseStorageProvider;
  options: StorageOpts;
}

export async function readFile(
  wsPath: WsPath,
  storageProvideType: StorageProviderType,
): Promise<File | undefined> {
  const { options, provider } = getStorageProviderObj(storageProvideType);

  return provider.readFile(wsPath, options);
}

export async function readFileAsText(
  wsPath: WsPath,
  storageProvideType: StorageProviderType,
): Promise<string | undefined> {
  const file = await readFile(wsPath, storageProvideType);

  if (file) {
    return _readFileAsText(file);
  }

  return undefined;
}

export async function writeFile(
  wsPath: WsPath,
  storageProvideType: StorageProviderType,
  file: File,
  sha?: string,
) {
  const { options, provider } = getStorageProviderObj(storageProvideType);
  await provider.writeFile(wsPath, file, options, sha);
}

export async function deleteFile(
  wsPath: WsPath,
  storageProvideType: StorageProviderType,
) {
  const { options, provider } = getStorageProviderObj(storageProvideType);
  await provider.deleteFile(wsPath, options);
}

function getStorageProviderObj(
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
