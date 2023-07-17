import { CollabMessageBus } from '@bangle.dev/collab-comms';

import { STORAGE_ON_CHANGE_EMITTER_KEY } from '@bangle.io/constants';
import { wireCollabMessageBus } from '@bangle.io/editor-common';
import type { Extension } from '@bangle.io/extension-registry';
import { ExtensionRegistry } from '@bangle.io/extension-registry';
import type { StorageProviderChangeType } from '@bangle.io/shared-types';
import { Emitter } from '@bangle.io/utils';
import { registerStorageProvider } from '@bangle.io/workspace-info';

export function testEternalVars({ extensions }: { extensions: Extension[] }) {
  const extensionRegistry = new ExtensionRegistry([...extensions]);

  const emitter = new Emitter<StorageProviderChangeType>();
  for (const storageProvider of extensionRegistry.getAllStorageProviders()) {
    storageProvider.onChange = (data) => {
      emitter.emit(STORAGE_ON_CHANGE_EMITTER_KEY, data);
    };

    registerStorageProvider(storageProvider, extensionRegistry.specRegistry);
  }

  const editorCollabMessageBus = new CollabMessageBus({});

  return {
    extensionRegistry,
    storageEmitter: emitter,
    editorCollabMessageBus,
  };
}
