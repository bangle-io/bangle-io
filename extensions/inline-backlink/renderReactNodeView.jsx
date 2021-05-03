import React from 'react';
import { Link } from 'react-router-dom';
import {
  filePathToWsPath,
  useWorkspacePath,
  resolvePath,
} from 'workspace/index';
import { backLinkNodeName } from './config';

export const renderReactNodeView = {
  [backLinkNodeName]: (nodeViewRenderArg) => {
    return <BackLinkNode nodeAttrs={nodeViewRenderArg.node.attrs} />;
  },
};

function BackLinkNode({ nodeAttrs }) {
  let { path, title } = nodeAttrs;
  const { wsName } = useWorkspacePath();
  let to;
  title = title || path;
  try {
    if (!path.endsWith('.md')) {
      path += '.md';
    }

    const wsPath = filePathToWsPath(wsName, path);

    to = resolvePath(wsPath).locationPath;
  } catch (error) {
    // TODO show a modal
    console.error(
      `Unable to parse path-${path} title-${title} wsName-${wsName}`,
    );
    console.error(error);
    to = '';
    title = 'Error parsing link';
  }

  return (
    <Link
      // prevent the a-href from being dragged, which messes up our system
      // we want the node view to be dragged to the dom serializers can kick in
      draggable={false}
      to={to}
    >
      [[{title}]]
    </Link>
  );
}
