import './style.css';
import { inlinePalette } from 'inline-palette/index';
import { InlineCommandPalette } from './InlineCommandPalette';
import { extensionName, paletteMarkName, palettePluginKey } from './config';
import { Extension } from 'extension-helpers';

const getScrollContainer = (view) => {
  return view.dom.parentElement;
};

const extension = Extension.create({
  name: extensionName,
  editorReactComponent: InlineCommandPalette,
  editorSpecs: [
    inlinePalette.spec({ markName: paletteMarkName, trigger: '/' }),
  ],
  highPriorityEditorPlugins: [
    inlinePalette.plugins({
      key: palettePluginKey,
      markName: paletteMarkName,
      tooltipRenderOpts: {
        getScrollContainer,
      },
    }),
  ],
});

export default extension;
