// biome-ignore lint/style/noVar: <explanation>
declare var __BANGLE_BUILD_TIME_CONFIG__: string | undefined;
// biome-ignore lint/style/noVar: <explanation>
declare var __BANGLE_INJECTED_CONFIG__: string | undefined;

// interface Window {
//   _nsmE2e: import('@bangle.io/e2e-types').E2eTypes;
//   _workerE2e: import('@bangle.io/e2e-types').WorkerE2eTypes;
// }

declare module 'page-lifecycle' {
  import type {
    PageLifeCycleState,
    PageLifeCycleEvent,
  } from '@bangle.io/types';

  interface Lifecyle {
    state: PageLifeCycleState;
    addUnsavedChanges: (s: symbol) => void;
    removeUnsavedChanges: (s: symbol) => void;
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
