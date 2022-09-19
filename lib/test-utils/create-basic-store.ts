import type {
  BaseAction,
  OnErrorType,
  Slice,
  SliceKey,
} from '@bangle.io/create-store';
import {
  Extension,
  extensionRegistrySlice,
} from '@bangle.io/extension-registry';
import type { BangleStateConfig } from '@bangle.io/shared-types';
import { editorManagerSlice } from '@bangle.io/slice-editor-manager';
import { notificationSlice } from '@bangle.io/slice-notification';
import { pageSlice } from '@bangle.io/slice-page';
import { storageProviderSlice } from '@bangle.io/slice-storage-provider';
import { uiSlice } from '@bangle.io/slice-ui';
import { workspaceSlice } from '@bangle.io/slice-workspace';
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
  opts?: Partial<BangleStateConfig>;
}) {
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

  const defOpts: BangleStateConfig = {
    // TODO can we remove jest dependency here?
    saveState: typeof jest === 'undefined' ? () => {} : jest.fn(),
    extensionRegistry,
    useWebWorker: false,
  };

  const { store, actionsDispatched } = createBareStore({
    onError,
    opts: {
      ...defOpts,
      ...opts,
    },
    scheduler,
    sliceKey,
    slices: [
      extensionRegistrySlice(),
      useMemoryHistorySlice ? testMemoryHistorySlice() : undefined,
      storageProviderSlice(),
      pageSlice(),
      workspaceSlice(),
      useEditorManagerSlice ? editorManagerSlice() : undefined,
      notificationSlice(),
      useUISlice ? uiSlice() : undefined,
      ...extensionRegistry.getSlices(),
      ...slices,
    ].filter((r): r is Slice => Boolean(r)),
  });

  return {
    extensionRegistry,
    store,
    actionsDispatched,
  };
}
