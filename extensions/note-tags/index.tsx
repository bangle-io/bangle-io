import { Extension } from 'extension-registry';
import { extensionName } from './config';
import { TagPickerInlinePalette } from './TagPickerInlinePalette';
import {
  editorTagSpec,
  editorTagPlugins,
  noteTagsMarkdownItPlugin,
  editorTagHighPriorityPlugins,
  renderReactNodeView,
} from './editor-tag';

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
