import { useNsmSliceState } from '@bangle.io/bangle-store-context';
import { nsmExtensionRegistry } from '@bangle.io/extension-registry';
import {
  closeIfFound,
  fileOps,
  nsmSliceWorkspace,
  openWsPathInNewTab as _openWsPathInNewTab,
  pushOpenedWsPaths as _pushOpenedWsPaths,
  pushPrimaryWsPath as _pushPrimaryWsPath,
  pushSecondaryWsPath as _pushSecondaryWsPath,
} from '@bangle.io/nsm-slice-workspace';
import type { EditorIdType, Node, WsPath } from '@bangle.io/shared-types';
import { fs } from '@bangle.io/workspace-info';
import type { OpenedWsPaths } from '@bangle.io/ws-path';

import { getStore } from '../internals';

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

  await fileOps.createNote(wsPath, extensionRegistry, opts.doc);

  if (opts.open) {
    return pushWsPath(wsPath, opts.open);
  }

  return undefined;
};

export const renameNote = async (wsPath: WsPath, newWsPath: WsPath) => {
  const store = getStore();

  const { openedWsPaths } = nsmSliceWorkspace.resolveState(store.state);

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
