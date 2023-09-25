import { collabClient } from '@bangle.dev/collab-client';
import { Plugin, PluginKey } from '@bangle.dev/pm';
import { uuid } from '@bangle.dev/utils';

import { SEVERITY } from '@bangle.io/constants';
import { getEditorPluginMetadata } from '@bangle.io/editor-common';
import type { EditorPluginMetadata } from '@bangle.io/shared-types';
import { nsmNotification } from '@bangle.io/slice-notification';
import { generateUid } from '@bangle.io/utils';

export function collabPlugin({ metadata }: { metadata: EditorPluginMetadata }) {
  return [
    collabClient.plugins({
      docName: metadata.wsPath,
      clientID: 'client-' + metadata.editorId + '-' + uuid(4),
      collabMessageBus: metadata.collabMessageBus,
      cooldownTime: 550,
      requestTimeout: 1000,
      warmupTime: 20,
    }),

    new Plugin({
      key: new PluginKey('collab state'),

      view() {
        let clearTimeoutId: ReturnType<typeof setTimeout> | null = null;

        return {
          destroy() {
            if (clearTimeoutId != null) {
              clearTimeout(clearTimeoutId);
            }
          },
          update: (view) => {
            const error = collabClient.commands.queryFatalError()(view.state);

            if (error) {
              const { wsPath, nsmStore } = getEditorPluginMetadata(view.state);
              console.warn(error);

              if (!nsmNotification.getEditorIssue(nsmStore.state, wsPath)) {
                // TODO: this exists because at times when editor is unmounted
                //       there is an error thrown. So this waits until to avoid
                ///      setting error if the editor is unmounted.
                clearTimeoutId = setTimeout(() => {
                  if (!view.isDestroyed) {
                    nsmStore.dispatch(
                      nsmNotification.setEditorIssue({
                        wsPath,
                        title: 'Editor crashed!',
                        description: `Please manually save your work and then try reloading the application. Error - ${error.message}`,
                        severity: SEVERITY.ERROR,
                        uid: generateUid(),
                      }),
                    );
                  }
                }, 300);
              }
            }
          },
        };
      },
    }),
  ];
}
