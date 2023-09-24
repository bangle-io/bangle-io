import { internalApi } from '@bangle.io/api';
import { naukarReplicaSlicesDispatch } from '@bangle.io/bangle-store';
import { setupStore } from '@bangle.io/bangle-store-context';
import { markdownItPlugins, rawSpecs } from '@bangle.io/editor-common';
import { getPlugins } from '@bangle.io/editor-plugins';
import {
  Extension,
  extensionRegistryEffects,
  nsmExtensionRegistry,
} from '@bangle.io/extension-registry';
import type { AnySlice, EffectCreator, SliceId } from '@bangle.io/nsm-3';
import {
  nsmSliceWorkspace,
  nsmWorkspaceEffects,
} from '@bangle.io/nsm-slice-workspace';
import type { EternalVars } from '@bangle.io/shared-types';
import { nsmEditorManagerSlice } from '@bangle.io/slice-editor-manager';
import { nsmNotificationSlice } from '@bangle.io/slice-notification';
import { nsmPageSlice } from '@bangle.io/slice-page';
import {
  refreshWorkspace,
  sliceRefreshWorkspace,
} from '@bangle.io/slice-refresh-workspace';
import { nsmUISlice, uiEffects } from '@bangle.io/slice-ui';
import { IndexedDbStorageProvider } from '@bangle.io/storage';
import { createNaukar } from '@bangle.io/worker-entry';
import { _clearWorker, _setWorker } from '@bangle.io/worker-naukar-proxy';

import { memoryHistoryEffects, memoryHistorySlice } from './memory-history';
import { testEternalVars } from './test-eternal-vars';

type CoreOpts = {
  editor: boolean;
  ui: boolean;
  page: boolean;
  workspace: boolean;
  worker: boolean;
  stateOverride: (base: Record<SliceId, any>) => Record<SliceId, any>;
};

const DEFAULT_CORE_OPTS: CoreOpts = {
  editor: false,
  ui: true,
  page: false,
  workspace: false,
  worker: false,
  stateOverride: (s) => s,
};

export type TestStoreOpts = {
  slices?: AnySlice[];
  effects?: EffectCreator[];
  extensions?: Extension[];
  abortSignal: AbortSignal;
  core?: Partial<CoreOpts>;
  storeName?: string;
};

const getStuff = (
  eternalVars: EternalVars,
  opts: CoreOpts,
): {
  slices: AnySlice[];
  effects: EffectCreator[];
} => {
  let slices: AnySlice[] = [nsmExtensionRegistry];
  let effects: EffectCreator[] = [...extensionRegistryEffects];

  if (opts.page) {
    slices.push(nsmPageSlice, memoryHistorySlice);
    effects.push(...memoryHistoryEffects);
  }

  if (opts.editor) {
    slices.push(nsmEditorManagerSlice);
  }

  if (opts.workspace) {
    slices.push(sliceRefreshWorkspace, nsmSliceWorkspace);
    effects.push(...nsmWorkspaceEffects);
  }

  if (opts.ui) {
    slices.push(nsmUISlice);
    slices.push(nsmNotificationSlice);
    effects.push(...uiEffects);
  }

  return {
    slices: [...slices, ...eternalVars.extensionRegistry.getNsmSlices()],
    effects: [...effects, ...eternalVars.extensionRegistry.getNsmEffects()],
  };
};

export function setupTestStore(_opts: TestStoreOpts) {
  const coreOpts: CoreOpts = {
    ...DEFAULT_CORE_OPTS,
    ..._opts.core,
  };

  const extensions = setupExtensions(_opts);

  const eternalVars = testEternalVars({
    extensions: extensions,
  });

  const { slices, effects } = getStuff(eternalVars, coreOpts);

  const debugLog = typeof jest === 'undefined' ? () => {} : jest.fn();

  const initStateOverride: Record<string, any> = {
    [nsmExtensionRegistry.sliceId]: {
      extensionRegistry: eternalVars.extensionRegistry,
    },
  };

  const testStore = setupStore({
    name: _opts.storeName,
    type: 'test',
    slices: [...slices, ...(_opts.slices ?? [])],
    effects: [...effects, ...(_opts.effects ?? [])],
    eternalVars,
    onRefreshWorkspace: (store) => {
      store.dispatch(refreshWorkspace(), {
        debugInfo: 'test-storage-provider-change',
      });
    },
    otherStoreParams: {
      debug: debugLog,
      stateOverride: coreOpts.stateOverride(initStateOverride),
      overrideEffectScheduler(cb, opts) {
        if (opts.deferred) {
          setTimeout(cb, 0);
        } else {
          queueMicrotask(cb);
        }
      },
    },

    registerWorker: !coreOpts.worker
      ? undefined
      : {
          async setup(store) {
            const naukarEternalVars = testEternalVars({
              extensions: extensions,
            });

            const worker = createNaukar(naukarEternalVars, store.destroySignal);

            _setWorker(worker);

            return worker;
          },
          api(store) {
            return {
              application: {
                onError: async (error: Error) => {
                  console.log(error);
                },
              },
              replicaSlices: naukarReplicaSlicesDispatch(store),
            };
          },
        },
  });

  internalApi._internal_setStore(testStore);

  _opts.abortSignal.addEventListener(
    'abort',
    () => {
      _clearWorker();
      testStore.destroy();
    },
    {
      once: true,
    },
  );

  return {
    testStore,
    eternalVars,
  };
}

function setupExtensions(opts: TestStoreOpts): Extension[] {
  let extensions = Array.from(opts.extensions ?? []);

  if (opts.core?.workspace) {
    const storageProvider = new IndexedDbStorageProvider();

    extensions.push(
      Extension.create({
        name: 'test-extension',
        application: {
          storageProvider: storageProvider,
          onStorageError: () => false,
        },
      }),
    );
  }

  if (opts.core?.editor) {
    extensions.push(
      Extension.create({
        name: 'test-core-editor',
        editor: {
          specs: rawSpecs,
          plugins: [getPlugins()],
          markdownItPlugins: markdownItPlugins,
        },
      }),
    );
  }

  return extensions;
}
