import type { EternalVars } from '@bangle.io/shared-types';

let eternalVars: EternalVars | undefined;

export function getEternalVars(): EternalVars {
  if (!eternalVars) {
    throw new Error('InternalAPI: Eternal vars not set');
  }

  return eternalVars;
}

export function setEternalVars(_eternalVars: EternalVars): void {
  eternalVars = _eternalVars;
}
