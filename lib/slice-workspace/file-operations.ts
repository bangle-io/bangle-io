import type { Node } from '@bangle.dev/pm';

import {
  BaseFileSystemError,
  NATIVE_BROWSER_PERMISSION_ERROR,
  NATIVE_BROWSER_USER_ABORTED_ERROR,
} from '@bangle.io/baby-fs';
import { WorkspaceType } from '@bangle.io/constants';
import { extensionRegistrySliceKey } from '@bangle.io/extension-registry';
import { markdownParser, markdownSerializer } from '@bangle.io/markdown';
import type { UnPromisify } from '@bangle.io/shared-types';
import { HelpFsStorageProvider, StorageOpts } from '@bangle.io/storage';
import { asssertNotUndefined } from '@bangle.io/utils';
import { validateNoteWsPath } from '@bangle.io/ws-path';

import { workspaceSliceKey } from './common';
import { defaultDoc } from './default-doc';
import {
  goToWorkspaceAuthRoute,
  goToWsNameRouteNotFoundRoute,
  replaceAnyMatchingOpenedWsPath,
  updateOpenedWsPaths,
} from './operations';
import {
  WORKSPACE_NOT_FOUND_ERROR,
  WORKSPACE_PROVIDER_NOT_FOUND_ERROR,
  WorkspaceError,
} from './workspaces/errors';
import {
  getWorkspaceInfoSync,
  updateWorkspaceMetadata,
} from './workspaces-operations';

function workspaceHandleError(wsName: string, error: WorkspaceError) {
  return workspaceSliceKey.op((state, dispatch) => {
    if (
      error instanceof BaseFileSystemError &&
      (error.code === NATIVE_BROWSER_PERMISSION_ERROR ||
        error.code === NATIVE_BROWSER_USER_ABORTED_ERROR)
    ) {
      return goToWorkspaceAuthRoute(wsName, error.code)(state, dispatch);
    }
    if (
      error instanceof WorkspaceError &&
      error.code === WORKSPACE_NOT_FOUND_ERROR
    ) {
      return goToWsNameRouteNotFoundRoute(wsName)(state, dispatch);
    }

    return undefined;
  });
}

function getStorageProvider() {
  return workspaceSliceKey.op((state) => {
    const wsName = workspaceSliceKey.getSliceStateAsserted(state).wsName;

    asssertNotUndefined(
      wsName,
      'wsName must be defined before accessing storage provider',
    );

    const wsInfo = getWorkspaceInfoSync(wsName)(state);

    let provider = extensionRegistrySliceKey
      .getSliceStateAsserted(state)
      .extensionRegistry.getStorageProvider(wsInfo.type);

    if (wsInfo.type === WorkspaceType.helpfs) {
      provider = new HelpFsStorageProvider();
    }

    if (!provider) {
      throw new WorkspaceError(
        `Storage provider "${wsInfo.type}" not found.`,
        WORKSPACE_PROVIDER_NOT_FOUND_ERROR,
      );
    }

    return provider;
  });
}

export function getStorageProviderOpts() {
  return workspaceSliceKey.op((state, dispatch) => {
    const { specRegistry, markdownItPlugins } =
      extensionRegistrySliceKey.getSliceStateAsserted(state).extensionRegistry;
    const wsName = workspaceSliceKey.getSliceStateAsserted(state).wsName;

    asssertNotUndefined(
      wsName,
      'wsName must be defined before accessing getStorageProviderOpts',
    );

    // WARNING: we are passing methods with the state in scope
    // this might possible get stale if careful thought is not put in while modifying this API
    // For now this should be a problem as the storage providers do not have access to state
    // and even if wsName has changed, while they were doing `async` work, it should be fine.
    const opt: StorageOpts = {
      specRegistry: specRegistry,
      formatParser: (value, specRegistry) =>
        markdownParser(value, specRegistry, markdownItPlugins),
      formatSerializer: (doc, specRegistry) =>
        markdownSerializer(doc, specRegistry),
      readWorkspaceMetadata: () => {
        return getWorkspaceInfoSync(wsName)(state).metadata;
      },
      updateWorkspaceMetadata: (metadata) => {
        updateWorkspaceMetadata(wsName, metadata)(state, dispatch);
      },
    };

    return opt;
  });
}

