import type { ExtensionRegistry } from '@bangle.io/extension-registry';
import type { Store } from '@bangle.io/nsm-3';

export interface BaseStateConfig {
  readonly extensionRegistry: ExtensionRegistry;
}

export interface NaukarStateConfig extends BaseStateConfig {
  readonly port: MessagePort;
}

// TODO prefer using API store type
export type NsmStore<N extends string = any> = Store<N>;
export type NsmStoreState = Store['state'];
