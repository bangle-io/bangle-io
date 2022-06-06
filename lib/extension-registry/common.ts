import { SliceKey } from '@bangle.io/create-store';

import type { ExtensionRegistry } from './ExtensionRegistry';

export const extensionRegistrySliceKey = new SliceKey<ExtensionRegistryState>(
  'extension-registry-slice',
);

export interface ExtensionRegistryState {
  extensionRegistry: ExtensionRegistry;
}
