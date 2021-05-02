import { NodeView } from '@bangle.dev/core/node-view';
import { backLinkNodeName } from './config';

export const plugins = pluginsFactory;

function pluginsFactory() {
  return ({ schema }) => [
    NodeView.createPlugin({
      name: backLinkNodeName,
      // inline-block allows the span to get full height of image
      // or else folks depending on the boundingBox get incorrect
      // dimensions.
      containerDOM: [
        'span',
        { style: 'display: inline-block;', class: 'inline-backlink' },
      ],
    }),
  ];
}
