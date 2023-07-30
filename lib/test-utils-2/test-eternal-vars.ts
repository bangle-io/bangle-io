import { CollabMessageBus } from '@bangle.dev/collab-comms';

import {
  getPlugins,
  markdownItPlugins,
  rawSpecs,
} from '@bangle.io/editor-common';
import type { Extension } from '@bangle.io/extension-registry';
import { ExtensionRegistry } from '@bangle.io/extension-registry';
import type { StorageProviderChangeType } from '@bangle.io/shared-types';
import { Emitter } from '@bangle.io/utils';

export function testEternalVars({
  coreEditor = true,
  extensions,
}: {
  coreEditor?: boolean;
  extensions: Extension[];
}) {
  const finalExtensions = [...extensions];

  const extensionRegistry = new ExtensionRegistry(finalExtensions);

  const emitter = new Emitter<StorageProviderChangeType>();

  const editorCollabMessageBus = new CollabMessageBus({});

  return {
    extensionRegistry,
    storageEmitter: emitter,
    editorCollabMessageBus,
  };
}
