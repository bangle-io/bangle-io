import type { ActionsSerializersType } from '@bangle.io/create-store';
import { errorParse, errorSerialize } from '@bangle.io/utils';
import { OpenedWsPaths } from '@bangle.io/ws-path';

import type { WorkspaceSliceAction } from './common';
import { workspaceSliceKey } from './common';
import { storageProviderHelpers } from './storage-provider-helpers';

export const ActionSerializers: ActionsSerializersType<WorkspaceSliceAction> = {
  'action::@bangle.io/slice-workspace:set-cached-workspace-info': (
    actionName,
  ) => {
    return workspaceSliceKey.actionSerializer(
      actionName,
      (action) => {
        return action.value;
      },
      (obj) => {
        return obj;
      },
    );
  },

  'action::@bangle.io/slice-workspace:set-error': (actionName) => {
    return workspaceSliceKey.actionSerializer(
      actionName,
      (action) => {
        if (!action.value.error) {
          return {
            storageProviderError: null,
            error: null,
          };
        }

        const { error } = action.value;

        const storageProviderError =
          storageProviderHelpers.getStorageProviderNameFromError(error) ?? null;

        return {
          storageProviderError,
          error: errorSerialize(error),
        };
      },
      (obj) => {
        const error = obj.error ? errorParse(obj.error) : undefined;

        if (error && obj.storageProviderError) {
          storageProviderHelpers.markAsStorageProviderError(
            error,
            obj.storageProviderError,
          );
        }

        return {
          error,
        };
      },
    );
  },

  'action::@bangle.io/slice-workspace:set-opened-workspace': (actionName) => {
    return workspaceSliceKey.actionSerializer(
      actionName,
      (action) => {
        return {
          openedWsPaths: action.value.openedWsPaths.toArray(),
          wsName: action.value.wsName || null,
        };
      },
      (obj) => {
        return {
          openedWsPaths: OpenedWsPaths.createFromArray(obj.openedWsPaths),
          wsName: obj.wsName || undefined,
        };
      },
    );
  },

  'action::@bangle.io/slice-workspace:update-recently-used-ws-paths': (
    actionName,
  ) => {
    return workspaceSliceKey.actionSerializer(
      actionName,
      (action) => {
        return {
          wsName: action.value.wsName,
          recentlyUsedWsPaths: action.value.recentlyUsedWsPaths || null,
        };
      },
      (obj) => {
        return {
          wsName: obj.wsName,
          recentlyUsedWsPaths: obj.recentlyUsedWsPaths || undefined,
        };
      },
    );
  },

  'action::@bangle.io/slice-workspace:update-ws-paths': (actionName) => {
    return workspaceSliceKey.actionSerializer(
      actionName,
      (action) => {
        return {
          wsName: action.value.wsName,
          wsPaths: action.value.wsPaths || null,
        };
      },
      (obj) => {
        return {
          wsName: obj.wsName,
          wsPaths: obj.wsPaths || undefined,
        };
      },
    );
  },

  'action::@bangle.io/slice-workspace:refresh-ws-paths': (actionName) => {
    return workspaceSliceKey.actionSerializer(
      actionName,
      (action) => {
        return undefined;
      },
      (obj) => {
        return undefined;
      },
    );
  },
};
