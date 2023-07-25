import type {
  ApplicationStore,
  BaseAction,
  OnErrorType,
  SliceKey,
} from '@bangle.io/create-store';
import { overrideSliceInit, Slice } from '@bangle.io/create-store';
import { Extension } from '@bangle.io/extension-registry';
import {} from '@bangle.io/slice-editor-manager';
import { pageSlice, pageSliceKey } from '@bangle.io/slice-page';
import type { BaseStorageProvider } from '@bangle.io/storage';
import {
  IndexedDbStorageProvider,
  MemoryStorageProvider,
} from '@bangle.io/storage';

import { createBareStore } from './create-bare-store';
import { createExtensionRegistry } from './extension-registry';
import { testMemoryHistorySlice } from './test-memory-history-slice';

// A batteries included store meant for setting up a store
// It includes the default slices, routing, extension registry
export function createBasicStore<
  SL = any,
  A extends BaseAction = any,
  S = SL,
  C extends { [key: string]: any } = any,
>({
  slices = [],
  extensions = [],
  useMemoryHistorySlice = true,
  useEditorCoreExtension = true,
  useEditorManagerSlice = false,
  useUISlice = false,
  // slice key purely for getting the types of the store correct
  sliceKey,
  scheduler,
  opts,
  onError,
  storageProvider = new IndexedDbStorageProvider(),
  overrideInitialSliceState,
  onUpdate,
}: {
  storageProvider?: BaseStorageProvider | 'indexedb' | 'in-memory';
  scheduler?: any;
  // for getting the types right
  sliceKey?: SliceKey<SL, A, S, C>;
  slices?: Slice[];
  extensions?: Extension[];
  useMemoryHistorySlice?: boolean;
  useEditorCoreExtension?: boolean;
  useEditorManagerSlice?: boolean;
  useUISlice?: boolean;
  onError?: OnErrorType<S, A>;
  opts?: Partial<any>;
  onUpdate?: (store: ApplicationStore) => void;
  overrideInitialSliceState?: Parameters<typeof overrideSliceStates>[1];
}) {
  if (useEditorManagerSlice && !useUISlice) {
    throw new Error(
      'useEditorManagerSlice requires useUISlice to be true, as it uses the uiSlice',
    );
  }

  let _storageProvider: BaseStorageProvider;

  if (storageProvider === 'indexedb') {
    _storageProvider = new IndexedDbStorageProvider();
  } else if (storageProvider === 'in-memory') {
    _storageProvider = new MemoryStorageProvider();
  } else {
    _storageProvider = storageProvider;
  }

  let extensionRegistry = createExtensionRegistry(
    [
      Extension.create({
        name: 'test-extension',
        application: {
          storageProvider: _storageProvider,
          onStorageError: () => false,
        },
      }),
      ...extensions,
    ],
    {
      editorCore: useEditorCoreExtension,
    },
  );

  // @ts-expect-error
  const defOpts: BangleStateConfig = {
    // TODO can we remove jest dependency here?
    saveState: typeof jest === 'undefined' ? () => {} : jest.fn(),
    extensionRegistry,
    useWebWorker: false,
  };

  const finalSlices = [
    // extensionRegistrySlice(),
    useMemoryHistorySlice ? testMemoryHistorySlice() : undefined,
    // storageProviderSlice(),
    pageSlice(),
    // workspaceSlice(),
    // useEditorManagerSlice ? editorManagerSlice() : undefined,
    // notificationSlice(),
    // useUISlice ? uiSlice() : undefined,
    ...extensionRegistry.getSlices(),
    ...slices,
    // keep at last
    new Slice({
      sideEffect() {
        return {
          deferredUpdate(store) {
            onUpdate?.(store);
          },
        };
      },
    }),
  ].filter((r): r is Slice => Boolean(r));

  const { store, actionsDispatched } = createBareStore({
    onError,
    opts: {
      ...defOpts,
      ...opts,
    },
    scheduler,
    sliceKey,
    slices: overrideSliceStates(finalSlices, overrideInitialSliceState),
  });

  return {
    extensionRegistry,
    store,
    actionsDispatched,
  };
}

// this object exists to avoid test writers import the keys
export interface TestInitialSliceStateOverride {
  // uiSlice?: Partial<ReturnType<(typeof uiSliceKey)['getSliceState']>>;
  pageSlice?: Partial<ReturnType<(typeof pageSliceKey)['getSliceState']>>;
  // editorManagerSlice?: Partial<
  //   ReturnType<(typeof editorManagerSliceKey)['getSliceState']>
  // >;
}

function overrideSliceStates(
  slices: Slice[],
  override?: TestInitialSliceStateOverride,
) {
  return slices.map((slice) => {
    // if (override?.uiSlice && slice.key === uiSliceKey.key) {
    //   return overrideSliceInit(slice, (s) => ({
    //     ...s,
    //     ...override.uiSlice,
    //   }));
    // }

    if (override?.pageSlice && slice.key === pageSliceKey.key) {
      return overrideSliceInit(slice, (s) => ({
        ...s,
        ...override.pageSlice,
      }));
    }

    // if (
    //   override?.editorManagerSlice &&
    //   slice.key === editorManagerSliceKey.key
    // ) {
    //   return overrideSliceInit(slice, (s) => ({
    //     ...s,
    //     ...override.editorManagerSlice,
    //   }));
    // }

    return slice;
  });
}
