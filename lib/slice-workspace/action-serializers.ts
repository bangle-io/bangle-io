import { ActionsSerializersType } from '@bangle.io/create-store';
import { errorParse, errorSerialize } from '@bangle.io/utils';
import { OpenedWsPaths } from '@bangle.io/ws-path';

import { ExtractWorkspaceSliceAction, WorkspaceSliceAction } from './common';
import { storageProviderHelpers } from './storage-provider-helpers';

export const ActionSerializers: ActionsSerializersType<WorkspaceSliceAction> = {
  'action::@bangle.io/slice-workspace:set-workspace-infos': (actionName) => {
    const toJSON = (action: ExtractWorkspaceSliceAction<typeof actionName>) => {
      return action.value;
    };
    const fromJSON = (obj: ReturnType<typeof toJSON>) => {
      return obj;
    };

    return {
      toJSON,
      fromJSON,
    };
  },

  'action::@bangle.io/slice-workspace:set-error': (actionName) => {
    const toJSON = (action: ExtractWorkspaceSliceAction<typeof actionName>) => {
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
    };

    const fromJSON = (obj: ReturnType<typeof toJSON>) => {
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
    };

    return {
      toJSON,
      fromJSON,
    };
  },

  'action::@bangle.io/slice-workspace:set-opened-workspace': (actionName) => {
    const toJSON = (action: ExtractWorkspaceSliceAction<typeof actionName>) => {
      return {
        openedWsPaths: action.value.openedWsPaths.toArray(),
        wsName: action.value.wsName || null,
      };
    };
    const fromJSON = (obj: ReturnType<typeof toJSON>) => {
      return {
        openedWsPaths: OpenedWsPaths.createFromArray(obj.openedWsPaths),
        wsName: obj.wsName || undefined,
      };
    };

    return {
      toJSON,
      fromJSON,
    };
  },

  'action::@bangle.io/slice-workspace:update-recently-used-ws-paths': (
    actionName,
  ) => {
    const toJSON = (action: ExtractWorkspaceSliceAction<typeof actionName>) => {
      return {
        wsName: action.value.wsName,
        recentlyUsedWsPaths: action.value.recentlyUsedWsPaths || null,
      };
    };
    const fromJSON = (obj: ReturnType<typeof toJSON>) => {
      return {
        wsName: obj.wsName,
        recentlyUsedWsPaths: obj.recentlyUsedWsPaths || undefined,
      };
    };

    return {
      toJSON,
      fromJSON,
    };
  },

  'action::@bangle.io/slice-workspace:update-ws-paths': (actionName) => {
    const toJSON = (action: ExtractWorkspaceSliceAction<typeof actionName>) => {
      return {
        wsName: action.value.wsName,
        wsPaths: action.value.wsPaths || null,
      };
    };
    const fromJSON = (obj: ReturnType<typeof toJSON>) => {
      return {
        wsName: obj.wsName,
        wsPaths: obj.wsPaths || undefined,
      };
    };

    return {
      toJSON,
      fromJSON,
    };
  },

  'action::@bangle.io/slice-workspace:refresh-ws-paths': (actionName) => {
    const toJSON = (action: ExtractWorkspaceSliceAction<typeof actionName>) => {
      return undefined;
    };
    const fromJSON = (obj: ReturnType<typeof toJSON>) => {
      return undefined;
    };

    return {
      toJSON,
      fromJSON,
    };
  },
};
