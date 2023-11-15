export type PageLifeCycleEvent = {
  newState: PageLifeCycleState;
  oldState: PageLifeCycleState;
};

export type PageLifeCycleState =
  | 'active'
  | 'passive'
  | 'hidden'
  | 'frozen'
  | 'terminated'
  | undefined;
