import type { Schema } from 'prosemirror-model';
import type { BangleEditorStateProps } from '@bangle.dev/core';
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
