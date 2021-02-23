import { NodeView } from '@bangle.dev/core/node-view';

export const todoListNodeView = NodeView.createPlugin({
  name: 'todoItem',
  containerDOM: [
    'li',
    {
      'data-bangle-name': 'todoItem',
    },
  ],
  contentDOM: ['span', {}],
});
