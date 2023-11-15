declare var __BANGLE_BUILD_TIME_CONFIG__: string | undefined;
declare var __BANGLE_INJECTED_CONFIG__: string | undefined;

interface Window {
  _nsmE2e: import('@bangle.io/e2e-types').E2eTypes;
}

declare module 'page-lifecycle' {
  import type {
    PageLifeCycleState,
    PageLifeCycleEvent,
  } from '@bangle.io/shared-types';

  interface Lifecyle {
    state: PageLifeCycleState;
    addUnsavedChanges: (s: Symbol) => void;
    removeUnsavedChanges: (s: Symbol) => void;
    addEventListener: (
      type: string,
      cb: (event: PageLifeCycleEvent) => void,
    ) => void;
    removeEventListener: (
      type: string,
      cb: (event: PageLifeCycleEvent) => void,
    ) => void;
  }

  let z: Lifecyle;
  export default z;
}
