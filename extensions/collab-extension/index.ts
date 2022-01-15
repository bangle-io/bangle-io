import { collabClient } from '@bangle.dev/collab-client';
import { parseCollabResponse } from '@bangle.dev/collab-server';
import { CollabRequestType } from '@bangle.dev/collab-server/dist/types';
import { uuid } from '@bangle.dev/utils';

import { Extension } from '@bangle.io/extension-registry';
import type { EditorPluginMetadata } from '@bangle.io/shared-types';
import { naukarWorkerProxy } from '@bangle.io/worker-naukar-proxy';

const extensionName = '@bangle.io/collab-extension';

const extension = Extension.create({
  name: extensionName,
  editor: {
    plugins: [collabPlugin],
  },
});

function collabPlugin({ metadata }: { metadata: EditorPluginMetadata }) {
  // TODO fix types of collab plugin
  const sendRequest = (type: CollabRequestType, payload): any =>
    naukarWorkerProxy.handleCollabRequest(type, payload).then((obj) => {
      return parseCollabResponse(obj);
    });

  return collabClient.plugins({
    docName: metadata.wsPath,
    clientID: 'client-' + uuid(4),
    async getDocument({ docName, userId }) {
      return sendRequest('get_document', {
        docName,
        userId,
      });
    },

    async pullEvents({ version, docName, userId, managerId }) {
      return sendRequest('pull_events', {
        docName,
        version,
        userId,
        managerId,
      });
    },

    async pushEvents({ version, steps, clientID, docName, userId, managerId }) {
      return sendRequest('push_events', {
        clientID,
        version,
        steps,
        docName,
        userId,
        managerId,
      });
    },
    onFatalError(error) {
      if (error.errorCode >= 500) {
        console.log('received fatal error');
        // TODO show a user notification
        console.error(error);
      }
      return true;
    },
  });
}

export default extension;
