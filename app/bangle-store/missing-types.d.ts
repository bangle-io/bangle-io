declare module 'page-lifecycle' {
  import type { PageLifeCycleState } from '@bangle.io/slice-page';

  type PageLifeCycleEvent = {
    newState: PageLifeCycleState;
    oldState: PageLifeCycleState;
  };

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
