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

let controller = new AbortController();

beforeEach(() => {
  controller.abort();
  controller = new AbortController();
});

afterEach(() => {
  controller.abort();
});

// creates a store with provided slices
// if you need a store with batteries included, use
// createBasicTestStore
export function createTestStore<SL = any, A extends BaseAction = any, S = SL>({
  storeName = 'test-store',
  // if state is provided, slices will not be used
  slices = [],
  state,
  opts,
  // slice key purely for getting the types of the store correct
  sliceKey,
  onError,
  disableSideEffects,
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
  storeName?: string;
  // for getting the types right
  sliceKey?: SliceKey<SL, A, S>;
  slices?: SliceArray<any, any>;
  state?: ApplicationStore['state'];
  opts?: any;
  disableSideEffects?: boolean;
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
    storeName,
    onError,
    disableSideEffects,
    dispatchAction: (store, action) => {
      let newState = store.state.applyAction(action);
      store.updateState(newState);
      actionsDispatched.push(action);
    },
    state:
      state ??
      AppState.create({
        opts: opts,
        slices: slices,
      }),
  });

  const dispatchSpy = jest.spyOn(store, 'dispatch');

  controller.signal.addEventListener(
    'abort',
    () => {
      store.destroy();
    },
    {
      once: true,
    },
  );

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
