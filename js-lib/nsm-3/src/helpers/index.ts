export { calcReverseDependencies } from './dependency-helpers';

export { shallowEqual } from './shallow-equal';

export { validateSlices } from './validations';

export { testCleanup } from './test-cleanup';

export { idGeneration } from './id_generation';

export function uuid(len = 10) {
  return Math.random().toString(36).substring(2, 15).slice(0, len);
}

export const hasIdleCallback =
  typeof window !== 'undefined' && 'requestIdleCallback' in window;
