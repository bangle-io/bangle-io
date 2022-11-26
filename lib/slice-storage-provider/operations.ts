import { WorkspaceType } from '@bangle.io/constants';
import { extensionRegistrySliceKey } from '@bangle.io/extension-registry';
import type { WorkspaceInfo } from '@bangle.io/shared-types';
import type { BaseStorageProvider } from '@bangle.io/storage';
import { HelpFsStorageProvider } from '@bangle.io/storage';
import { randomStr } from '@bangle.io/utils';

import { errorMap, storageProviderSliceKey } from './common';

let storageProviderErrorIdCounter = 0;
let storageProviderErrorPrefix = randomStr(4); // so that different instances of this module do not conflict

export function getStorageProvider(
  wsName: string,
  workspaceType: WorkspaceInfo['type'],
) {
  return storageProviderSliceKey.queryOp(
    (state): BaseStorageProvider | undefined => {
      const { extensionRegistry } =
        extensionRegistrySliceKey.getSliceStateAsserted(state);

      const provider =
        workspaceType === WorkspaceType.Help
          ? new HelpFsStorageProvider()
          : extensionRegistry.getStorageProvider(workspaceType);

      if (!provider) {
        return undefined;
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

              if ((result as any)?.then) {
                return (result as any).catch((err: unknown) => {
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
    },
  );
}
