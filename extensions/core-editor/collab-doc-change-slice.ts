import * as Comlink from 'comlink';

import { collabClient } from '@bangle.dev/collab-client';

import { Slice, SliceKey } from '@bangle.io/create-store';
import { forEachEditor } from '@bangle.io/slice-editor-manager';
import {
  assertNonWorkerGlobalScope,
  getEditorPluginMetadata,
} from '@bangle.io/utils';
import { naukarProxy } from '@bangle.io/worker-naukar-proxy';

const sliceKey = new SliceKey(
  'slice::@bangle.io/core-editor:collab-doc-change-slice-key',
);

export function collabDocChangeSlice() {
  return new Slice({
    key: sliceKey,
    sideEffect() {
      // TODO streamline slices that can be executed in worker
      assertNonWorkerGlobalScope();

      return {
        deferredOnce(store) {
          const cb = Comlink.proxy(
            ({
              wsPath,
              serverVersion,
            }: {
              wsPath: string;
              serverVersion: number;
            }) => {
              forEachEditor((editor) => {
                // Only apply the update for matching editor
                if (
                  editor &&
                  getEditorPluginMetadata(editor.view.state).wsPath === wsPath
                ) {
                  collabClient.commands.onUpstreamChanges(serverVersion)(
                    editor.view.state,
                    editor.view.dispatch,
                  );
                }
              })(store.state);
            },
          );
          naukarProxy.registerDocChange(cb);
        },
      };
    },
  });
}
