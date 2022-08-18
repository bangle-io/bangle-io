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
} from '@bangle.io/test-utils';
import { sleep } from '@bangle.io/utils';
import { resolvePath } from '@bangle.io/ws-path';

import { getCollabManager } from '../operations';
import { setup } from './test-helpers';

let abortController = new AbortController();
let signal = abortController.signal;

let originalConsoleWarn = console.warn;
let cleanup = () => {};
beforeEach(() => {
  abortController = new AbortController();
  signal = abortController.signal;
  console.warn = jest.fn();
  cleanup = setupMockMessageChannel();
});

afterEach(() => {
  abortController.abort();
  cleanup();
  console.warn = originalConsoleWarn;
});

test('should enable syncing of editors and writing to disk', async () => {
  const { store, extensionRegistry, typeText } = await setup({ signal });
  const wsPath1 = 'my-ws:test-dir/magic.md';
  const { wsName } = resolvePath(wsPath1);
  await setupMockWorkspaceWithNotes(store, wsName, [[wsPath1, `# hello mars`]]);
  let result;
  act(() => {
    result = render(
      <TestStoreProvider
        editorManagerContextProvider
        bangleStore={store}
        bangleStoreChanged={0}
      >
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
  });

  await act(() => {
    return sleep(0);
  });

  const collabManager = getCollabManager()(store.state)!;

  expect(collabManager).toBeInstanceOf(CollabManager);

  await sleep(0);

  expect([...collabManager.getAllDocNames()]).toEqual([wsPath1]);
  expect(collabManager.getCollabState(wsPath1)?.version).toEqual(0);
  expect(collabManager.getCollabState(wsPath1)?.steps).toEqual([]);
  expect(collabManager.getCollabState(wsPath1)?.doc.toString()).toEqual(
    'doc(heading("hello mars"))',
  );

  expect(
    getEditor(PRIMARY_EDITOR_INDEX)(store.state)?.toHTMLString(),
  ).toMatchInlineSnapshot(`"<h1>hello mars</h1>"`);
  expect(
    getEditor(SECONDARY_EDITOR_INDEX)(store.state)?.toHTMLString(),
  ).toMatchInlineSnapshot(`"<h1>hello mars</h1>"`);

  // typing in primary editor should sync to secondary editor since they are the same doc
  typeText(PRIMARY_EDITOR_INDEX, 'I can type! ');

  expect(
    getEditor(PRIMARY_EDITOR_INDEX)(store.state)?.toHTMLString(),
  ).toMatchInlineSnapshot(`"<h1>I can type! hello mars</h1>"`);

  await sleep(0);

  expect(collabManager.getCollabState(wsPath1)?.version).toEqual(1);

  expect(
    getEditor(SECONDARY_EDITOR_INDEX)(store.state)?.toHTMLString(),
  ).toMatchInlineSnapshot(`"<h1>I can type! hello mars</h1>"`);

  // Close editors and check if things are ok
  workspace.closeOpenedEditor()(store.state, store.dispatch);

  await sleep(0);

  // the collab manager should have removed the doc
  expect([...collabManager.getAllDocNames()]).toEqual([]);

  // should persist the updated doc to disk
  expect(
    (
      await workspace.getNote(wsPath1)(store.state, store.dispatch, store)
    )?.toString(),
  ).toEqual('doc(heading("I can type! hello mars"))');
});

test('should call resetDoc on docs that are no longer opened', async () => {
  const { store, extensionRegistry } = await setup({
    signal,
  });
  const wsPath1 = 'my-ws:test-dir/magic.md';
  const { wsName } = resolvePath(wsPath1);
  await setupMockWorkspaceWithNotes(store, wsName, [[wsPath1, `# hello mars`]]);

  let result;
  act(() => {
    result = render(
      <TestStoreProvider
        editorManagerContextProvider
        bangleStore={store}
        bangleStoreChanged={0}
      >
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
  });

  await act(() => {
    return sleep(0);
  });

  const collabManager = getCollabManager()(store.state)!;

  const resetDocSpy = jest.spyOn(collabManager, 'resetDoc');

  expect(getOpenedWsPaths()(store.state).getWsPaths()).toEqual([wsPath1]);

  expect(resetDocSpy).not.toHaveBeenCalled();

  workspaceSliceKey.callOp(
    store.state,
    store.dispatch,
    updateOpenedWsPaths((openedWsPath) => {
      return openedWsPath.closeAll();
    }),
  );

  await sleep(0);

  expect(resetDocSpy).toBeCalledTimes(1);
  expect(resetDocSpy).nthCalledWith(1, wsPath1);
});
