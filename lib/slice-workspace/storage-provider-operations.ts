import { uuid } from '@bangle.dev/utils';

import { WorkspaceTypeHelp } from '@bangle.io/constants';
import { extensionRegistrySliceKey } from '@bangle.io/extension-registry';
import type { WorkspaceInfo } from '@bangle.io/shared-types';
import type { BaseStorageProvider } from '@bangle.io/storage';
import { HelpFsStorageProvider } from '@bangle.io/storage';

import { workspaceSliceKey } from './common';
import {
  WORKSPACE_STORAGE_PROVIDER_DOES_NOT_EXIST_ERROR,
  WorkspaceError,
} from './errors';

let storageProviderErrorIdCounter = 0;
let storageProviderErrorPrefix = uuid(4); // so that different instances of this module do not conflict

const errorMap = new WeakMap<
  Error,
  {
    wsName: string;
    provider: BaseStorageProvider;
    uid: string;
    workspaceType: string;
  }
>();

export function getStorageProviderErrorDetails(error: Error) {
  return errorMap.get(error);
}

export function getStorageProvider(
  wsName: string,
  workspaceType: WorkspaceInfo['type'],
) {
  return workspaceSliceKey.queryOp((state): BaseStorageProvider => {
    const { extensionRegistry } =
      extensionRegistrySliceKey.getSliceStateAsserted(state);

    const provider =
      workspaceType === WorkspaceTypeHelp
        ? new HelpFsStorageProvider()
        : extensionRegistry.getStorageProvider(workspaceType);

    if (!provider) {
      throw new WorkspaceError({
        message: `Storage provider "${workspaceType}" does not exist.`,
        code: WORKSPACE_STORAGE_PROVIDER_DOES_NOT_EXIST_ERROR,
      });
    }

    const markError = (error: unknown) => {
      if (error instanceof Error) {
        errorMap.set(error, {
          wsName,
          provider,
          uid: `${storageProviderErrorPrefix}-${storageProviderErrorIdCounter++}`,
          workspaceType: workspaceType,
        });
      }
    };

    return new Proxy(provider, {
      get(target, method) {
        let fun = Reflect.get(target, method);

        if (typeof fun !== 'function') {
          return fun;
        }

        return (...args: any[]) => {
          try {
            const result = Reflect.apply(fun, target, args);

            if (result?.then) {
              return result.catch((err: unknown) => {
                markError(err);

                throw err;
              });
            }

            return result;
          } catch (err) {
            markError(err);
            throw err;
          }
        };
      },
    });
  });
}
