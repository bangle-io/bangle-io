import type {
  BaseAction,
  OnErrorType,
  SchedulerType,
  SliceArray,
  SliceKey,
} from '@bangle.io/create-store';
import { ApplicationStore, AppState } from '@bangle.io/create-store';

let controller = new AbortController();

// so that we are not keeping the store alive when running tests
let _beforeEach = typeof jest === 'undefined' ? () => {} : beforeEach;
let _afterEach = typeof jest === 'undefined' ? () => {} : afterEach;

_beforeEach(() => {
  controller.abort();
  controller = new AbortController();
});

_afterEach(() => {
  controller.abort();
});

// creates a store with provided slices
// if you need a store with batteries included, use
// createBasicStore or createBasicTestStore
export function createBareStore<SL = any, A extends BaseAction = any, S = SL>({
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
  actionsDispatched: BaseAction[];
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
    actionsDispatched,
  };
}
