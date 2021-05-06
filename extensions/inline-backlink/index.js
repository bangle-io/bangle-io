import { inlinePalette } from 'inline-palette/index';
import { Extension } from 'extension-helpers';
import { InlineBacklinkPalette } from './InlineBacklinkPalette';
import * as inlineBacklink from './inline-backlink-node';
import { extensionName, paletteMark, palettePluginKey } from './config';
import { renderReactNodeView } from './renderReactNodeView';
import { wikiLink, wikiLinkMarkdownItPlugin } from '@bangle.dev/wiki-link';

const getScrollContainer = (view) => {
  return view.dom.parentElement;
};

const extension = Extension.create({
  name: extensionName,
  editorSpecs: [
    wikiLink.spec(),
    inlinePalette.spec({
      markName: paletteMark,
      trigger: '[[',
    }),
  ],
  highPriorityEditorPlugins: [
    inlinePalette.plugins({
      key: palettePluginKey,
      markName: paletteMark,
      tooltipRenderOpts: {
        getScrollContainer,
      },
    }),
  ],
  editorPlugins: [inlineBacklink.plugins()],
  markdownItPlugins: [wikiLinkMarkdownItPlugin],
  editorReactComponent: InlineBacklinkPalette,
  renderReactNodeView: renderReactNodeView,
});

export default extension;
