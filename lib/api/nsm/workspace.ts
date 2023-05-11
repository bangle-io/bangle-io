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
import type { WsPath } from '@bangle.io/shared-types';

import { getStore } from '../internals';

export function useWorkspace() {
  return useNsmSliceState(nsmSliceWorkspace);
}

export const pick = nsmSliceWorkspace.pick;
export const passivePick = nsmSliceWorkspace.passivePick;

export const getNote = (wsPath: WsPath) => {
  const store = getStore();
  const { extensionRegistry } = nsmExtensionRegistry.getState(store.state);

  return fileOps.getNote(wsPath, extensionRegistry);
};

export const deleteNote = (wsPath: WsPath) => {
  const store = getStore();

  store.dispatch(closeIfFound(store.state, wsPath));

  return fileOps.deleteNote(wsPath);
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
