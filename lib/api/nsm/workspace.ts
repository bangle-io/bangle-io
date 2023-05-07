import { useMemo } from 'react';

import { useNsmSliceState } from '@bangle.io/bangle-store-context';
import { nsmExtensionRegistry } from '@bangle.io/extension-registry';
import {
  getNote as _getNote,
  nsmSliceWorkspace,
} from '@bangle.io/nsm-slice-workspace';

import { getStore } from '../internals';

export function useWorkspace() {
  const { wsName, primaryWsPath, noteWsPaths } =
    useNsmSliceState(nsmSliceWorkspace);

  return useMemo(() => {
    return { wsName, primaryWsPath, noteWsPaths };
  }, [wsName, primaryWsPath, noteWsPaths]);
}

export const pick = nsmSliceWorkspace.pick;
export const passivePick = nsmSliceWorkspace.passivePick;

export const getNote = (wsPath: string) => {
  const store = getStore();
  const { extensionRegistry } = nsmExtensionRegistry.getState(store.state);

  return _getNote(wsPath, extensionRegistry);
};
