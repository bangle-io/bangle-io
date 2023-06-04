import { useNsmSliceState } from '@bangle.io/bangle-store-context';
import { nsmExtensionRegistry } from '@bangle.io/extension-registry';
import { markdownParser } from '@bangle.io/markdown';
import {
  closeIfFound,
  fileOps,
  nsmSliceWorkspace,
  openWsPathInNewTab as _openWsPathInNewTab,
  pushOpenedWsPaths as _pushOpenedWsPaths,
  pushPrimaryWsPath as _pushPrimaryWsPath,
  pushSecondaryWsPath as _pushSecondaryWsPath,
} from '@bangle.io/nsm-slice-workspace';
import type {
  EditorIdType,
  Node,
  WsName,
  WsPath,
} from '@bangle.io/shared-types';
import {
  goToWorkspaceHome as _goToWorkspaceHome,
  wsNameToPathname,
} from '@bangle.io/slice-page';
import { incrementCounter } from '@bangle.io/slice-refresh-workspace';
import { BaseError } from '@bangle.io/utils';
import { fs } from '@bangle.io/workspace-info';
import type { OpenedWsPaths } from '@bangle.io/ws-path';
import { resolvePath2 } from '@bangle.io/ws-path';

import { getStore } from '../internals';

export {
  goToWorkspaceAuthRoute,
  readWorkspaceInfo,
} from './internal/workspace';

export function useWorkspace() {
  return useNsmSliceState(nsmSliceWorkspace);
}

// lets try reduce the usage of these, since they couple internal state management
// with extensions
export const pick = nsmSliceWorkspace.pick;
export const passivePick = nsmSliceWorkspace.passivePick;

export const workspaceState = () => {
  const store = getStore();

  return nsmSliceWorkspace.resolveState(store.state);
};

export const getNote = (wsPath: WsPath) => {
  const store = getStore();
  const { extensionRegistry } = nsmExtensionRegistry.getState(store.state);

  return fileOps.getNote(wsPath, extensionRegistry);
};

export const createNote = async (
  wsPath: WsPath,
  opts: {
    doc?: Node;
    open?: boolean | 'primary' | 'secondary' | 'newTab';
  } = {},
): Promise<void> => {
  const store = getStore();
  const { extensionRegistry } = nsmExtensionRegistry.getState(store.state);

  if (await getNote(wsPath)) {
    throw new BaseError({
      message: `Cannot create. Note "${
        resolvePath2(wsPath).fileName
      }" already exists.`,
    });
  }

  await fileOps.createNote(wsPath, extensionRegistry, opts.doc);

  if (opts.open) {
    return pushWsPath(wsPath, opts.open);
  }

  return undefined;
};

export const renameNote = async (wsPath: WsPath, newWsPath: WsPath) => {
  const store = getStore();

  const { openedWsPaths, noteWsPaths } = nsmSliceWorkspace.resolveState(
    store.state,
  );

  if (noteWsPaths?.includes(newWsPath)) {
    throw new BaseError({
      message: `Cannot rename. Note "${
        resolvePath2(newWsPath).fileName
      }" already exists.`,
    });
  }

  store.dispatch(closeIfFound(store.state, wsPath));

  await fs.renameFile(wsPath, newWsPath);

  store.dispatch(
    _pushOpenedWsPaths(
      store.state,
      openedWsPaths.updateIfFound(wsPath, newWsPath),
    ),
  );
};

export const deleteNote = (wsPath: WsPath) => {
  const store = getStore();

  store.dispatch(closeIfFound(store.state, wsPath));

  return fs.deleteFile(wsPath);
};

export const writeNote = async (wsPath: WsPath, doc: Node) => {
  const store = getStore();
  const { extensionRegistry } = nsmExtensionRegistry.getState(store.state);

  await fileOps.writeNote(wsPath, extensionRegistry, doc);
};

export const writeFile = async (...args: Parameters<typeof fs.writeFile>) => {
  await fs.writeFile(...args);
};

export const readFile = async (...args: Parameters<typeof fs.readFile>) => {
  return await fs.readFile(...args);
};

export async function createNoteFromMd(wsPath: WsPath, mdText: string) {
  const store = getStore();
  const { extensionRegistry } = nsmExtensionRegistry.getState(store.state);

  if (await getNote(wsPath)) {
    throw new BaseError({
      message: `Cannot create. Note "${
        resolvePath2(wsPath).fileName
      }" already exists.`,
    });
  }

  const doc = markdownParser(
    mdText,
    extensionRegistry.specRegistry,
    extensionRegistry.markdownItPlugins,
  )!;

  await fileOps.writeNote(wsPath, extensionRegistry, doc);
}

export const pushWsPath = (
  wsPath: WsPath,
  openType: boolean | 'primary' | 'secondary' | 'newTab' = 'primary',
): void => {
  if (openType === 'primary' || openType === true) {
    return pushPrimaryWsPath(wsPath);
  } else if (openType === 'secondary') {
    return pushSecondaryWsPath(wsPath);
  } else if (openType === 'newTab') {
    return openWsPathInNewTab(wsPath);
  } else if (!openType) {
    return undefined;
  } else {
    let x: never = openType;
    throw new Error(`Invalid openType: ${x}`);
  }
};

export const pushPrimaryWsPath = (wsPath: WsPath): void => {
  const store = getStore();

  store.dispatch(_pushPrimaryWsPath(store.state, wsPath));
};

export const pushSecondaryWsPath = (wsPath: WsPath): void => {
  const store = getStore();

  store.dispatch(_pushSecondaryWsPath(store.state, wsPath));
};

export const goToWorkspace = ({
  wsName,
  type = 'replace',
}: {
  wsName: WsName;
  type: 'newTab' | 'replace';
}): void => {
  const store = getStore();

  if (type === 'newTab' && typeof window !== 'undefined') {
    window.open(wsNameToPathname(wsName));

    return;
  }
  store.dispatch(
    _goToWorkspaceHome({
      wsName,
      replace: type === 'replace',
    }),
  );
};

export const openWsPathInNewTab = (wsPath: WsPath): void => {
  _openWsPathInNewTab(wsPath);
};

export const pushOpenedWsPath = (
  opened: OpenedWsPaths | ((arg: OpenedWsPaths) => OpenedWsPaths),
): void => {
  const store = getStore();

  store.dispatch(_pushOpenedWsPaths(store.state, opened));
};

export const closeEditor = (index?: EditorIdType): void => {
  const store = getStore();

  store.dispatch(
    _pushOpenedWsPaths(store.state, (openedWsPaths) => {
      if (typeof index === 'number') {
        return openedWsPaths.updateByIndex(index, undefined).optimizeSpace();
      } else {
        return openedWsPaths.closeAll();
      }
    }),
  );
};

/**
 * Refreshes to sync any updated files or workspaces
 */
export const refresh = () => {
  const store = getStore();

  store.dispatch(incrementCounter(null));
};
