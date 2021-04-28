import React from 'react';
import { inlinePalette } from 'inline-palette/index';
import { Link } from 'react-router-dom';

import { InlineBacklinkPalette } from './InlineBacklinkPalette';
import * as inlineBacklink from './inline-backlink-node';
import { resolvePath } from 'workspace';
import {
  backLinkNodeName,
  extensionName,
  paletteMark,
  palettePluginKey,
} from './config';
//
const getScrollContainer = (view) => {
  return view.dom.parentElement;
};

const extension = {
  name: extensionName,
  editorSpecs: [
    inlineBacklink.spec(),
    inlinePalette.spec({
      markName: paletteMark,
      trigger: '[[',
    }),
  ],
  editorPlugins: [
    inlineBacklink.plugins(),
    inlinePalette.plugins({
      key: palettePluginKey,
      markName: paletteMark,
      tooltipRenderOpts: {
        getScrollContainer,
      },
    }),
  ],
  markdownItPlugins: [],
  editorReactComponent: InlineBacklinkPalette,
  renderReactNodeView: {
    [backLinkNodeName]: (nodeViewRenderArg) => {
      return (
        <Link
          to={resolvePath(nodeViewRenderArg.node.attrs.wsPath).locationPath}
        >
          [[{nodeViewRenderArg.node.attrs.title}]]
        </Link>
      );
    },
  },
};

export default extension;
