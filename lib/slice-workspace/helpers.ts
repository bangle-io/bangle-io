import { WorkspaceType } from '@bangle.io/constants';
import { ExtensionRegistry } from '@bangle.io/extension-registry';
import type { WorkspaceInfo } from '@bangle.io/shared-types';
import { BaseStorageProvider, HelpFsStorageProvider } from '@bangle.io/storage';
import { isValidNoteWsPath, OpenedWsPaths } from '@bangle.io/ws-path';

import { WorkspaceSliceState } from './workspace-slice-state';

export function validateOpenedWsPaths(openedWsPath: OpenedWsPaths):
  | {
      valid: true;
    }
  | {
      invalidWsPath: string;
      valid: false;
    } {
  let invalidWsPath: string | undefined = undefined;

  openedWsPath.forEachWsPath((path) => {
    if (invalidWsPath || path == null) {
      return;
    }

    if (!isValidNoteWsPath(path)) {
      invalidWsPath = path;
    }
  });

  if (invalidWsPath) {
    return { valid: false, invalidWsPath: invalidWsPath };
  }

  return {
    valid: true,
  };
}

export function getPrevOpenedWsPathsFromSearch(
  search?: string,
): OpenedWsPaths | undefined {
  let searchParams = new URLSearchParams(search);
  let prev = searchParams.get('ws_paths');
  if (prev) {
    try {
      let openedWsPaths = OpenedWsPaths.createFromArray(JSON.parse(prev));
      return openedWsPaths;
    } catch (err) {
      return undefined;
    }
  }

  return undefined;
}

export function savePrevOpenedWsPathsToSearch(
  openedWsPaths: OpenedWsPaths,
  searchParams: URLSearchParams,
) {
  if (openedWsPaths.hasSomeOpenedWsPaths()) {
    searchParams.append('ws_paths', JSON.stringify(openedWsPaths.toArray()));
  }
}

export const getWsInfoIfNotDeleted = (
  wsName: string,
  workspacesInfo: Exclude<WorkspaceSliceState['workspacesInfo'], undefined>,
) => {
  const wsInfo = workspacesInfo[wsName];

  return wsInfo?.deleted ? undefined : wsInfo;
};

const storageProviderError = new WeakMap<
  Error,
  { name: BaseStorageProvider['name'] }
>();

const storageProviderProxy = new WeakMap<
  BaseStorageProvider,
  BaseStorageProvider
>();

export function isStorageProviderError(error) {
  return storageProviderError.has(error);
}
export function getStorageProviderNameFromError(error) {
  return storageProviderError.get(error)?.name;
}

export function storageProviderErrorHandlerFromExtensionRegistry(
  workspaceType: string,
  extensionRegistry: ExtensionRegistry,
) {
  const errorHandler =
    extensionRegistry.getOnStorageErrorHandlers(workspaceType);

  return errorHandler;
}

export function storageProviderFromExtensionRegistry(
  workspaceType: WorkspaceType,
  extensionRegistry: ExtensionRegistry,
) {
  let provider: BaseStorageProvider | undefined;

  if (workspaceType === WorkspaceType.helpfs) {
    provider = new HelpFsStorageProvider();
  } else {
    provider = extensionRegistry.getStorageProvider(workspaceType);
  }

  if (!provider) {
    return undefined;
  }

  let existingProxy = storageProviderProxy.get(provider);

  if (existingProxy) {
    return existingProxy;
  }

  let proxy = new Proxy(provider, {
    get(target, method) {
      let fun = Reflect.get(target, method);
      if (typeof fun === 'function') {
        return (...args) => {
          try {
            const result = Reflect.apply(fun, target, args);

            if (result.then) {
              return result.catch((err) => {
                if (err instanceof Error) {
                  storageProviderError.set(err, { name: target.name });
                }
                throw err;
              });
            }

            return result;
          } catch (err) {
            if (err instanceof Error) {
              storageProviderError.set(err, { name: target.name });
            }
            throw err;
          }
        };
      } else {
        return fun;
      }
    },
  });

  storageProviderProxy.set(provider, proxy);

  return proxy;
}
