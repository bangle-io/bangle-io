/**
 * @jest-environment @bangle.io/jsdom-env
 */
import { act, render } from '@testing-library/react';
import React from 'react';

import { CollabManager } from '@bangle.dev/collab-manager';

import { workspace } from '@bangle.io/api';
import {
  PRIMARY_EDITOR_INDEX,
  SECONDARY_EDITOR_INDEX,
} from '@bangle.io/constants';
import { Editor } from '@bangle.io/editor';
import { getEditor } from '@bangle.io/slice-editor-manager';
import {
  getOpenedWsPaths,
  updateOpenedWsPaths,
  workspaceSliceKey,
} from '@bangle.io/slice-workspace';
import {
  setupMockMessageChannel,
  setupMockWorkspaceWithNotes,
  TestStoreProvider,
  waitForExpect,
} from '@bangle.io/test-utils';
import { resolvePath } from '@bangle.io/ws-path';

import { getCollabManager } from '../worker-editor-slice';
import { setup } from './test-helpers';

let originalConsoleWarn = console.warn;
let cleanup = () => {};
beforeEach(() => {
  console.warn = jest.fn();
  cleanup = setupMockMessageChannel();
});

afterEach(() => {
  cleanup();
  console.warn = originalConsoleWarn;
});

const DOC_CONTENT = 'hello mars';

describe('worker-editor-slice', () => {
  test('should enable syncing of editors and writing to disk', async () => {
    const { store, extensionRegistry, typeText, editorReadyActionsCount } =
      await setup({});
    const wsPath1 = 'my-ws:test-dir/magic.md';
    const { wsName } = resolvePath(wsPath1);
    await setupMockWorkspaceWithNotes(store, wsName, [
      [wsPath1, `# ${DOC_CONTENT}`],
    ]);

    const { container } = render(
      <TestStoreProvider bangleStore={store} bangleStoreChanged={0}>
        <Editor
          editorId={PRIMARY_EDITOR_INDEX}
          wsPath={wsPath1}
          className="test-class"
          extensionRegistry={extensionRegistry}
        />
        <Editor
          editorId={SECONDARY_EDITOR_INDEX}
          wsPath={wsPath1}
          className="test-class"
          extensionRegistry={extensionRegistry}
        />
      </TestStoreProvider>,
    );

    await act(async () => {
      await waitForExpect(() => {
        expect(container.querySelector('.bangle-collab-active')).toBeInstanceOf(
          HTMLElement,
        );
        expect(editorReadyActionsCount()).toBe(2);
      });
    });

    const collabManager = getCollabManager()(store.state)!;

    expect(collabManager).toBeInstanceOf(CollabManager);

    await waitForExpect(() =>
      expect([...collabManager.getAllDocNames()]).toEqual([wsPath1]),
    );

    expect(collabManager.getCollabState(wsPath1)?.version).toEqual(0);
    expect(collabManager.getCollabState(wsPath1)?.steps).toEqual([]);
    expect(collabManager.getCollabState(wsPath1)?.doc.toString()).toEqual(
      'doc(heading("hello mars"))',
    );

    await waitForExpect(() => {
      expect(
        getEditor(PRIMARY_EDITOR_INDEX)(store.state)?.toHTMLString(),
      ).toEqual('<h1>hello mars</h1>');
    });

    expect(
      getEditor(SECONDARY_EDITOR_INDEX)(store.state)?.toHTMLString(),
    ).toMatchInlineSnapshot(`"<h1>hello mars</h1>"`);

    // typing in primary editor should sync to secondary editor since they are the same doc
    await typeText(PRIMARY_EDITOR_INDEX, 'I can type! ');

    expect(
      getEditor(PRIMARY_EDITOR_INDEX)(store.state)?.toHTMLString(),
    ).toMatchInlineSnapshot(`"<h1>I can type! hello mars</h1>"`);

    await waitForExpect(() =>
      expect(collabManager.getCollabState(wsPath1)?.version).toEqual(1),
    );
    await waitForExpect(() =>
      expect(
        getEditor(SECONDARY_EDITOR_INDEX)(store.state)?.toHTMLString(),
      ).toEqual(`<h1>I can type! hello mars</h1>`),
    );

    // Close editors and check if things are ok
    workspace.closeOpenedEditor()(store.state, store.dispatch);

    await waitForExpect(
      () => {
        // the collab manager should have removed the doc
        expect([...collabManager.getAllDocNames()]).toEqual([]);
      },
      // there is a 1000 ms wait before instance is deleted
      1500,
      250,
    );

    // should persist the updated doc to disk
    expect(
      (
        await workspace.getNote(wsPath1)(store.state, store.dispatch, store)
      )?.toString(),
    ).toEqual('doc(heading("I can type! hello mars"))');
  });

  test('should call resetDoc on docs that are no longer opened', async () => {
    const { store, extensionRegistry, editorReadyActionsCount } = await setup(
      {},
    );
    const wsPath1 = 'my-ws:test-dir/magic.md';
    const { wsName } = resolvePath(wsPath1);
    await setupMockWorkspaceWithNotes(store, wsName, [
      [wsPath1, `# hello mars`],
    ]);

    render(
      <TestStoreProvider bangleStore={store} bangleStoreChanged={0}>
        <Editor
          editorId={PRIMARY_EDITOR_INDEX}
          wsPath={wsPath1}
          className="test-class"
          extensionRegistry={extensionRegistry}
        />
        <Editor
          editorId={SECONDARY_EDITOR_INDEX}
          wsPath={wsPath1}
          className="test-class"
          extensionRegistry={extensionRegistry}
        />
      </TestStoreProvider>,
    );

    await act(async () => {
      await waitForExpect(() => {
        expect(editorReadyActionsCount()).toBe(2);
      });
    });

    const collabManager = getCollabManager()(store.state)!;

    const requestDeleteInstanceSpy = jest.spyOn(
      collabManager,
      'requestDeleteInstance',
    );

    expect(getOpenedWsPaths()(store.state).getWsPaths()).toEqual([wsPath1]);

    expect(requestDeleteInstanceSpy).not.toHaveBeenCalled();

    workspaceSliceKey.callOp(
      store.state,
      store.dispatch,
      updateOpenedWsPaths((openedWsPath) => {
        return openedWsPath.closeAll();
      }),
    );

    await waitForExpect(() => {
      expect(requestDeleteInstanceSpy).toBeCalledTimes(1);
    });
    expect(requestDeleteInstanceSpy).nthCalledWith(1, wsPath1);
  });
});
