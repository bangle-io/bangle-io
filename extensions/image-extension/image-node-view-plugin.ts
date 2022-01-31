import { NodeView } from '@bangle.dev/core';
import { EditorState } from '@bangle.dev/pm';

export function imageNodeViewPlugin() {
  return ({ schema }: { schema: EditorState['schema'] }) => [
    NodeView.createPlugin({
      name: 'image',
      containerDOM: ['span', { style: 'display: inline-block;' }],
    }),
  ];
}
