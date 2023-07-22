import type { CollabMessageBus } from '@bangle.dev/collab-comms';

import type { ExtensionRegistry } from '@bangle.io/extension-registry';
import type { Emitter } from '@bangle.io/utils';

import type { StorageProviderChangeType } from './workspace';

/**
 * Vars that are eternal to the app.
 * These vars should work in both worker and main thread.
 * Should reasonably (message port asymmetry are exempt) identical in both envs.
 */
export type EternalVars = {
  extensionRegistry: ExtensionRegistry;
  storageEmitter: Emitter<StorageProviderChangeType>;
  editorCollabMessageBus: CollabMessageBus;
};
