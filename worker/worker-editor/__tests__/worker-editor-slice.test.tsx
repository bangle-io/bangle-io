/**
 * @jest-environment jsdom
 */
import { act, render } from '@testing-library/react';
import React from 'react';

import { collabClient } from '@bangle.dev/collab-client';
import { CollabManager } from '@bangle.dev/collab-manager';

import { workspace } from '@bangle.io/api';
import {
  PRIMARY_EDITOR_INDEX,
  SECONDARY_EDITOR_INDEX,
} from '@bangle.io/constants';
import { Editor } from '@bangle.io/editor';
import { Extension } from '@bangle.io/extension-registry';
import type { EditorPluginMetadata } from '@bangle.io/shared-types';
import { getEditor } from '@bangle.io/slice-editor-manager';
import {
  editorSyncSlice,
  getCollabMessageBus,
} from '@bangle.io/slice-editor-sync';
import { workspaceOpenedDocInfoSlice } from '@bangle.io/slice-workspace-opened-doc-info';
import {
  createBasicTestStore,
  setupMockMessageChannel,
  setupMockWorkspaceWithNotes,
  TestStoreProvider,
} from '@bangle.io/test-utils';
import { sleep } from '@bangle.io/utils';
import { resolvePath } from '@bangle.io/ws-path';

import { getCollabManager } from '../operations';
import { workerEditorSlice } from '../worker-editor-slice';
import { writeNoteToDiskSlice } from '../write-note-to-disk-slice';

let cleanup = () => {};
beforeEach(() => {
  cleanup = setupMockMessageChannel();
});

afterEach(() => {
  cleanup();
});

const setup = async ({}) => {
  const slice = workerEditorSlice();
  const { store, extensionRegistry, ...testHelpers } = createBasicTestStore({
    useEditorManagerSlice: true,
    useEditorCoreExtension: true,
    slices: [
      editorSyncSlice(),
      workspaceOpenedDocInfoSlice(),
      writeNoteToDiskSlice(),
      slice,
    ],
    extensions: [
      Extension.create({
        name: 'bangle-io-collab-client',
        editor: {
          plugins: [
            function collabPlugin({
              metadata,
            }: {
              metadata: EditorPluginMetadata;
            }) {
              return collabClient.plugins({
                docName: metadata.wsPath,
                clientID: 'client-' + metadata.editorId,
                collabMessageBus: getCollabMessageBus()(
                  metadata.bangleStore.state,
                ),
                cooldownTime: 0,
              });
            },
          ],
        },
      }),
    ],
  });

  const typeText = (editorId: number, text: string, pos?: number) => {
    const editor = getEditor(editorId)(store.state)!;

    const editorState = editor.view.state;

    const tr = editorState.tr.insertText(
      text,
      pos == null ? editorState.selection.head : pos,
    );
    editor.view.dispatch(tr);
  };

  return {
    typeText,
    store,
    extensionRegistry,
    ...testHelpers,
  };
};

test('should enable syncing of editors and writing to disk', async () => {
  const { store, extensionRegistry, typeText } = await setup({});
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
