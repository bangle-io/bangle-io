import { ExtensionRegistry } from '@bangle.io/extension-registry';

import { workspaceSliceKey } from './common';
import { goToWsNameRouteNotFoundRoute } from './operations';
import { WORKSPACE_NOT_FOUND_ERROR, WorkspaceError } from './workspaces/errors';

type ErrorHandlerType = Exclude<
  ReturnType<ExtensionRegistry['getOnStorageErrorHandlers']>,
  undefined
>;

export const workspaceErrorHandler: ErrorHandlerType = (error, store) => {
  if (
    error instanceof WorkspaceError &&
    error.code === WORKSPACE_NOT_FOUND_ERROR
  ) {
    const wsName = workspaceSliceKey.getSliceStateAsserted(store.state).wsName;
    if (wsName) {
      goToWsNameRouteNotFoundRoute(wsName)(store.state, store.dispatch);
      return true;
    }
  }
  return false;
};
