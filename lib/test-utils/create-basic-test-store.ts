import waitForExpect from 'wait-for-expect';

import { WorkspaceType } from '@bangle.io/constants';
import type { ApplicationStore, BaseAction } from '@bangle.io/create-store';
// import type { BangleApplicationStore } from '@bangle.io/shared-types';
// import {
//   createNote,
//   createWorkspace,
//   getWsName,
//   workspaceSliceKey,
// } from '@bangle.io/slice-workspace';
import { assertNotUndefined, sleep } from '@bangle.io/utils';
import { readAllWorkspacesInfo } from '@bangle.io/workspace-info';

import { createBasicStore } from './create-basic-store';
import { createPMNode } from './create-pm-node';

if (typeof jest === 'undefined') {
  console.warn('test-utils not using with jest');
}

// a wrapper around createBasicStore but with jest helpers for easier testing
export function createBasicTestStore<
  SL = any,
  A extends BaseAction = any,
  S = SL,
  C extends { [key: string]: any } = any,
>(param: Parameters<typeof createBasicStore<SL, A, S, C>>[0]) {
  const { store, actionsDispatched, extensionRegistry } =
    createBasicStore(param);

  const getAction = (name: string | RegExp) => {
    return getActionsDispatched(dispatchSpy, name);
  };

  const dispatchSpy = jest.spyOn(store, 'dispatch');

  return {
    extensionRegistry,
    store,
    actionsDispatched,
    getWsName: () => {
      // @ts-expect-error
      return getWsName()(store.state as any);
    },
    // if user editor, checks if editor is ready to be edited
    isEditorCollabReady: async (editorIndex: number) => {
      // const editor = editorManagerSliceKey.callQueryOp(
      //   store.state,
      //   getEditor(editorIndex),
      // );
      // await waitForExpect(() =>
      //   expect(
      //     editor?.view.dom.classList.contains('bangle-collab-active'),
      //   ).toBe(true),
      // );
    },
    editorReadyActionsCount: () => {
      return getAction('action::@bangle.io/slice-editor-manager:set-editor')
        .length;
    },
    getActionNames: () => {
      return getActionNamesDispatched(dispatchSpy);
    },
    getAction,
    dispatchSpy,
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
  storageProvider: string = WorkspaceType.Browser,
) {
  if ((await readAllWorkspacesInfo()).find((r) => r.name === wsName)) {
    throw new Error(`Workspace ${wsName} already exists`);
  }
  // @ts-expect-error
  await createWorkspace(wsName, storageProvider)(
    store.state,
    store.dispatch,
    store,
  );

  await waitForExpect(() => {
    // @ts-expect-error
    expect(getWsName()(store.state)).toBe(wsName);
  });

  for (const [noteWsPath, str] of noteWsPaths) {
    // @ts-expect-error
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
      // @ts-expect-error
      workspaceSliceKey.getSliceStateAsserted(store.state).wsPaths?.length,
    ).toBe(noteWsPaths.length);
  });

  return {
    wsName,
    noteWsPaths,
    store,
    createTestNote: async (wsPath: string, str: string, open: boolean) => {
      assertNotUndefined(store, 'store must be defined');
      // @ts-expect-error
      await createNote(wsPath, {
        open,
        doc: createPMNode([], str.trim()),
      })(store.state, store.dispatch, store);

      let set = new Set(noteWsPaths.map((r) => r[0]));
      set.add(wsPath);

      await waitForExpect(() => {
        expect(
          // @ts-expect-error
          workspaceSliceKey.getSliceStateAsserted(store.state).wsPaths?.length,
        ).toBe(set.size);
      });
    },
  };
}

export const getActionNamesDispatched = (mockDispatch: jest.SpyInstance) =>
  mockDispatch.mock.calls.map((r) => r[0].name);

export const getActionsDispatched = (
  mockDispatch: jest.SpyInstance,
  name: string | RegExp,
) => {
  const actions = mockDispatch.mock.calls.map((r) => r[0]);

  if (name) {
    return actions.filter((r) =>
      name instanceof RegExp ? name.test(r.name) : r.name === name,
    );
  }

  return actions;
};