function errorHandlerWrapper(
  errorHandler: (
    wsName: string,
    error: WorkspaceError,
  ) => Parameters<typeof workspaceSliceKey.op>[0],
) {
  return <T extends Parameters<typeof workspaceSliceKey.asyncOp>[0]>(op: T) => {
    return workspaceSliceKey.asyncOp(
      async (_, __, store): Promise<UnPromisify<ReturnType<T>> | undefined> => {
        const wsName = workspaceSliceKey.getSliceStateAsserted(
          store.state,
        ).wsName;

        if (!wsName) {
          return undefined;
        }

        try {
          return await op(store.state, store.dispatch, store);
        } catch (error) {
          const currentWsName = workspaceSliceKey.getSliceStateAsserted(
            store.state,
          ).wsName;
          if (error instanceof WorkspaceError) {
            // Only handle errors of the current wsName
            // this avoids showing errors of previously opened workspace due to delay
            // in processing.
            if (wsName === currentWsName) {
              errorHandler(wsName, error)(store.state, store.dispatch);
            }
            return undefined;
          }

          throw error;
        }
      },
    );
  };
}

const errorHandler = errorHandlerWrapper(workspaceHandleError);

export const refreshWsPaths = () => {
  return errorHandler(
    workspaceSliceKey.asyncOp(async (state, dispatch, store) => {
      const sliceState = workspaceSliceKey.getSliceStateAsserted(state);
      const wsName = sliceState?.wsName;

      if (!wsName) {
        return false;
      }

      if (
        workspaceSliceKey.getSliceState(state)?.pendingRefreshWsPaths === wsName
      ) {
        return false;
      }

      dispatch({
        name: 'action::@bangle.io/slice-workspace:set-pending-refresh-ws-paths',
        value: {
          pendingRefreshWsPaths: wsName,
        },
      });

      const storageProvider = getStorageProvider()(state, dispatch);

      storageProvider
        .listAllFiles(
          new AbortController().signal,
          wsName,
          getStorageProviderOpts()(state, dispatch),
        )
        .then((items) => {
          dispatch({
            name: 'action::@bangle.io/slice-workspace:update-ws-paths',
            value: {
              wsName,
              wsPaths: items,
            },
          });
          dispatch({
            name: 'action::@bangle.io/slice-workspace:set-pending-refresh-ws-paths',
            value: {
              pendingRefreshWsPaths: undefined,
            },
          });

          return;
        })
        .catch((error) => {
          dispatch({
            name: 'action::@bangle.io/slice-workspace:update-ws-paths',
            value: {
              wsName,
              wsPaths: undefined,
            },
          });
          dispatch({
            name: 'action::@bangle.io/slice-workspace:set-pending-refresh-ws-paths',
            value: {
              pendingRefreshWsPaths: undefined,
            },
          });
        });

      return true;
    }),
  );
};

export const renameNote = (targetWsPath: string, newWsPath: string) => {
  return errorHandler(
    workspaceSliceKey.asyncOp(
      async (state, dispatch, store): Promise<boolean> => {
        const sliceState = workspaceSliceKey.getSliceStateAsserted(state);
        const wsName = sliceState.wsName;

        if (!wsName) {
          return false;
        }

        const storageProvider = getStorageProvider()(state, dispatch);

        await storageProvider.renameFile(
          targetWsPath,
          newWsPath,
          getStorageProviderOpts()(state, dispatch),
        );

        replaceAnyMatchingOpenedWsPath(targetWsPath, newWsPath)(
          store.state,
          store.dispatch,
        );

        refreshWsPaths()(store.state, store.dispatch, store);

        return true;
      },
    ),
  );
};

export const getNote = (wsPath: string) => {
  const op = workspaceSliceKey.op(async (state, dispatch) => {
    const { wsName } = workspaceSliceKey.getSliceStateAsserted(state);
    if (!wsName) {
      return undefined;
    }

    const storageProvider = getStorageProvider()(state, dispatch);

    return storageProvider.getDoc(
      wsPath,
      getStorageProviderOpts()(state, dispatch),
    );
  });

  return errorHandler(op);
};

