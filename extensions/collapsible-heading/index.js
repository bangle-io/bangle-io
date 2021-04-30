import { collapsibleHeadingDeco } from './collapsible-heading-deco';
import { Extension } from 'extension-helpers';

const extensionName = 'collapsible-heading';

const extension = Extension.create({
  name: extensionName,
  editorPlugins: [collapsibleHeadingDeco.plugins()],
});

export default extension;
