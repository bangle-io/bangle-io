import { inlinePalette } from 'inline-palette/index';
import { inlineCommandPaletteKey } from './plugin-key';
import { InlineCommandPalette } from './inline-command-palette';

const getScrollContainer = (view) => {
  return view.dom.parentElement;
};

const extension = {
  name: 'inline-command-palette',
  editorReactComponent: InlineCommandPalette,
  editorSpecs: [
    inlinePalette.spec({ markName: 'inlineCommandPalette', trigger: '/' }),
  ],
  editorPlugins: inlinePalette.plugins({
    key: inlineCommandPaletteKey,
    markName: 'inlineCommandPalette',
    tooltipRenderOpts: {
      getScrollContainer,
    },
  }),
};

export default extension;
