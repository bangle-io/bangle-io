import { collabClient } from '@bangle.dev/collab-client';

import { Extension } from '@bangle.io/extension-registry';
import type { EditorPluginMetadata } from '@bangle.io/shared-types';
import { getEditor } from '@bangle.io/slice-editor-manager';
import {
  editorSyncSlice,
  getCollabMessageBus,
} from '@bangle.io/slice-editor-sync';
import { workspaceOpenedDocInfoSlice } from '@bangle.io/slice-workspace-opened-doc-info';
import { createBasicTestStore } from '@bangle.io/test-utils';

import { workerEditorSlice } from '../worker-editor-slice';
import { writeNoteToDiskSlice } from '../write-note-to-disk-slice';

export const setup = async ({}) => {
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
