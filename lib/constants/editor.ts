import { PluginKey } from '@bangle.dev/pm';

import type { IntersectionObserverPluginState } from '@bangle.io/pm-plugins';
import type { EditorPluginMetadata } from '@bangle.io/shared-types';

export const EditorPluginMetadataKey = new PluginKey<EditorPluginMetadata>(
  'EditorPluginMetadataKey',
);
export const intersectionObserverPluginKey =
  new PluginKey<IntersectionObserverPluginState>(
    'editor-core_intersectionObserverPlugin',
  );

export enum EditorDisplayType {
  // Full editor experience
  Page = 'PAGE',
  // Popup editors are floating around an element
  Popup = 'POPUP',
}
