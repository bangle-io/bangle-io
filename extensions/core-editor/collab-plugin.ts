import { collabClient } from '@bangle.dev/collab-client';
import { Plugin, PluginKey } from '@bangle.dev/pm';
import { uuid } from '@bangle.dev/utils';

import { notification } from '@bangle.io/api';
import { Severity } from '@bangle.io/constants';
import type { EditorPluginMetadata } from '@bangle.io/shared-types';
import { getCollabMessageBus } from '@bangle.io/slice-editor-collab-comms';
import { getEditorPluginMetadata } from '@bangle.io/utils';

export function collabPlugin({ metadata }: { metadata: EditorPluginMetadata }) {
  return [
    collabClient.plugins({
      docName: metadata.wsPath,
      clientID: 'client-' + metadata.editorId + '-' + uuid(4),
      collabMessageBus: getCollabMessageBus()(metadata.bangleStore.state),
      cooldownTime: 550,
      requestTimeout: 1000,
      warmupTime: 20,
    }),

    new Plugin({
      key: new PluginKey('collab state'),

      view() {
        return {
          update: (view) => {
            const error = collabClient.commands.queryFatalError()(view.state);

            if (error) {
              const { bangleStore, wsPath } = getEditorPluginMetadata(
                view.state,
              );
              console.warn(error);

              if (!notification.getEditorIssue(wsPath)(bangleStore.state)) {
                notification.setEditorIssue({
                  wsPath,
                  title: 'Editor crashed!',
                  description: `Please manually save your work and then try reloading the application. Error - ${error.message}`,
                  severity: Severity.ERROR,
                })(bangleStore.state, bangleStore.dispatch);
              }
            }
          },
        };
      },
    }),
  ];
}
