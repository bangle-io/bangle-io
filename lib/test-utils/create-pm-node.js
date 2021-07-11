import { defaultSpecs } from '@bangle.dev/core/dist/test-helpers/default-components';
import { markdownParser, markdownSerializer } from 'markdown/index';
import { Extension, ExtensionRegistry } from 'extension-registry';

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
