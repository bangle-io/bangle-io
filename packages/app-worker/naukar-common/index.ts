import { ref } from '@nalanda/core';

import type { EternalVarsWorker, WindowActions } from '@bangle.io/shared-types';

export type NaukarStoreConfig = {
  eternalVars: EternalVarsWorker;
};

export const defaultStoreConfig: NaukarStoreConfig = {
  // we initialize this to an empty object for now
  // but when we setup the store we will override this
  eternalVars: {} as EternalVarsWorker,
};

/**
 * Please use getWindowStoreConfig instead of this.
 * This should only be used when setting up the store once.
 */
export const getStoreConfigRef = ref<NaukarStoreConfig>(
  () => defaultStoreConfig,
);

export const getWindowActionsRef = ref<WindowActions>(() => undefined);
