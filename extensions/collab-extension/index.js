import { Extension } from 'extension-helpers';
import { collabClient } from '@bangle.dev/collab-client';
import { naukarWorkerProxy } from 'naukar-proxy/index';
import { parseCollabResponse } from '@bangle.dev/collab-server';
import { uuid } from '@bangle.dev/core/utils/js-utils';

const extensionName = 'collab-extension';

const extension = Extension.create({
  name: extensionName,
  editorPlugins: [collabPlugin],
});

function collabPlugin({ metadata: { wsPath } = {} }) {
  const sendRequest = (type, payload) =>
    naukarWorkerProxy.handleCollabRequest(type, payload).then((obj) => {
      return parseCollabResponse(obj);
    });

  return collabClient.plugins({
    docName: wsPath,
    clientId: 'client-' + uuid(4),
    async getDocument({ docName, userId }) {
      return sendRequest('get_document', {
        docName,
        userId,
      });
    },

    async pullEvents({ version, docName, userId }) {
      return sendRequest('pull_events', {
        docName,
        version,
        userId,
      });
    },

    async pushEvents({ version, steps, clientID, docName, userId }) {
      return sendRequest('push_events', {
        clientID,
        version,
        steps,
        docName,
        userId,
      });
    },
  });
}

export default extension;
