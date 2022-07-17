import { collabClient } from '@bangle.dev/collab-client';
import { uuid } from '@bangle.dev/utils';

import type { EditorPluginMetadata } from '@bangle.io/shared-types';
import { naukarProxy } from '@bangle.io/worker-naukar-proxy';

export function collabPlugin({ metadata }: { metadata: EditorPluginMetadata }) {
  return collabClient.plugins({
    docName: metadata.wsPath,
    clientID: 'client-' + metadata.editorId + '-' + uuid(4),
    sendManagerRequest: (req) => naukarProxy.handleCollabRequest(req),
  });
}
