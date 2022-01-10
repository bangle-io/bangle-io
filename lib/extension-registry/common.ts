import { SliceKey } from '@bangle.io/create-store';
import { assertActionType } from '@bangle.io/utils';

import { ExtensionRegistry } from './ExtensionRegistry';

export const extensionRegistrySliceKey = new SliceKey<
  ExtensionRegistryState,
  ExtensionRegistryAction
>('extension-registry-slice');

export interface ExtensionRegistryState {
  extensionRegistry: ExtensionRegistry;
}

assertActionType(
  '@bangle.io/extension-registry',
  {} as ExtensionRegistryAction,
);

export type ExtensionRegistryAction = {
  name: 'action::@bangle.io/extension-registry:dummy';
};