export const checkFileExists = (wsPath: string) => {
  return errorHandler(
    workspaceSliceKey.asyncOp(async (state, dispatch, store) => {
      const { wsName } = workspaceSliceKey.getSliceStateAsserted(state);
      if (!wsName) {
        return undefined;
      }

      const storageProvider = getStorageProvider()(state, dispatch);

      return storageProvider.fileExists(
        wsPath,
        getStorageProviderOpts()(state, dispatch),
      );
    }),
  );
};

export const createNote = (
  wsPath: string,
  {
    open = true,
    doc,
  }: {
    open?: Boolean;
    doc?: Node;
  } = {},
) => {
  return errorHandler(
    workspaceSliceKey.asyncOp(async (state, dispatch, store) => {
      const { wsName } = workspaceSliceKey.getSliceStateAsserted(state);
      if (!wsName) {
        return undefined;
      }

      const storageProvider = getStorageProvider()(state, dispatch);

      if (doc == null) {
        doc = defaultDoc(
          wsPath,
          extensionRegistrySliceKey.getSliceStateAsserted(state)
            .extensionRegistry,
        );
      }

      const fileExists = await storageProvider.fileExists(
        wsPath,
        getStorageProviderOpts()(state, dispatch),
      );

      if (!fileExists) {
        await storageProvider.saveDoc(
          wsPath,
          doc,
          getStorageProviderOpts()(state, dispatch),
        );
      }

      if (open) {
        updateOpenedWsPaths((openedWsPath) => {
          return openedWsPath.updateByIndex(0, wsPath);
        })(store.state, store.dispatch);
      }
      // TODO  refresh should move to effect?
      await refreshWsPaths()(store.state, store.dispatch, store);

      return undefined;
    }),
  );
};

export const saveFile = (wsPath: string, file: File) => {
  return errorHandler(
    workspaceSliceKey.asyncOp(
      async (state, dispatch, store): Promise<boolean> => {
        const storageProvider = getStorageProvider()(state, dispatch);

        await storageProvider.saveFile(
          wsPath,
          file,
          getStorageProviderOpts()(state, dispatch),
        );
        console.log('here');
        return true;
      },
    ),
  );
};

export const saveDoc = (wsPath: string, doc: Node) => {
  return errorHandler(
    workspaceSliceKey.asyncOp(
      async (state, dispatch, store): Promise<boolean> => {
        const storageProvider = getStorageProvider()(state, dispatch);

        await storageProvider.saveDoc(
          wsPath,
          doc,
          getStorageProviderOpts()(state, dispatch),
        );
        return true;
      },
    ),
  );
};

export const getFile = (wsPath: string) => {
  return errorHandler(
    workspaceSliceKey.asyncOp(async (state, dispatch, store): Promise<File> => {
      const storageProvider = getStorageProvider()(state, dispatch);

      return storageProvider.getFile(
        wsPath,
        getStorageProviderOpts()(state, dispatch),
      );
    }),
  );
};

export const deleteNote = (wsPathToDelete: Array<string> | string) => {
  return errorHandler(
    workspaceSliceKey.asyncOp(async (state, dispatch, store) => {
      const storageProvider = getStorageProvider()(state, dispatch);
      const sliceState = workspaceSliceKey.getSliceStateAsserted(store.state);

      if (!sliceState.wsName) {
        return;
      }

      if (!Array.isArray(wsPathToDelete)) {
        wsPathToDelete = [wsPathToDelete];
      }

      let newOpenedWsPaths = sliceState.openedWsPaths;

      wsPathToDelete.forEach((w) => {
        validateNoteWsPath(w);
        newOpenedWsPaths = newOpenedWsPaths.closeIfFound(w).shrink();
      });

      updateOpenedWsPaths(newOpenedWsPaths, { replace: true })(
        store.state,
        dispatch,
      );

      for (let wsPath of wsPathToDelete) {
        await storageProvider.deleteFile(
          wsPath,
          getStorageProviderOpts()(state, dispatch),
        );
      }

      await refreshWsPaths()(store.state, dispatch, store);
    }),
  );
};
