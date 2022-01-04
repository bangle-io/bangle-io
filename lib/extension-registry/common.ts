import { SliceKey } from '@bangle.io/create-store';

import { ExtensionRegistry } from './ExtensionRegistry';

export const extensionRegistrySliceKey = new SliceKey<
  ExtensionRegistryState,
  ExtensionRegistryAction
>('editor-manager-slice');

export interface ExtensionRegistryState {
  extensionRegistry: ExtensionRegistry | undefined;
}

export type ExtensionRegistryAction = {
  name: 'action::extension-registry:';
};
