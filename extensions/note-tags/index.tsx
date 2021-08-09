import { Extension } from 'extension-registry';
import { inlinePalette } from 'inline-palette';
import { extensionName, paletteMarkName, palettePluginKey } from './config';
import { TagPickerInlinePalette } from './TagPickerInlinePalette';
import {
  editorTagSpec,
  editorTagPlugins,
  noteTagsMarkdownItPlugin,
} from './editor-tag';
import { renderReactNodeView } from './render-node-view';

const getScrollContainer = (view) => {
  return view.dom.parentElement;
};

const trigger = '#';
const extension = Extension.create({
  name: extensionName,
  editor: {
    // ReactComponent: TagPickerInlinePalette,
    specs: [
      // inlinePalette.spec({ markName: paletteMarkName, trigger }),
      editorTagSpec(),
    ],
    highPriorityPlugins: [
      // inlinePalette.plugins({
      //   key: palettePluginKey,
      //   markName: paletteMarkName,
      //   tooltipRenderOpts: {
      //     getScrollContainer,
      //   },
      // }),
    ],
    plugins: [editorTagPlugins()],
    renderReactNodeView: renderReactNodeView,
    markdownItPlugins: [noteTagsMarkdownItPlugin],
  },
});

export default extension;
