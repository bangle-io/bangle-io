import { Extension } from 'extension-helpers/index';
import { getPlugins } from './plugins';
import { rawSpecs } from './spec-sheet';
import { MenuComp } from './FloatingMenu';
import { EditorCore } from './EditorCore';
const extensionName = 'editor-core';

const extension = Extension.create({
  name: extensionName,
  editorSpecs: rawSpecs,
  highPriorityEditorPlugins: [],
  editorPlugins: [getPlugins()],
  EditorReactComponent: MenuComp,

  ApplicationReactComponent: EditorCore,
  actions: [
    {
      name: '@action/editor-core/focus-primary-editor',
      title: 'Editor: Focus on primary editor',
    },
    {
      name: '@action/editor-core/collapse-heading',
      title: 'Editor: Collapse heading',
    },
    {
      name: '@action/editor-core/uncollapse-all-heading',
      title: 'Editor: Uncollapse all headings',
    },
    {
      name: '@action/editor-core/move-list-up',
      title: 'Editor: Move list up',
    },
    {
      name: '@action/editor-core/move-list-down',
      title: 'Editor: Move list down',
    },
  ],
});

export default extension;
