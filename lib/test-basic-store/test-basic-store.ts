import { WorkspaceType } from '@bangle.io/constants';
import { ApplicationStore, Slice, SliceKey } from '@bangle.io/create-store';
import { extensionRegistrySlice } from '@bangle.io/extension-registry';
import { BaseHistory, createTo, MemoryHistory } from '@bangle.io/history';
import type { NaukarStateConfig } from '@bangle.io/shared-types';
import {
  pageSlice,
  pageSliceKey,
  PageSliceStateType,
  syncPageLocation,
} from '@bangle.io/slice-page';
import {
  createNote,
  createWorkspace,
  listWorkspaces,
  workspaceSlice,
} from '@bangle.io/slice-workspace';
import { createPMNode } from '@bangle.io/test-utils/create-pm-node';
import { createTestStore } from '@bangle.io/test-utils/create-test-store';
import { createExtensionRegistry } from '@bangle.io/test-utils/extension-registry';
import { clearFakeIdb } from '@bangle.io/test-utils/fake-idb';
import * as idbHelpers from '@bangle.io/test-utils/indexedb-ws-helpers';
import { assertActionName, sleep } from '@bangle.io/utils';

export function createBasicTestStore(
  slices: Slice[] = [],
  { useMemoryHistory = true } = {},
) {
  let extensionRegistry = createExtensionRegistry([], { editorCore: true });

  const opts: Omit<NaukarStateConfig, 'port'> = {
    extensionRegistry,
  };
  const { store, actionsDispatched, dispatchSpy } = createTestStore(
    [
      extensionRegistrySlice(),
      mockMemoryHistorySlice(),
      pageSlice(),
      workspaceSlice(),
      ...slices,
    ],
    opts,
  );

  return { extensionRegistry, store, actionsDispatched, dispatchSpy };
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
  store: ApplicationStore = createBasicTestStore().store,
  wsName = 'test-ws-1',
  // Array of [wsPath, MarkdownString]
  noteWsPaths: [string, string][] = [
    [`${wsName}:one.md`, `# Hello World 0`],
    [`${wsName}:two.md`, `# Hello World 1`],
  ],
) {
  if (
    (await listWorkspaces()(store.state, store.dispatch, store)).find(
      (r) => r.name === wsName,
    )
  ) {
    throw new Error(`Workspace ${wsName} already exists`);
  }

  await createWorkspace(wsName, WorkspaceType.browser)(
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

  return { wsName, noteWsPaths, store };
}

const historySliceKey = new SliceKey<
  { history: BaseHistory | undefined },
  {
    name: 'action::@bangle.io/test-basic-store:history-slice-set-history';
    value: {
      history: BaseHistory;
    };
  }
>('test-memory-history-slice');

export function mockMemoryHistorySlice() {
  assertActionName('@bangle.io/test-basic-store', historySliceKey);

  return new Slice({
    key: historySliceKey,
    state: {
      init() {
        return {
          history: undefined,
        };
      },
      apply(action, state) {
        switch (action.name) {
          case 'action::@bangle.io/test-basic-store:history-slice-set-history': {
            return {
              ...state,
              history: action.value.history,
            };
          }
          default: {
            return state;
          }
        }
      },
    },
    sideEffect: [mockHistoryEffect],
  });
}

// sets up history and watches for any changes in it
const mockHistoryEffect = historySliceKey.effect(() => {
  let lastProcessed: PageSliceStateType['pendingNavigation'];

  return {
    update(store) {
      const { pendingNavigation } = pageSliceKey.getSliceStateAsserted(
        store.state,
      );

      const { history } = historySliceKey.getSliceStateAsserted(store.state);

      if (!history || !pendingNavigation) {
        return;
      }

      if (pendingNavigation === lastProcessed) {
        return;
      }

      lastProcessed = pendingNavigation;
      if (pendingNavigation.preserve) {
        history?.navigate(createTo(pendingNavigation.location, history), {
          replace: pendingNavigation.replaceHistory,
        });
      } else {
        let to = pendingNavigation.location.pathname || '';
        if (pendingNavigation.location.search) {
          to += '?' + pendingNavigation.location.search;
        }
        history?.navigate(to, {
          replace: pendingNavigation.replaceHistory,
        });
      }
    },

    deferredOnce(store, abortSignal) {
      const history = new MemoryHistory('', (location) => {
        syncPageLocation(location)(
          store.state,
          pageSliceKey.getDispatch(store.dispatch),
        );
      });

      store.dispatch({
        name: 'action::@bangle.io/test-basic-store:history-slice-set-history',
        value: { history: history },
      });

      syncPageLocation({
        search: history.search,
        pathname: history.pathname,
      })(store.state, pageSliceKey.getDispatch(store.dispatch));

      abortSignal.addEventListener('abort', () => {
        history.destroy();
      });
    },
  };
});
