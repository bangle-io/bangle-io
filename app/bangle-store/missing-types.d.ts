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
declare module 'page-lifecycle' {
  let z: Lifecyle;
  export default z;
}
