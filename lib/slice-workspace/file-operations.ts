import type { Node } from '@bangle.dev/pm';

import { readFileAsText } from '@bangle.io/baby-fs';
import { DEBUG_WRITE_SLOWDOWN } from '@bangle.io/config';
import { extensionRegistrySliceKey } from '@bangle.io/extension-registry';
import {
  getStorageProvider,
  storageProviderSliceKey,
} from '@bangle.io/slice-storage-provider';
import type { StorageOpts } from '@bangle.io/storage';
import { sleep } from '@bangle.io/utils';
import {
  readWorkspaceMetadata,
  updateWorkspaceMetadata,
} from '@bangle.io/workspace-info';
import { resolvePath, validateNoteWsPath } from '@bangle.io/ws-path';

import { workspaceSliceKey } from './common';
import { defaultDoc } from './default-doc';
import { WorkspaceError, WorkspaceErrorCode } from './errors';
import { getAssertedWsInfoType, markdownFormatProvider } from './helpers';
import {
  replaceAnyMatchingOpenedWsPath,
  updateOpenedWsPaths,
} from './operations';

function getNoteFormatProvider(wsName: string) {
  return workspaceSliceKey.queryOp((state) => {
    // TODO implement custom format provider
    let provider = markdownFormatProvider;

    if (!provider) {
      throw new WorkspaceError({
        message: `Note storage provider not found.`,
        code: WorkspaceErrorCode.NOTE_FORMAT_PROVIDER_NOT_FOUND_ERROR,
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
      readWorkspaceMetadata: async (wsName: string) => {
        return (await readWorkspaceMetadata(wsName)) || {};
      },
      updateWorkspaceMetadata: async (wsName, metadata) => {
        await updateWorkspaceMetadata(wsName, () => metadata);
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

      const wsInfoType = await getAssertedWsInfoType(wsName, store.state);

      const storageProvider = storageProviderSliceKey.callQueryOp(
        store.state,
        getStorageProvider(wsName, wsInfoType),
      );

      WorkspaceError.assertStorageProviderDefined(storageProvider, wsInfoType);

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
  return workspaceSliceKey.asyncOp(
    async (_, __, store): Promise<boolean | undefined> => {
      const { wsName } = resolvePath(wsPath);

      const wsInfoType = await getAssertedWsInfoType(wsName, store.state);

      const storageProvider = storageProviderSliceKey.callQueryOp(
        store.state,
        getStorageProvider(wsName, wsInfoType),
      );

      WorkspaceError.assertStorageProviderDefined(storageProvider, wsInfoType);

      return storageProvider.fileExists(
        wsPath,
        getStorageProviderOpts()(store.state, store.dispatch),
      );
    },
  );
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

    const wsInfoType = await getAssertedWsInfoType(wsName, store.state);

    const storageProvider = storageProviderSliceKey.callQueryOp(
      store.state,
      getStorageProvider(wsName, wsInfoType),
    );

    WorkspaceError.assertStorageProviderDefined(storageProvider, wsInfoType);

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
      const wsInfoType = await getAssertedWsInfoType(wsName, store.state);

      const storageProvider = storageProviderSliceKey.callQueryOp(
        store.state,
        getStorageProvider(wsName, wsInfoType),
      );

      WorkspaceError.assertStorageProviderDefined(storageProvider, wsInfoType);

      if (DEBUG_WRITE_SLOWDOWN && DEBUG_WRITE_SLOWDOWN > 0) {
        console.warn('Slowing down write by ' + DEBUG_WRITE_SLOWDOWN + 'ms');
        await sleep(DEBUG_WRITE_SLOWDOWN);
      }

      await storageProvider.writeFile(
        wsPath,
        file,
        getStorageProviderOpts()(store.state, dispatch),
      );

      return true;
    },
  );
};

export const docToFile = (wsPath: string, doc: Node) => {
  return workspaceSliceKey.queryOp((state): File => {
    const { fileName, wsName } = resolvePath(wsPath);
    const { specRegistry } =
      extensionRegistrySliceKey.getSliceStateAsserted(state).extensionRegistry;

    const serialValue = getNoteFormatProvider(wsName)(state).serializeNote(
      doc,
      specRegistry,
      fileName,
    );

    return new File([serialValue], fileName, {
      type: 'text/plain',
    });
  });
};

export const writeNote = (wsPath: string, doc: Node) => {
  return workspaceSliceKey.asyncOp(
    async (_, dispatch, store): Promise<boolean> => {
      const file = docToFile(wsPath, doc)(store.state);
      await writeFile(wsPath, file)(store.state, dispatch, store);

      return true;
    },
  );
};

export const getFile = (wsPath: string) => {
  return workspaceSliceKey.asyncOp(
    async (_, dispatch, store): Promise<File | undefined> => {
      const { wsName } = resolvePath(wsPath);
      const wsInfoType = await getAssertedWsInfoType(wsName, store.state);

      const storageProvider = storageProviderSliceKey.callQueryOp(
        store.state,
        getStorageProvider(wsName, wsInfoType),
      );

      WorkspaceError.assertStorageProviderDefined(storageProvider, wsInfoType);

      return storageProvider.readFile(
        wsPath,
        getStorageProviderOpts()(store.state, dispatch),
      );
    },
  );
};

export const deleteNote = (wsPathToDelete: string[] | string) => {
  return workspaceSliceKey.asyncOp(async (_, dispatch, store) => {
    const { wsName, openedWsPaths } = workspaceSliceKey.getSliceStateAsserted(
      store.state,
    );

    if (!wsName) {
      return;
    }

    const wsInfoType = await getAssertedWsInfoType(wsName, store.state);

    const storageProvider = storageProviderSliceKey.callQueryOp(
      store.state,
      getStorageProvider(wsName, wsInfoType),
    );

    WorkspaceError.assertStorageProviderDefined(storageProvider, wsInfoType);

    if (!Array.isArray(wsPathToDelete)) {
      wsPathToDelete = [wsPathToDelete];
    }

    let newOpenedWsPaths = openedWsPaths;

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
