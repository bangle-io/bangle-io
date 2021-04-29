import React from 'react';
import { Link } from 'react-router-dom';
import { resolvePath } from 'workspace';
import { backLinkNodeName } from './config';

export const renderReactNodeView = {
  [backLinkNodeName]: (nodeViewRenderArg) => {
    return (
      <Link to={resolvePath(nodeViewRenderArg.node.attrs.wsPath).locationPath}>
        [[{nodeViewRenderArg.node.attrs.title}]]
      </Link>
    );
  },
};
