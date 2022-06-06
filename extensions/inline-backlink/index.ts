import type { EditorView } from '@bangle.dev/pm';
import { wikiLink, wikiLinkMarkdownItPlugin } from '@bangle.dev/wiki-link';

import { Extension } from '@bangle.io/extension-registry';
import { inlinePalette } from '@bangle.io/inline-palette';

import { BacklinkWidget } from './BacklinkWidget';
import { extensionName, paletteMark, palettePluginKey } from './config';
import { renderReactNodeView } from './editor/BacklinkNode';
import { inlineBacklinkPlugin } from './editor/inline-backlink-plugin';
import { InlineBacklinkPalette } from './editor/InlineBacklinkPalette';

const getScrollContainer = (view: EditorView) => {
  return view.dom.parentElement!;
};

// TODO there is a bug in firefox https://github.com/ProseMirror/prosemirror/issues/1220
// to avoid that make we can set selectable = true, but then that slows down clicking
// of wiki links
const wikiSpec = wikiLink.spec();

const extension = Extension.create({
  name: extensionName,
  editor: {
    specs: [
      wikiSpec,
      inlinePalette.spec({
        markName: paletteMark,
        trigger: '[[',
      }),
    ],
    highPriorityPlugins: [
      inlinePalette.plugins({
        key: palettePluginKey,
        markName: paletteMark,
        tooltipRenderOpts: {
          getScrollContainer,
        },
      }),
    ],
    plugins: [inlineBacklinkPlugin()],
    markdownItPlugins: [wikiLinkMarkdownItPlugin],
    ReactComponent: InlineBacklinkPalette,
    renderReactNodeView: renderReactNodeView,
  },
  application: {
    noteSidebarWidgets: [
      {
        name: 'note-sidebar-widget::@bangle.io/inline-backlink',
        ReactComponent: BacklinkWidget,
        title: 'Backlink references',
      },
    ],
  },
});

export default extension;
