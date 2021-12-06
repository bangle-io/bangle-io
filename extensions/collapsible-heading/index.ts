import { Extension } from '@bangle.io/extension-registry';

import { pluginsFactory } from './collapsible-heading-deco';

const extensionName = 'collapsible-heading';

const extension = Extension.create({
  name: extensionName,
  editor: {
    plugins: [pluginsFactory()],
  },
});

export default extension;
