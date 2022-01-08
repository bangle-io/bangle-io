import { frontMatterMarkdownItPlugin } from '@bangle.dev/markdown-front-matter';

import { Extension } from '@bangle.io/extension-registry';

import { EditorCore } from './EditorCore';
import { MenuComp } from './FloatingMenu';
import { getPlugins } from './plugins';
import { rawSpecs } from './spec-sheet';

const extensionName = 'bangle-io-editor-core';

const extension = Extension.create({
  name: extensionName,
  editor: {
    specs: rawSpecs,
    plugins: [getPlugins],
    ReactComponent: MenuComp,
    markdownItPlugins: [frontMatterMarkdownItPlugin],
  },
  application: {
    ReactComponent: EditorCore,
    operations: [
      {
        name: 'action::bangle-io-editor-core:collapse-heading',
        title: 'Editor: Collapse heading',
      },
      {
        name: 'action::bangle-io-editor-core:uncollapse-all-heading',
        title: 'Editor: Uncollapse all headings',
      },
      {
        name: 'action::bangle-io-editor-core:move-list-up',
        title: 'Editor: Move list up',
      },
      {
        name: 'action::bangle-io-editor-core:move-list-down',
        title: 'Editor: Move list down',
      },
    ],
  },
});

export default extension;
