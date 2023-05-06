import { nsmExtensionRegistry } from '@bangle.io/extension-registry';
import { getNote, nsmSliceWorkspace } from '@bangle.io/nsm-slice-workspace';
import type { NsmStore } from '@bangle.io/shared-types';

export const workspace = {
  nsmSliceWorkspace,
  getNote: (store: NsmStore, wsPath: string) => {
    const { extensionRegistry } = nsmExtensionRegistry.getState(store.state);

    return getNote(wsPath, extensionRegistry);
  },
};
