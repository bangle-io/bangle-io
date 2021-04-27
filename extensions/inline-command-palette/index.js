import { inlinePalette } from 'inline-palette/index';
import { inlinePaletteKey } from './plugin-key';
import { InlineCommandPalette } from './inline-command-palette';

const getScrollContainer = (view) => {
  return view.dom.parentElement;
};

const extension = {
  name: 'inline-command-palette',
  editorReactComponents: [InlineCommandPalette],
  bangleSpecs: [
    inlinePalette.spec({ markName: 'inlineCommandPalette', trigger: '/' }),
  ],
  banglePlugin: () => [
    inlinePalette.plugins({
      key: inlinePaletteKey,
      markName: 'inlineCommandPalette',
      tooltipRenderOpts: {
        getScrollContainer,
      },
    }),
  ],
};

export default extension;
