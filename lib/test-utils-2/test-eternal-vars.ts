import { CollabMessageBus } from '@bangle.dev/collab-comms';

import type { Extension } from '@bangle.io/extension-registry';
import { ExtensionRegistry } from '@bangle.io/extension-registry';
import type { StorageProviderChangeType } from '@bangle.io/shared-types';
import { Emitter } from '@bangle.io/utils';

export function testEternalVars({ extensions }: { extensions: Extension[] }) {
  const extensionRegistry = new ExtensionRegistry(extensions);

  const emitter = new Emitter<StorageProviderChangeType>();

  const editorCollabMessageBus = new CollabMessageBus({});

  return {
    extensionRegistry,
    storageEmitter: emitter,
    editorCollabMessageBus,
  };
}
