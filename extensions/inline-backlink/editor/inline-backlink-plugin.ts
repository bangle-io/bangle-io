import { NodeView } from '@bangle.dev/core';

import { backLinkNodeName } from '../config';

export function inlineBackLinkPlugin() {
  return () => [
    NodeView.createPlugin({
      name: backLinkNodeName,
      // inline-block allows the span to get full height of image
      // or else folks depending on the boundingBox get incorrect
      // dimensions.
      containerDOM: ['span', { style: 'display: inline-block;' }],
    }),
  ];
}
