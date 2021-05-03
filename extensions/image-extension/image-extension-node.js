import { NodeView } from '@bangle.dev/core/node-view';

export function nodeViewPlugin() {
  return ({ schema }) => [
    NodeView.createPlugin({
      name: 'image',
      // TODO do we need this to be inline
      containerDOM: ['span', { style: 'display: inline-block;' }],
    }),
  ];
}
