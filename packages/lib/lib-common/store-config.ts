import { ref } from '@nalanda/core';

import { EternalVarsWindow } from '@bangle.io/shared-types';

export type WindowStoreConfig = {
  historyType: 'memory' | 'browser';
  eternalVars: EternalVarsWindow;
};

export const defaultWindowStoreConfig: WindowStoreConfig = {
  historyType: 'browser',
  // we initialize this to an empty object for now
  // but when we setup the store we will override this
  eternalVars: {} as EternalVarsWindow,
};

/**
 * Please use getWindowStoreConfig instead of this.
 * This should only be used when setting up the store once.
 */
export const createWindowStoreConfigRef = ref<WindowStoreConfig>(
  () => defaultWindowStoreConfig,
);

export const getWindowStoreConfig = (
  store: Parameters<typeof createWindowStoreConfigRef>[0],
) => createWindowStoreConfigRef(store).current;