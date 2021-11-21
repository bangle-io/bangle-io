// this is injected into the plugin setup function

import type { EditorDisplayType } from '@bangle.io/constants';

// as pluginMetadata field by bangle.dev
export interface EditorPluginMetadata {
  wsPath: string;
  editorDisplayType: EditorDisplayType;
  editorId?: number;
}
