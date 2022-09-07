import waitForExpect from 'wait-for-expect';

import { WorkspaceTypeBrowser } from '@bangle.io/constants';
import type {
  ApplicationStore,
  BaseAction,
  OnErrorType,
  Slice,
  SliceKey,
} from '@bangle.io/create-store';
import {
  Extension,
  extensionRegistrySlice,
} from '@bangle.io/extension-registry';
import type {
  BangleApplicationStore,
  BangleStateConfig,
} from '@bangle.io/shared-types';
import {
  editorManagerSlice,
  editorManagerSliceKey,
  getEditor,
} from '@bangle.io/slice-editor-manager';
import { notificationSlice } from '@bangle.io/slice-notification';
import { pageSlice } from '@bangle.io/slice-page';
import { storageProviderSlice } from '@bangle.io/slice-storage-provider';
import { uiSlice } from '@bangle.io/slice-ui';
import {
  createNote,
  createWorkspace,
  getWsName,
  listWorkspaces,
  workspaceSlice,
  workspaceSliceKey,
} from '@bangle.io/slice-workspace';
import type { BaseStorageProvider } from '@bangle.io/storage';
import { IndexedDbStorageProvider } from '@bangle.io/storage';
import { assertNotUndefined, sleep } from '@bangle.io/utils';

import { createPMNode } from './create-pm-node';
import { createTestStore } from './create-test-store';
import { createExtensionRegistry } from './extension-registry';
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
  useUISlice = false,
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
  useUISlice?: boolean;
  onError?: OnErrorType<S, A>;
  opts?: Partial<BangleStateConfig>;
}) {
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

  const defOpts: BangleStateConfig = {
    saveState: jest.fn(),
    extensionRegistry,
    useWebWorker: false,
  };

  const { store, actionsDispatched, dispatchSpy, getActionNames, getAction } =
    createTestStore({
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
    dispatchSpy,
    getActionNames,
    getAction,

    getWsName: () => {
      return getWsName()(store.state as BangleApplicationStore['state']);
    },

    // if user editor, checks if editor is ready to be edited
    isEditorCollabReady: async (editorIndex: number) => {
      const editor = editorManagerSliceKey.callQueryOp(
        store.state,
        getEditor(editorIndex),
      );

      await waitForExpect(() =>
        expect(
          editor?.view.dom.classList.contains('bangle-collab-active'),
        ).toBe(true),
      );
    },

    editorReadyActionsCount: () => {
      return getAction('action::@bangle.io/slice-editor-manager:set-editor')
        .length;
    },
  };
}

export async function setupMockWorkspaceWithNotes(
  store: ApplicationStore,
  wsName = 'test-ws-1',
  // Array of [wsPath, MarkdownString]
  noteWsPaths: Array<[string, string]> = [
    [`${wsName}:one.md`, `# Hello World 0`],
    [`${wsName}:two.md`, `# Hello World 1`],
  ],
  destroyAfterInit = false,
  storageProvider = WorkspaceTypeBrowser,
) {
  if (
    (await listWorkspaces()(store.state, store.dispatch, store)).find(
      (r) => r.name === wsName,
    )
  ) {
    throw new Error(`Workspace ${wsName} already exists`);
  }

  await createWorkspace(wsName, storageProvider)(
    store.state,
    store.dispatch,
    store,
  );

  await waitForExpect(() => {
    expect(getWsName()(store.state)).toBe(wsName);
  });

  for (const [noteWsPath, str] of noteWsPaths) {
    await createNote(noteWsPath, {
      doc: createPMNode([], str.trim()),
    })(store.state, store.dispatch, store);
  }

  await sleep(0);

  if (destroyAfterInit) {
    store.destroy();
  }

  await waitForExpect(() => {
    expect(
      workspaceSliceKey.getSliceStateAsserted(store.state).wsPaths?.length,
    ).toBe(noteWsPaths.length);
  });

  return {
    wsName,
    noteWsPaths,
    store,
    createTestNote: async (wsPath: string, str: string, open: boolean) => {
      assertNotUndefined(store, 'store must be defined');
      await createNote(wsPath, {
        open,
        doc: createPMNode([], str.trim()),
      })(store.state, store.dispatch, store);

      let set = new Set(noteWsPaths.map((r) => r[0]));
      set.add(wsPath);

      await waitForExpect(() => {
        expect(
          workspaceSliceKey.getSliceStateAsserted(store.state).wsPaths?.length,
        ).toBe(set.size);
      });
    },
  };
}
