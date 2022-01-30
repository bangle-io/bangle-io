import type { Node } from '@bangle.dev/pm';

import { WorkspaceType } from '@bangle.io/constants';
import {
  ExtensionRegistry,
  extensionRegistrySliceKey,
} from '@bangle.io/extension-registry';
import { markdownParser, markdownSerializer } from '@bangle.io/markdown';
import { StorageOpts } from '@bangle.io/storage';
import { asssertNotUndefined } from '@bangle.io/utils';
import { validateNoteWsPath } from '@bangle.io/ws-path';

import { workspaceSliceKey } from './common';
import { defaultDoc } from './default-doc';
import { WORKSPACE_PROVIDER_NOT_FOUND_ERROR, WorkspaceError } from './errors';
import { storageProviderFromExtensionRegistry } from './helpers';
import {
  replaceAnyMatchingOpenedWsPath,
  updateOpenedWsPaths,
} from './operations';
import {
  getWorkspaceInfoSync,
  updateWorkspaceMetadata,
} from './workspaces-operations';

export function getStorageProvider() {
  return workspaceSliceKey.queryOp((state) => {
    const wsName = workspaceSliceKey.getSliceStateAsserted(state).wsName;

    asssertNotUndefined(
      wsName,
      'wsName must be defined before accessing storage provider',
    );

    const wsInfo = getWorkspaceInfoSync(wsName)(state);

    let provider = storageProviderFromExtensionRegistry(
      wsInfo.type,
      extensionRegistrySliceKey.getSliceStateAsserted(state).extensionRegistry,
    );

    if (!provider) {
      throw new WorkspaceError(
        `Storage provider "${wsInfo.type}" not found.`,
        WORKSPACE_PROVIDER_NOT_FOUND_ERROR,
      );
    }

    return provider;
  });
}

export function getStorageErrorHandler() {
  type T = Exclude<
    ReturnType<ExtensionRegistry['getOnStorageErrorHandlers']>,
    undefined
  >;
  return workspaceSliceKey.op((state): T => {
    const wsName = workspaceSliceKey.getSliceStateAsserted(state).wsName;

    if (!wsName) {
      return (error) => false;
    }

    const wsInfo = getWorkspaceInfoSync(wsName)(state);

    let errorHandler = extensionRegistrySliceKey
      .getSliceStateAsserted(state)
      .extensionRegistry.getOnStorageErrorHandlers(wsInfo.type);

    if (!errorHandler || wsInfo.type === WorkspaceType.helpfs) {
      errorHandler = (error) => false;
    }

    return errorHandler;
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

export const refreshWsPaths = () => {
  return workspaceSliceKey.op((state, dispatch) => {
    const sliceState = workspaceSliceKey.getSliceStateAsserted(state);
    const wsName = sliceState?.wsName;

    if (!wsName) {
      return false;
    }

    dispatch({
      name: 'action::@bangle.io/slice-workspace:refresh-ws-paths',
    });

    return true;
  });
};

export const renameNote = (targetWsPath: string, newWsPath: string) => {
  return workspaceSliceKey.asyncOp(
    async (state, dispatch, store): Promise<boolean> => {
      const sliceState = workspaceSliceKey.getSliceStateAsserted(state);
      const wsName = sliceState.wsName;

      if (!wsName) {
        return false;
      }

      const storageProvider = getStorageProvider()(state);

      await storageProvider.renameFile(
        targetWsPath,
        newWsPath,
        getStorageProviderOpts()(state, dispatch),
      );

      replaceAnyMatchingOpenedWsPath(targetWsPath, newWsPath)(
        store.state,
        store.dispatch,
      );

      refreshWsPaths()(store.state, store.dispatch);

      return true;
    },
  );
};

export const getNote = (wsPath: string) => {
  return workspaceSliceKey.op(async (state, dispatch) => {
    const { wsName } = workspaceSliceKey.getSliceStateAsserted(state);
    if (!wsName) {
      return undefined;
    }

    const storageProvider = getStorageProvider()(state);

    return storageProvider.getDoc(
      wsPath,
      getStorageProviderOpts()(state, dispatch),
    );
  });
};

export const checkFileExists = (wsPath: string) => {
  return workspaceSliceKey.asyncOp(async (state, dispatch, store) => {
    const { wsName } = workspaceSliceKey.getSliceStateAsserted(state);
    if (!wsName) {
      return undefined;
    }

    const storageProvider = getStorageProvider()(state);

    return storageProvider.fileExists(
      wsPath,
      getStorageProviderOpts()(state, dispatch),
    );
  });
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
  return workspaceSliceKey.asyncOp(async (state, dispatch, store) => {
    const { wsName } = workspaceSliceKey.getSliceStateAsserted(state);
    if (!wsName) {
      return undefined;
    }

    const storageProvider = getStorageProvider()(state);

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

    refreshWsPaths()(store.state, store.dispatch);

    return undefined;
  });
};

export const saveFile = (wsPath: string, file: File) => {
  return workspaceSliceKey.asyncOp(
    async (state, dispatch, store): Promise<boolean> => {
      const storageProvider = getStorageProvider()(state);

      await storageProvider.saveFile(
        wsPath,
        file,
        getStorageProviderOpts()(state, dispatch),
      );
      console.log('here');
      return true;
    },
  );
};

export const saveDoc = (wsPath: string, doc: Node) => {
  return workspaceSliceKey.asyncOp(
    async (state, dispatch, store): Promise<boolean> => {
      const storageProvider = getStorageProvider()(state);

      await storageProvider.saveDoc(
        wsPath,
        doc,
        getStorageProviderOpts()(state, dispatch),
      );
      return true;
    },
  );
};

export const getFile = (wsPath: string) => {
  return workspaceSliceKey.asyncOp(
    async (state, dispatch, store): Promise<File> => {
      const storageProvider = getStorageProvider()(state);

      return storageProvider.getFile(
        wsPath,
        getStorageProviderOpts()(state, dispatch),
      );
    },
  );
};

export const deleteNote = (wsPathToDelete: Array<string> | string) => {
  return workspaceSliceKey.asyncOp(async (state, dispatch, store) => {
    const storageProvider = getStorageProvider()(state);
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

    refreshWsPaths()(store.state, dispatch);
  });
};
