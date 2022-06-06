import { NodeView } from '@bangle.dev/core';
import type { EditorState } from '@bangle.dev/pm';

export function imageNodeViewPlugin() {
  return ({ schema }: { schema: EditorState['schema'] }) => [
    NodeView.createPlugin({
      name: 'image',
      containerDOM: ['span', { style: 'display: inline-block;' }],
    }),
  ];
}
