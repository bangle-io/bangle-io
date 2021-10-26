import { Extension } from '@bangle.io/extension-registry';

import { pluginsFactory } from './collapsible-heading-deco';

const extensionName = '@bangle.io/collapsible-heading';

const extension = Extension.create({
  name: extensionName,
  editor: {
    plugins: [pluginsFactory()],
  },
});

export default extension;
