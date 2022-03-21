import { PluginKey } from '@bangle.dev/pm';

import type { IntersectionObserverPluginState } from '@bangle.io/pm-plugins';
import type { EditorPluginMetadata } from '@bangle.io/shared-types';

export const MAX_OPEN_EDITORS = 2;

export const EditorPluginMetadataKey = new PluginKey<EditorPluginMetadata>(
  'EditorPluginMetadataKey',
);
export const intersectionObserverPluginKey =
  new PluginKey<IntersectionObserverPluginState>(
    'core-editor_intersectionObserverPlugin',
  );

export enum EditorDisplayType {
  // Full editor experience
  Page = 'PAGE',
  // Popup editors are floating around an element
  Popup = 'POPUP',
}
