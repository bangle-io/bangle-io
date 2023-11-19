import { ref } from '@nalanda/core';

import type { EternalVarsWorker } from '@bangle.io/shared-types';

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
export const getStoreConfig = ref<NaukarStoreConfig>(() => defaultStoreConfig);
