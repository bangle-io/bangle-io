import { internalApi } from '@bangle.io/api';
import type { EternalVars, NsmStore } from '@bangle.io/shared-types';

const map = new WeakMap<NsmStore, EternalVars>();

export function setEternalVars(store: NsmStore, eternalVars: EternalVars) {
  map.set(store, eternalVars);
  internalApi.eternalVars.setEternalVars(eternalVars);
}

export function getEternalVars(store: NsmStore): EternalVars {
  const eternalVars = map.get(store);

  if (!eternalVars) {
    throw new Error('Eternal vars not set');
  }

  return eternalVars;
}
