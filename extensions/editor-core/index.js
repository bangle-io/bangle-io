import { Extension } from 'extension-helpers/index';
import { getPlugins } from './plugins';
import { rawSpecs } from './spec-sheet';
import { MenuComp } from './FloatingMenu';

const extensionName = 'editor-core';

const extension = Extension.create({
  name: extensionName,
  editorSpecs: rawSpecs,
  highPriorityEditorPlugins: [],
  editorPlugins: [getPlugins()],
  EditorReactComponent: MenuComp,
});

export default extension;
