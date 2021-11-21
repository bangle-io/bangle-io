import { PluginKey } from '@bangle.dev/pm';

import type { EditorPluginMetadata } from '@bangle.io/shared-types';

export const EditorPluginMetadataKey = new PluginKey<EditorPluginMetadata>(
  'EditorPluginMetadataKey',
);

export enum EditorDisplayType {
  // Full editor experience
  Page = 'PAGE',
  // Popup editors are floating around an element
  Popup = 'POPUP',
}
