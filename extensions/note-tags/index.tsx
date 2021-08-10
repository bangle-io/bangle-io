import { Extension } from 'extension-registry';
import { inlinePalette } from 'inline-palette';
import { extensionName, paletteMarkName } from './config';
import { TagPickerInlinePalette } from './TagPickerInlinePalette';
import {
  editorTagSpec,
  editorTagPlugins,
  noteTagsMarkdownItPlugin,
  editorTagHighPriorityPlugins,
} from './editor-tag';
import { renderReactNodeView } from './render-node-view';

const extension = Extension.create({
  name: extensionName,
  editor: {
    ReactComponent: TagPickerInlinePalette,
    specs: [editorTagSpec()],
    highPriorityPlugins: [editorTagHighPriorityPlugins()],
    plugins: [editorTagPlugins()],
    renderReactNodeView: renderReactNodeView,
    markdownItPlugins: [noteTagsMarkdownItPlugin],
  },
});

export default extension;
