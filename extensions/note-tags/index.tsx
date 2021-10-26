import { Extension } from '@bangle.io/extension-registry';

import { extensionName } from './config';
import {
  editorTagHighPriorityPlugins,
  editorTagPlugins,
  editorTagSpec,
  noteTagsMarkdownItPlugin,
  renderReactNodeView,
} from './editor-tag';
import { TagPickerInlinePalette } from './TagPickerInlinePalette';

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
