import { SliceKey } from '@bangle.io/create-store';

import { ExtensionRegistry } from './ExtensionRegistry';

export const extensionRegistrySliceKey = new SliceKey<
  ExtensionRegistryState,
  ExtensionRegistryAction
>('extension-registry-slice');

export interface ExtensionRegistryState {
  extensionRegistry: ExtensionRegistry;
}

export type ExtensionRegistryAction = {
  name: 'action::@bangle.io/extension-registry:dummy';
};
