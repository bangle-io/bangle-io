import { STORAGE_ON_CHANGE_EMITTER_KEY } from '@bangle.io/constants';
import type { EffectCreator, Slice, Store } from '@bangle.io/nsm-3';
import { store } from '@bangle.io/nsm-3';
import type {
  EternalVars,
  StorageProviderChangeType,
} from '@bangle.io/shared-types';

// a common store setup for all environments window, worker, test

export function setupStore<T extends string>(opts: {
  slices: Array<Slice<T, any, any>>;
  eternalVars: EternalVars;
  effects: EffectCreator[];
  type: 'window' | 'worker' | 'test';
  onRefreshWorkspace: (store: Store<T>) => void;
  otherStoreParams: Omit<Parameters<typeof store>[0], 'slices' | 'storeName'>;
}) {
  const {
    effects,
    eternalVars,
    onRefreshWorkspace,
    otherStoreParams,
    slices,
    type,
  } = opts;

  const storeName = `bangle-store-${type}`;

  const appStore = store<T>({
    storeName,
    slices,
    ...otherStoreParams,
  });

  effects.forEach((effect) => {
    appStore.registerEffect(effect);
  });

  const onStorageProviderChange = (msg: StorageProviderChangeType) => {
    // Note: ensure you also update the worker store
    if (
      msg.type === 'delete' ||
      msg.type === 'create' ||
      msg.type === 'rename'
    ) {
      onRefreshWorkspace(appStore);
    }
  };

  eternalVars.storageEmitter.on(
    STORAGE_ON_CHANGE_EMITTER_KEY,
    onStorageProviderChange,
  );

  appStore.destroySignal.addEventListener(
    'abort',
    () => {
      eternalVars.storageEmitter.off(
        STORAGE_ON_CHANGE_EMITTER_KEY,
        onStorageProviderChange,
      );
    },
    {
      once: true,
    },
  );

  return appStore;
}
