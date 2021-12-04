import { NodeView } from '@bangle.dev/core';

import { backlinkNodeName } from '../config';

export function inlineBacklinkPlugin() {
  return () => [
    NodeView.createPlugin({
      name: backlinkNodeName,
      // inline-block allows the span to get full height of image
      // or else folks depending on the boundingBox get incorrect
      // dimensions.
      containerDOM: ['span', { style: 'display: inline-block;' }],
    }),
  ];
}
