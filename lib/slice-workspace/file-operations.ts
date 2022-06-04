import type { Node } from '@bangle.dev/pm';

import { readFileAsText } from '@bangle.io/baby-fs';
import { extensionRegistrySliceKey } from '@bangle.io/extension-registry';
import { StorageOpts } from '@bangle.io/storage';
import { resolvePath, validateNoteWsPath } from '@bangle.io/ws-path';

import { workspaceSliceKey } from './common';
import { defaultDoc } from './default-doc';
import {
  NOTE_FORMAT_PROVIDER_NOT_FOUND_ERROR,
  WORKSPACE_PROVIDER_NOT_FOUND_ERROR,
  WorkspaceError,
} from './errors';
import {
  markdownFormatProvider,
  storageProviderFromExtensionRegistry,
} from './helpers';
import {
  replaceAnyMatchingOpenedWsPath,
  updateOpenedWsPaths,
} from './operations';
import {
  getWorkspaceInfo,
  updateWorkspaceMetadata,
} from './workspaces-operations';

export function getStorageProviderName(wsName: string) {
  return workspaceSliceKey.queryOp((state) => {
    return getWorkspaceInfo(wsName)(state).type;
  });
}

function getStorageProvider(wsName: string) {
  return workspaceSliceKey.queryOp((state) => {
    const wsInfo = getWorkspaceInfo(wsName)(state);

    const provider = storageProviderFromExtensionRegistry(
      wsInfo.type,
      extensionRegistrySliceKey.getSliceStateAsserted(state).extensionRegistry,
    );

    if (!provider) {
      throw new WorkspaceError({
        message: `Storage provider "${wsInfo.type}" not found.`,
        code: WORKSPACE_PROVIDER_NOT_FOUND_ERROR,
      });
    }

    return provider;
  });
}

function getNoteFormatProvider(wsName: string) {
  return workspaceSliceKey.queryOp((state) => {
    // TODO implement custom format provider
    let provider = markdownFormatProvider;

    if (!provider) {
      throw new WorkspaceError({
        message: `Note storage provider  not found.`,
        code: NOTE_FORMAT_PROVIDER_NOT_FOUND_ERROR,
      });
    }

    return provider;
  });
}

export function getStorageProviderOpts() {
  return workspaceSliceKey.op((state, dispatch) => {
    const { specRegistry } =
      extensionRegistrySliceKey.getSliceStateAsserted(state).extensionRegistry;

    // WARNING: we are passing methods with the state in scope
    // this might possible get stale if careful thought is not put in while modifying this API
    // For now this should not be a problem as the storage providers do not have access to state
    // and even if wsName has changed, while they were doing `async` work, it should be fine.
    const opt: StorageOpts = {
      specRegistry: specRegistry,
      readWorkspaceMetadata: (wsName: string) => {
        return getWorkspaceInfo(wsName)(state).metadata;
      },
      updateWorkspaceMetadata: (wsName, metadata) => {
        updateWorkspaceMetadata(wsName, metadata)(state, dispatch);
      },
    };

    return opt;
  });
}

export const refreshWsPaths = () => {
  return workspaceSliceKey.op((_, dispatch) => {
    dispatch({
      name: 'action::@bangle.io/slice-workspace:refresh-ws-paths',
    });

    return true;
  });
};

