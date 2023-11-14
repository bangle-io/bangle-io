//
import { EternalVarsWindow } from '@bangle.io/shared-types';

export type StoreConfig = {
  eternalVars: EternalVarsWindow;
};

export function getStoreConfig(store: { config: Record<string, unknown> }) {
  return store.config as StoreConfig;
}
