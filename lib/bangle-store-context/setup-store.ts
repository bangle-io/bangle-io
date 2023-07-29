import * as Comlink from 'comlink';

import { STORAGE_ON_CHANGE_EMITTER_KEY } from '@bangle.io/constants';
import { wireCollabMessageBus } from '@bangle.io/editor-common';
import type { EffectCreator, Slice, Store } from '@bangle.io/nsm-3';
import { store } from '@bangle.io/nsm-3';
import type {
  EternalVars,
  NaukarMainAPI,
  NaukarWorkerAPIInternal,
  StorageProviderChangeType,
} from '@bangle.io/shared-types';
import { registerStorageProvider } from '@bangle.io/workspace-info';

const eternalValMap = new WeakMap<Store, EternalVars>();

export function getEternalVars(store: Store): EternalVars {
  const eternalVars = eternalValMap.get(store);

  if (!eternalVars) {
    throw new Error('Eternal vars not set');
  }

  return eternalVars;
}

// a common store setup for all environments window, worker, test
export function setupStore<
  TSliceName extends string,
  TType extends 'window' | 'worker' | 'test',
>(opts: {
  name?: string;
  slices: Array<Slice<TSliceName, any, any>>;
  eternalVars: EternalVars;
  effects: EffectCreator[];
  type: TType;
  registerWorker?: {
    setup: (store: Store<TSliceName>) => Promise<NaukarWorkerAPIInternal>;
    api: (store: Store<TSliceName>, eternalVars: EternalVars) => NaukarMainAPI;
  };
  onRefreshWorkspace: (store: Store<TSliceName>) => void;
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

  for (const storageProvider of eternalVars.extensionRegistry.getAllStorageProviders()) {
    storageProvider.onChange = (data) => {
      eternalVars.storageEmitter.emit(STORAGE_ON_CHANGE_EMITTER_KEY, data);
    };

    registerStorageProvider(
      storageProvider,
      eternalVars.extensionRegistry.specRegistry,
    );
  }

  const storeName = opts.name ?? `bangle-store-${type}`;

  const appStore = store<TSliceName>({
    storeName,
    slices,
    ...otherStoreParams,
  });

  eternalValMap.set(appStore, eternalVars);

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
      if (!appStore.destroyed) {
        onRefreshWorkspace(appStore);
      }
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

  if (opts.registerWorker) {
    if (type === 'worker') {
      throw new Error('Worker cannot register worker');
    }

    opts.registerWorker.setup(appStore).then((naukar) => {
      if (!opts.registerWorker) {
        return;
      }

      const editorCollabMessageChannel = new MessageChannel();

      wireCollabMessageBus(
        editorCollabMessageChannel.port1,
        eternalVars.editorCollabMessageBus,
        appStore.destroySignal,
      );

      naukar.__internal_register_main_cb(
        Comlink.proxy(opts.registerWorker.api(appStore, eternalVars)),
      );

      naukar.editor.registerCollabMessagePort(
        Comlink.transfer(editorCollabMessageChannel.port2, [
          editorCollabMessageChannel.port2,
        ]),
      );
    });
  }

  return appStore;
}
