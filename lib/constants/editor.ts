import { PluginKey } from '@bangle.dev/pm';

import type { IntersectionObserverPluginState } from '@bangle.io/pm-plugins';
import type { EditorPluginMetadata } from '@bangle.io/shared-types';

export const MAX_OPEN_EDITORS = 3;

// Warning!: Donot change the indices unless you are really sure of what you are doing.
// This warning exists because a lot of places are directly using the integer values.
export const PRIMARY_EDITOR_INDEX = 0;
// secondary editor is generally the one on the split screen right side
export const SECONDARY_EDITOR_INDEX = 1;
export const MINI_EDITOR_INDEX = 2;

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
