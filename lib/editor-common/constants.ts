import { PluginKey } from '@bangle.dev/pm';

import type { IntersectionObserverPluginState } from '@bangle.io/pm-plugins';
import type { EditorPluginMetadata } from '@bangle.io/shared-types';

export const intersectionObserverPluginKey =
  new PluginKey<IntersectionObserverPluginState>(
    'core-editor_intersectionObserverPlugin',
  );

export const EditorPluginMetadataKey = new PluginKey<EditorPluginMetadata>(
  'EditorPluginMetadataKey',
);
export const menuKey = new PluginKey('menuKey');

export const searchPluginKey = new PluginKey('searchPluginKey');
