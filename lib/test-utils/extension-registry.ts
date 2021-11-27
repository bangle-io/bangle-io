import { defaultPlugins, defaultSpecs } from '@bangle.dev/all-base-components';

import { Extension, ExtensionRegistry } from '@bangle.io/extension-registry';

export function createExtensionRegistry(
  extensions: Extension[] = [],
  { editorCore = false } = {},
) {
  extensions = [...extensions];

  if (editorCore) {
    extensions.push(
      Extension.create({
        name: 'bangle-io-core',
        editor: {
          specs: defaultSpecs(),
          plugins: defaultPlugins(),
        },
      }),
    );
  }

  const extensionRegistry = new ExtensionRegistry(extensions);

  return extensionRegistry;
}
