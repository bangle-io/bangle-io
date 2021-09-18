import { defaultSpecs } from '@bangle.dev/all-base-components';
import { Extension, ExtensionRegistry } from 'extension-registry';
import { markdownParser } from 'markdown';

export function createPMNode(extensions = []) {
  const extensionRegistry = new ExtensionRegistry([
    Extension.create({
      name: 'core',
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
