import { ActionsSerializersType } from '@bangle.io/create-store';
import { OpenedWsPaths } from '@bangle.io/ws-path';

import { ExtractWorkspaceSliceAction, WorkspaceSliceAction } from './common';

export const ActionSerializers: ActionsSerializersType<WorkspaceSliceAction> = {
  'action::@bangle.io/workspace-context:update-location': (actionName) => {
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
  'action::@bangle.io/workspace-context:update-recently-used-ws-paths': (
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
  'action::@bangle.io/workspace-context:update-ws-paths': (actionName) => {
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
  'action::@bangle.io/workspace-context:set-pending-refresh-ws-paths': (
    actionName,
  ) => {
    const toJSON = (action: ExtractWorkspaceSliceAction<typeof actionName>) => {
      return {
        pendingRefreshWsPaths: action.value.pendingRefreshWsPaths || null,
      };
    };
    const fromJSON = (obj: ReturnType<typeof toJSON>) => {
      return {
        pendingRefreshWsPaths: obj.pendingRefreshWsPaths || undefined,
      };
    };
    return {
      toJSON,
      fromJSON,
    };
  },
};
