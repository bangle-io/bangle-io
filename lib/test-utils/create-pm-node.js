import { defaultSpecs } from '@bangle.dev/all-base-components';

import { Extension, ExtensionRegistry } from '@bangle.io/extension-registry';
import { markdownParser } from '@bangle.io/markdown';

if (typeof jest === 'undefined') {
  throw new Error('Can only be with jest');
}

export function createPMNode(extensions = []) {
  const extensionRegistry = new ExtensionRegistry([
    Extension.create({
      name: '@bangle.io/core',
      application: {},
      editor: {
        specs: [...defaultSpecs()],
      },
    }),
    ...extensions,
  ]);

  return (mdText) => {
    const doc = markdownParser(
      mdText,
      extensionRegistry.specRegistry,
      extensionRegistry.markdownItPlugins,
    );

    return doc;
  };
}
