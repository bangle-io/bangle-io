import { collabClient } from '@bangle.dev/collab-client';
import { uuid } from '@bangle.dev/utils';

import type { EditorPluginMetadata } from '@bangle.io/shared-types';

import { coreEditorSliceKey } from './core-editor-slice';

export function collabPlugin({ metadata }: { metadata: EditorPluginMetadata }) {
  return collabClient.plugins({
    docName: metadata.wsPath,
    clientID: 'client-' + metadata.editorId + '-' + uuid(4),
    collabMessageBus: coreEditorSliceKey.getSliceStateAsserted(
      metadata.bangleStore.state,
    ).collabMessageBus,
    cooldownTime: 150,
    requestTimeout: 1000,
  });
}
