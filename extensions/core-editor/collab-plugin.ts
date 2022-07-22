import { collabClient } from '@bangle.dev/collab-client';
import { uuid } from '@bangle.dev/utils';

import type { EditorPluginMetadata } from '@bangle.io/shared-types';
import { getCollabMessageBus } from '@bangle.io/slice-editor-sync';

export function collabPlugin({ metadata }: { metadata: EditorPluginMetadata }) {
  return collabClient.plugins({
    docName: metadata.wsPath,
    clientID: 'client-' + metadata.editorId + '-' + uuid(4),
    collabMessageBus: getCollabMessageBus()(metadata.bangleStore.state),
    cooldownTime: 550,
    requestTimeout: 1000,
    warmupTime: 20,
  });
}
