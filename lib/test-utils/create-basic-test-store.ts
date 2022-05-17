import { WorkspaceTypeBrowser } from '@bangle.io/constants';
import {
  ApplicationStore,
  BaseAction,
  Slice,
  SliceKey,
} from '@bangle.io/create-store';
import {
  Extension,
  extensionRegistrySlice,
} from '@bangle.io/extension-registry';
import { editorManagerSlice } from '@bangle.io/slice-editor-manager';
import { notificationSlice } from '@bangle.io/slice-notification';
import { pageSlice } from '@bangle.io/slice-page';
import {
  createNote,
  createWorkspace,
  listWorkspaces,
  workspaceSlice,
} from '@bangle.io/slice-workspace';
import {
  BaseStorageProvider,
  IndexedDbStorageProvider,
} from '@bangle.io/storage';
import { asssertNotUndefined, sleep } from '@bangle.io/utils';

import { createPMNode } from './create-pm-node';
import { createTestStore } from './create-test-store';
import { createExtensionRegistry } from './extension-registry';
import { clearFakeIdb } from './fake-idb';
import * as idbHelpers from './indexedb-ws-helpers';
import { testMemoryHistorySlice } from './test-memory-history-slice';

if (typeof jest === 'undefined') {
  throw new Error('Can only be with jest');
}

// A batteries included store meant for testing
// It includes the default slices, routing, extension registry
export function createBasicTestStore<
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
  // slice key purely for getting the types of the store correct
  sliceKey,
  scheduler,
  opts,
  onError,
  storageProvider = new IndexedDbStorageProvider(),
}: {
  storageProvider?: BaseStorageProvider;
  scheduler?: any;
  // for getting the types right
  sliceKey?: SliceKey<SL, A, S, C>;
  slices?: Slice[];
  extensions?: Extension[];
  useMemoryHistorySlice?: boolean;
  useEditorCoreExtension?: boolean;
  useEditorManagerSlice?: boolean;
  onError?: ApplicationStore<SL, A>['onError'];
  opts?: any;
} = {}) {
  let extensionRegistry = createExtensionRegistry(
    [
      Extension.create({
        name: 'test-extension',
        application: {
          storageProvider: storageProvider,
          onStorageError: () => false,
        },
      }),
      ...extensions,
    ],
    {
      editorCore: useEditorCoreExtension,
    },
  );

  const { store, actionsDispatched, dispatchSpy, getActionNames, getAction } =
    createTestStore({
      sliceKey,
      scheduler,
      onError,
      slices: [
        extensionRegistrySlice(),
        useMemoryHistorySlice ? testMemoryHistorySlice() : undefined,
        pageSlice(),
        workspaceSlice(),
        useEditorManagerSlice ? editorManagerSlice() : undefined,
        notificationSlice(),
        ...slices,
      ].filter((r): r is Slice => Boolean(r)),
      opts: {
        extensionRegistry,
        ...opts,
      },
    });

  return {
    extensionRegistry,
    store,
    actionsDispatched,
    dispatchSpy,
    getActionNames,
    getAction,
  };
}

export const jestHooks = {
  beforeEach: () => {
    idbHelpers.beforeEachHook();
  },
  afterEach: () => {
    idbHelpers.afterEachHook();
    clearFakeIdb();
  },
};

export async function setupMockWorkspaceWithNotes(
  store?: ApplicationStore,
  wsName = 'test-ws-1',
  // Array of [wsPath, MarkdownString]
  noteWsPaths: Array<[string, string]> = [
    [`${wsName}:one.md`, `# Hello World 0`],
    [`${wsName}:two.md`, `# Hello World 1`],
  ],
  destroyAfterInit = false,
) {
  if (!store) {
    store = createBasicTestStore().store;
  }
  if (
    (await listWorkspaces()(store.state, store.dispatch, store)).find(
      (r) => r.name === wsName,
    )
  ) {
    throw new Error(`Workspace ${wsName} already exists`);
  }

  await createWorkspace(wsName, WorkspaceTypeBrowser)(
    store.state,
    store.dispatch,
    store,
  );

  await sleep(0);

  for (const [noteWsPath, str] of noteWsPaths) {
    await createNote(noteWsPath, {
      doc: createPMNode([], str.trim()),
    })(store.state, store.dispatch, store);
  }

  await sleep(0);

  if (destroyAfterInit) {
    store.destroy();
  }

  return {
    wsName,
    noteWsPaths,
    store,
    createTestNote: async (wsPath: string, str: string, open: boolean) => {
      asssertNotUndefined(store, 'store must be defined');
      await createNote(wsPath, {
        open,
        doc: createPMNode([], str.trim()),
      })(store.state, store.dispatch, store);
    },
  };
}
