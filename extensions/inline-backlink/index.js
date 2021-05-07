import './style.css';
import { inlinePalette } from 'inline-palette/index';
import { Extension } from 'extension-helpers';
import { InlineBacklinkPalette } from './InlineBacklinkPalette';
import { inlineBackLinkPlugin } from './inline-backlink-plugin';
import { extensionName, paletteMark, palettePluginKey } from './config';
import { renderReactNodeView } from './BackLinkNode';
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
  editorPlugins: [inlineBackLinkPlugin()],
  markdownItPlugins: [wikiLinkMarkdownItPlugin],
  editorReactComponent: InlineBacklinkPalette,
  renderReactNodeView: renderReactNodeView,
});

export default extension;
