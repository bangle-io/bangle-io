import React from 'react';
import { Link } from 'react-router-dom';
import { resolvePath } from 'workspace';
import { backLinkNodeName } from './config';

export const renderReactNodeView = {
  [backLinkNodeName]: (nodeViewRenderArg) => {
    return (
      <Link
        // prevent the a-href from being dragged, which messes up our system
        // we want the node view to be dragged to the dom serializers can kick in
        draggable={false}
        to={resolvePath(nodeViewRenderArg.node.attrs.wsPath).locationPath}
      >
        [[{nodeViewRenderArg.node.attrs.title}]]
      </Link>
    );
  },
};
