import { NodeView } from '@bangle.dev/core';

export function imageNodeViewPlugin() {
  return ({ schema }) => [
    NodeView.createPlugin({
      name: 'image',
      containerDOM: ['span', { style: 'display: inline-block;' }],
    }),
  ];
}
