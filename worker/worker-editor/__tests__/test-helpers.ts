import { collabClient } from '@bangle.dev/collab-client';

import { Extension } from '@bangle.io/extension-registry';
import type { EditorPluginMetadata } from '@bangle.io/shared-types';
import {
  editorSyncSlice,
  getCollabMessageBus,
} from '@bangle.io/slice-editor-collab-comms';
import { getEditor } from '@bangle.io/slice-editor-manager';
import { workspaceOpenedDocInfoSlice } from '@bangle.io/slice-workspace-opened-doc-info';
import { createBasicTestStore } from '@bangle.io/test-utils';

import { staleDocEffect, workerEditorSlice } from '../worker-editor-slice';

export const setup = async ({
  disableStaleDocEffect,
}: {
  disableStaleDocEffect?: boolean;
}) => {
  const _workerEditorSlice = workerEditorSlice();

  if (disableStaleDocEffect) {
    const spec = _workerEditorSlice.spec;

    spec.sideEffect = Array.isArray(spec.sideEffect)
      ? spec.sideEffect.filter((sideEffect) => {
          return sideEffect !== staleDocEffect;
        })
      : [];
  }

  const { store, isEditorCollabReady, extensionRegistry, ...testHelpers } =
    createBasicTestStore({
      useEditorManagerSlice: true,
      useEditorCoreExtension: true,
      useUISlice: true,
      slices: [
        editorSyncSlice(),
        workspaceOpenedDocInfoSlice(),
        _workerEditorSlice,
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

  const typeText = async (editorId: number, text: string, pos?: number) => {
    const editor = getEditor(editorId)(store.state)!;

    // wait for collab to initialize
    await isEditorCollabReady(editorId);
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
