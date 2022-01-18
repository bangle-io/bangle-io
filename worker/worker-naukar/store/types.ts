import { ExtensionRegistry } from '@bangle.io/extension-registry';

export interface NaukarStoreOpts {
  port: MessagePort;
  extensionRegistry: ExtensionRegistry;
}
