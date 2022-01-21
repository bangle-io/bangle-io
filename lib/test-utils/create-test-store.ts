import {
  ApplicationStore,
  AppState,
  BaseAction,
  SliceArray,
} from '@bangle.io/create-store';

export function createTestStore<A extends BaseAction = any>(
  slices: SliceArray,
  opts = {},
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
): {
  store: ApplicationStore<any, A>;
  dispatchSpy: jest.SpyInstance;
  actionsDispatched: BaseAction[];
} {
  let actionsDispatched: BaseAction[] = [];
  const store = ApplicationStore.create<any, any>({
    scheduler: scheduler,
    storeName: 'test-store',
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

  return { store, dispatchSpy, actionsDispatched };
}
