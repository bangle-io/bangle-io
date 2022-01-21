import { ApplicationStore } from '@bangle.io/create-store';
import type { ExtensionRegistry } from '@bangle.io/extension-registry';

export interface BangleStateConfig {
  readonly extensionRegistry: ExtensionRegistry;
  readonly saveState: (store: ApplicationStore) => void;
  readonly useWebWorker: boolean;
}

export interface NaukarStateConfig {
  readonly extensionRegistry: ExtensionRegistry;
  readonly port: MessagePort;
}
