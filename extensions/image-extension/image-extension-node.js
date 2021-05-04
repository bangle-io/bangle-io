import { NodeView } from '@bangle.dev/core/node-view';

export function nodeViewPlugin() {
  return ({ schema }) => [
    NodeView.createPlugin({
      name: 'image',
      containerDOM: ['span', { style: 'display: inline-block;' }],
    }),
  ];
}
