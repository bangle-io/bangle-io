import { defaultSpecs } from '@bangle.dev/all-base-components';
import { Extension, ExtensionRegistry } from 'extension-registry';
import { markdownParser } from 'markdown';

const extensionRegistry = new ExtensionRegistry([
  Extension.create({
    name: 'core',
    application: {},
    editor: {
      specs: [...defaultSpecs()],
    },
  }),
]);

export function createPMNode(mdText) {
  const doc = markdownParser(
    mdText,
    extensionRegistry.specRegistry,
    extensionRegistry.markdownItPlugins,
  );

  return doc;
}
