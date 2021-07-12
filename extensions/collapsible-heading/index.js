import { collapsibleHeadingDeco } from './collapsible-heading-deco';
import { Extension } from 'extension-registry';

const extensionName = 'collapsible-heading';

const extension = Extension.create({
  name: extensionName,
  editor: {
    plugins: [collapsibleHeadingDeco.plugins()],
  },
});

export default extension;
