import type { ApplicationStore } from '@bangle.io/create-store';
import type { ExtensionRegistry } from '@bangle.io/extension-registry';
import type { Store } from '@bangle.io/nsm-3';

export interface BaseStateConfig {
  readonly extensionRegistry: ExtensionRegistry;
}

export interface BangleStateConfig extends BaseStateConfig {
  readonly saveState: (store: ApplicationStore) => void;
  readonly useWebWorker: boolean;
}

export interface NaukarStateConfig extends BaseStateConfig {
  readonly port: MessagePort;
}

export type BangleApplicationStore = ApplicationStore;

// TODO prefer using API store type
export type NsmStore<N extends string = any> = Store<N>;
export type NsmStoreState = Store['state'];
