declare module 'page-lifecycle' {
  type Lifecyle = {
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
  };
  let lifeCycle: Lifecyle;
  export default lifecyle;
}
