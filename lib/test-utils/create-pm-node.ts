import { defaultSpecs } from '@bangle.dev/all-base-components';
import type { Node } from '@bangle.dev/pm';

import { Extension, ExtensionRegistry } from '@bangle.io/extension-registry';
import { markdownParser } from '@bangle.io/markdown';
import { assertNotUndefined } from '@bangle.io/utils';

if (typeof jest === 'undefined') {
  throw new Error('Can only be with jest');
}

export function createPMNode(
  extensions: Extension[] = [],
  mdText: string,
): Node {
  const extensionRegistry = new ExtensionRegistry([
    Extension.create({
      name: 'bangle-io-core',
      application: {},
      editor: {
        specs: [...defaultSpecs()],
      },
    }),
    ...extensions,
  ]);
  const doc = markdownParser(
    mdText,
    extensionRegistry.specRegistry,
    extensionRegistry.markdownItPlugins,
  );

  assertNotUndefined(doc, 'Doc cannot be undefined');

  return doc;
}
