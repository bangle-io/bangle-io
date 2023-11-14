import type { EternalVarsWorker } from '@bangle.io/shared-types';

export type StoreConfig = {
  eternalVars: EternalVarsWorker;
};

export function getStoreConfig(store: { config: Record<string, unknown> }) {
  return store.config as StoreConfig;
}