export const renameNote = (targetWsPath: string, newWsPath: string) => {
  return workspaceSliceKey.asyncOp(
    async (_, dispatch, store): Promise<boolean> => {
      const { wsName } = resolvePath(targetWsPath);

      if (resolvePath(newWsPath).wsName !== wsName) {
        return false;
      }

      const storageProvider = getStorageProvider(wsName)(store.state);

      await storageProvider.renameFile(
        targetWsPath,
        newWsPath,
        getStorageProviderOpts()(store.state, dispatch),
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
  return workspaceSliceKey.asyncOp(async (_, dispatch, store) => {
    const { wsName } = resolvePath(wsPath);

    const file = await getFile(wsPath)(store.state, dispatch, store);

    if (file) {
      const { specRegistry, markdownItPlugins } =
        extensionRegistrySliceKey.getSliceStateAsserted(
          store.state,
        ).extensionRegistry;

      const textContent = await readFileAsText(file);
      const doc = getNoteFormatProvider(wsName)(store.state).parseNote(
        textContent,
        specRegistry,
        markdownItPlugins,
      );

      return doc;
    }

    return undefined;
  });
};

export const checkFileExists = (wsPath: string) => {
  return workspaceSliceKey.asyncOp(async (_, dispatch, store) => {
    const { wsName } = resolvePath(wsPath);

    const storageProvider = getStorageProvider(wsName)(store.state);

    return storageProvider.fileExists(
      wsPath,
      getStorageProviderOpts()(store.state, dispatch),
    );
  });
};

export const createNote = (
  wsPath: string,
  {
    open = true,
    doc,
  }: {
    open?: boolean;
    doc?: Node;
  } = {},
) => {
  return workspaceSliceKey.asyncOp(async (_, dispatch, store) => {
    const { fileName, wsName } = resolvePath(wsPath);

    if (
      workspaceSliceKey.getSliceStateAsserted(store.state).wsName !== wsName
    ) {
      return false;
    }

    const storageProvider = getStorageProvider(wsName)(store.state);

    const fileExists = await storageProvider.fileExists(
      wsPath,
      getStorageProviderOpts()(store.state, dispatch),
    );

    if (!fileExists) {
      if (doc == null) {
        doc = defaultDoc(
          wsPath,
          extensionRegistrySliceKey.getSliceStateAsserted(store.state)
            .extensionRegistry,
        );
      }

      const { specRegistry } = extensionRegistrySliceKey.getSliceStateAsserted(
        store.state,
      ).extensionRegistry;
      const serialValue = getNoteFormatProvider(wsName)(
        store.state,
      ).serializeNote(doc, specRegistry, fileName);

      await storageProvider.createFile(
        wsPath,
        new File([serialValue], fileName, {
          type: 'text/plain',
        }),
        getStorageProviderOpts()(store.state, dispatch),
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

export const writeFile = (wsPath: string, file: File) => {
  return workspaceSliceKey.asyncOp(
    async (_, dispatch, store): Promise<boolean> => {
      const { wsName } = resolvePath(wsPath);
      const storageProvider = getStorageProvider(wsName)(store.state);

      await storageProvider.writeFile(
        wsPath,
        file,
        getStorageProviderOpts()(store.state, dispatch),
      );

      return true;
    },
  );
};

export const writeNote = (wsPath: string, doc: Node) => {
  return workspaceSliceKey.asyncOp(
    async (_, dispatch, store): Promise<boolean> => {
      const { specRegistry } = extensionRegistrySliceKey.getSliceStateAsserted(
        store.state,
      ).extensionRegistry;
      const { fileName, wsName } = resolvePath(wsPath);

      const serialValue = getNoteFormatProvider(wsName)(
        store.state,
      ).serializeNote(doc, specRegistry, fileName);

      await writeFile(
        wsPath,
        new File([serialValue], fileName, {
          type: 'text/plain',
        }),
      )(store.state, dispatch, store);

      return true;
    },
  );
};

export const getFile = (wsPath: string) => {
  return workspaceSliceKey.asyncOp(
    async (_, dispatch, store): Promise<File | undefined> => {
      const { wsName } = resolvePath(wsPath);
      const storageProvider = getStorageProvider(wsName)(store.state);

      return storageProvider.readFile(
        wsPath,
        getStorageProviderOpts()(store.state, dispatch),
      );
    },
  );
};

export const deleteNote = (wsPathToDelete: string[] | string) => {
  return workspaceSliceKey.asyncOp(async (_, dispatch, store) => {
    const sliceState = workspaceSliceKey.getSliceStateAsserted(store.state);

    if (!sliceState.wsName) {
      return;
    }

    const storageProvider = getStorageProvider(sliceState.wsName)(store.state);

    if (!Array.isArray(wsPathToDelete)) {
      wsPathToDelete = [wsPathToDelete];
    }

    let newOpenedWsPaths = sliceState.openedWsPaths;

    wsPathToDelete.forEach((w) => {
      validateNoteWsPath(w);
      newOpenedWsPaths = newOpenedWsPaths.closeIfFound(w).optimizeSpace();
    });

    updateOpenedWsPaths(newOpenedWsPaths, { replace: true })(
      store.state,
      dispatch,
    );

    for (let wsPath of wsPathToDelete) {
      await storageProvider.deleteFile(
        wsPath,
        getStorageProviderOpts()(store.state, dispatch),
      );
    }

    refreshWsPaths()(store.state, dispatch);
  });
};
