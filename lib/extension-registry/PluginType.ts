import type { BangleEditorStateProps } from '@bangle.dev/core';
import type { Schema } from '@bangle.dev/pm';
export interface PluginMetadata {
  wsPath: string;
}

export type EditorPluginDefinition =
  | (({
      schema,
      specRegistry,
      metadata,
    }: {
      schema: Schema;
      specRegistry: any;
      metadata: PluginMetadata;
    }) => BangleEditorStateProps['plugins'])
  | BangleEditorStateProps['plugins'];
