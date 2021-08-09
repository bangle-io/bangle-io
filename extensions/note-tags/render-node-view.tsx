import { tagNodeName } from './config';
import React from 'react';
import { RenderReactNodeView } from 'extension-registry';

export const renderReactNodeView: RenderReactNodeView = {
  // TODO move to using param wsPath
  [tagNodeName]: ({ nodeViewRenderArg }) => {
    return <TagNode nodeAttrs={nodeViewRenderArg.node.attrs} />;
  },
};

export function TagNode({ nodeAttrs }) {
  return <span className="inline-tag">#{nodeAttrs.tagValue}</span>;
}
