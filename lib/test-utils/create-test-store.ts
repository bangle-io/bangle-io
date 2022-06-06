import type {
  BaseAction,
  OnErrorType,
  SchedulerType,
  SliceArray,
  SliceKey,
} from '@bangle.io/create-store';
import { ApplicationStore, AppState } from '@bangle.io/create-store';

if (typeof jest === 'undefined') {
  throw new Error('Can only be with jest');
}

// creates a store with provided slices
// if you need a store with batteries included, use
// createBasicTestStore
export function createTestStore<
  SL = any,
  A extends BaseAction = any,
  S = SL,
  C extends { [key: string]: any } = any,
>({
  slices = [],
  opts,
  // slice key purely for getting the types of the store correct
  sliceKey,
  onError,
  scheduler = (cb) => {
    let destroyed = false;
    Promise.resolve().then(() => {
      if (!destroyed) {
        cb();
      }
    });

    return () => {
      destroyed = true;
    };
  },
}: {
  // for getting the types right
  sliceKey?: SliceKey<SL, A, S, C>;
  slices?: SliceArray<any, any>;
  opts?: C;
  scheduler?: SchedulerType;
  onError?: OnErrorType<SL, A>;
}): {
  store: ApplicationStore<SL, A>;
  dispatchSpy: jest.SpyInstance;
  actionsDispatched: BaseAction[];
  getAction: (name: string) => BaseAction[];
  getActionNames: () => string[];
} {
  let actionsDispatched: BaseAction[] = [];
  const store = ApplicationStore.create({
    scheduler: scheduler,
    storeName: 'test-store',
    onError,
    dispatchAction: (store, action) => {
      let newState = store.state.applyAction(action);
      store.updateState(newState);
      actionsDispatched.push(action);
    },
    state: AppState.create({
      opts: opts,
      slices: slices,
    }),
  });

  const dispatchSpy = jest.spyOn(store, 'dispatch');

  return {
    store,
    dispatchSpy,
    actionsDispatched,
    getActionNames: () => {
      return getActionNamesDispatched(dispatchSpy);
    },
    getAction: (name: string) => {
      return getActionsDispatched(dispatchSpy, name);
    },
  };
}

export const getActionNamesDispatched = (mockDispatch: jest.SpyInstance) =>
  mockDispatch.mock.calls.map((r) => r[0].name);

export const getActionsDispatched = (
  mockDispatch: jest.SpyInstance,
  name: string,
) => {
  const actions = mockDispatch.mock.calls.map((r) => r[0]);

  if (name) {
    return actions.filter((r) => r.name === name);
  }

  return actions;
};
