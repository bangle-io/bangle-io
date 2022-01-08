import { SliceKey } from '@bangle.io/create-store';
import { assertActionType } from '@bangle.io/utils';

import { ExtensionRegistry } from './ExtensionRegistry';

export const extensionRegistrySliceKey = new SliceKey<
  ExtensionRegistryState,
  ExtensionRegistryAction
>('editor-manager-slice');

export interface ExtensionRegistryState {
  extensionRegistry: ExtensionRegistry;
}

assertActionType('extension-registry', {} as ExtensionRegistryAction);

export type ExtensionRegistryAction = {
  name: 'action::extension-registry:dummy';
};
