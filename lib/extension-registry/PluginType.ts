import type { BangleEditorStateProps, RawPlugins } from '@bangle.dev/core';
import type { Schema } from '@bangle.dev/pm';

export interface PluginMetadata {
  wsPath: string;
}

export type EditorPluginDefinition = RawPlugins;
